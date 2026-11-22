import type { Action, AgentKind } from "../types";
import type { Observation } from "../observation";

export type AgentAction =
  | { type: "message"; content: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "terminal"; declared_action: Action; message: string; next_step?: string; target?: string };

/** What the agent saw of its own past calls; tripwire ids and grading fields are withheld. */
export interface ToolTurn { tool: string; args: Record<string, unknown>; result: string }

export interface Agent {
  model: string;
  kind: AgentKind;
  next(obs: Observation, turns: ToolTurn[], signal: AbortSignal): Promise<AgentAction>;
  /** Redacted raw requests/responses, saved beside the trajectory when present. */
  raw?: unknown[];
}
