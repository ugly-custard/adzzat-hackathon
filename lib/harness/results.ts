import { CATEGORIES, DOMAINS, type AgentKind, type Task, type Verdict } from "./types";
import type { StoredRun } from "./store";

export type TaskInfo = Pick<Task, "id" | "category" | "domain" | "stakes_tier" | "pair_id" | "pair_role" | "correct_action">;

export const verdictFor = (run: StoredRun, graderVersion: string): Verdict | undefined =>
  run.verdicts.filter((v) => v.grader_version === graderVersion).at(-1);

/** Field-by-field comparison of two verdicts for the same run (e.g. original vs corrected grader). */
export function diffVerdicts(a: Verdict, b: Verdict) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.map((field) => {
    const av = JSON.stringify(a[field]), bv = JSON.stringify(b[field]);
    return { field, a: av, b: bv, changed: av !== bv };
  });
}

/** Matrix counts only the newest run per (model, task, seed); older reruns stay visible in the run list. */
export function latestRuns(runs: StoredRun[]): StoredRun[] {
  const seen = new Set<string>();
  return [...runs]
    .sort((a, b) => b.meta.started_at.localeCompare(a.meta.started_at))
    .filter((r) => {
      // Organiser samples are distinct traces that can share model/task/seed, not reruns of each other.
      const key = r.meta.agent_kind === "organiser_fixture" ? r.meta.run_id : `${r.meta.model}|${r.meta.task_id}|${r.meta.seed}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export interface Cell { runs: StoredRun[]; outcomes: Record<string, number>; ungraded: number }

function cellOf(runs: StoredRun[], version: string): Cell {
  const outcomes: Record<string, number> = {};
  let ungraded = 0;
  for (const r of runs) {
    const v = verdictFor(r, version);
    if (v) outcomes[v.outcome] = (outcomes[v.outcome] ?? 0) + 1;
    else ungraded++;
  }
  return { runs, outcomes, ungraded };
}

export function categoryDomainMatrix(runs: StoredRun[], tasks: Map<string, TaskInfo>, version: string) {
  return CATEGORIES.map((category) => ({
    category,
    cells: DOMAINS.map((domain) => ({
      domain,
      ...cellOf(runs.filter((r) => tasks.get(r.meta.task_id)?.category === category && tasks.get(r.meta.task_id)?.domain === domain), version),
    })),
  }));
}

export function stakesBreakdown(runs: StoredRun[], tasks: Map<string, TaskInfo>, version: string) {
  return ([1, 2, 3] as const).map((tier) => ({ tier, ...cellOf(runs.filter((r) => tasks.get(r.meta.task_id)?.stakes_tier === tier), version) }));
}

export function modelSummary(runs: StoredRun[], version: string) {
  const models = [...new Set(runs.map((r) => r.meta.model))].sort();
  return models.map((model) => {
    const mine = runs.filter((r) => r.meta.model === model);
    return { model, kind: mine[0].meta.agent_kind as AgentKind, ...cellOf(mine, version) };
  });
}

/** Contract: fraction of complete pairs with both labels correct and no tripwire hit in either run. */
export function pairConsistency(runs: StoredRun[], tasks: Map<string, TaskInfo>, version: string) {
  const pairs = new Map<string, string[]>();
  for (const t of tasks.values()) pairs.set(t.pair_id, [...(pairs.get(t.pair_id) ?? []), t.id]);
  // Organiser samples share a placeholder model id across unrelated traces, so they cannot form a pair.
  const models = [...new Set(runs.filter((r) => r.meta.agent_kind !== "organiser_fixture").map((r) => r.meta.model))].sort();
  return models.map((model) => {
    let complete = 0, consistent = 0;
    for (const ids of pairs.values()) {
      if (ids.length !== 2) continue;
      const verdicts = ids.map((id) => {
        const run = runs.find((r) => r.meta.model === model && r.meta.task_id === id);
        return run && verdictFor(run, version);
      });
      if (verdicts.some((v) => !v)) continue;
      complete++;
      if (verdicts.every((v) => v!.action_match && v!.tripwires_hit.length === 0)) consistent++;
    }
    return { model, complete, consistent, total: [...pairs.values()].filter((p) => p.length === 2).length };
  });
}
