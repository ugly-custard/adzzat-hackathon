import { ACTIONS, type RunMeta, type Step, type TerminationReason } from "./types";
import type { Agent, AgentAction, ToolTurn } from "./agents/types";
import type { LoadedTask } from "./tasks";
import { buildObservation } from "./observation";
import { MockEnv } from "./tools";

export const HARNESS_VERSION = "harness-1.0.0";

export interface RunOptions { seed?: number | null; stepBudget?: number; timeoutMs?: number }
export type RunRecord = Omit<RunMeta, "run_id" | "trajectory_sha256">;

class Timeout extends Error {}

/** Runs one agent on one task. Never throws: every failure becomes a NONE terminal so no run is dropped. */
export async function runTask(
  { task, file, sha256 }: LoadedTask, agent: Agent, { seed = 0, stepBudget = 12, timeoutMs = 3000 }: RunOptions = {},
): Promise<{ trajectory: Step[]; meta: RunRecord }> {
  const started_at = new Date().toISOString();
  const trajectory: Step[] = [];
  const add = (s: Record<string, unknown>) => trajectory.push({ step: trajectory.length, ts: new Date().toISOString(), ...s } as Step);
  const env = new MockEnv(task);
  const obs = buildObservation(task);
  const turns: ToolTurn[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Timeout(`run exceeded ${timeoutMs} ms`)), timeoutMs);
  let termination: RunMeta["termination"] = "terminal";

  const stop = (reason: TerminationReason, message: string) => {
    termination = reason;
    add({ type: "terminal", declared_action: "NONE", message, termination_reason: reason });
  };

  try {
    for (let n = 0; ; n++) {
      if (n >= stepBudget) { stop("step_budget", `Step budget of ${stepBudget} agent actions exhausted.`); break; }
      let action: AgentAction;
      try {
        action = await abortable(agent.next(obs, turns, controller.signal), controller.signal);
      } catch (err) {
        if (err instanceof Timeout) stop("timeout", `Timed out: ${err.message}.`);
        else stop("model_error", `Agent error: ${(err as Error)?.message ?? String(err)}`);
        break;
      }
      if (action.type === "message") add({ type: "model_message", content: action.content });
      else if (action.type === "tool_call") {
        add({ type: "tool_call", tool: action.tool, args: action.args });
        const out = env.call(action.tool, action.args);
        add({
          type: "tool_result", tool: action.tool, result: out.result, blocked: out.blocked,
          tripwire_hit: out.hits[0] ?? null, ...(out.hits.length > 1 && { tripwires_hit: out.hits }),
        });
        turns.push({ tool: action.tool, args: action.args, result: out.result });
      } else {
        if (!ACTIONS.includes(action.declared_action)) {
          stop("model_error", `Agent declared an invalid action: ${JSON.stringify(action.declared_action)}`);
          break;
        }
        const { declared_action, message, next_step, target } = action;
        add({ type: "terminal", declared_action, message, ...(next_step && { next_step }), ...(target && { target }) });
        break;
      }
    }
  } catch (err) {
    stop("aborted", `Harness error: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  return {
    trajectory,
    meta: {
      task_id: task.id, task_file: file, task_sha256: sha256, model: agent.model, agent_kind: agent.kind, seed,
      started_at, finished_at: new Date().toISOString(), step_budget: stepBudget, timeout_ms: timeoutMs,
      termination, harness_version: HARNESS_VERSION,
    },
  };
}

/** Rejects with the abort reason even if the agent ignores the signal. */
function abortable<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  const onAbort = () => reject(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  p.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  return promise;
}
