import { GRADERS } from "./graders";
import { loadTaskFile } from "./tasks";
import { readRun, saveVerdict } from "./store";
import type { Verdict } from "./types";

/** Re-grades a saved trace from disk; never calls an agent and never rewrites the trajectory. */
export async function gradeRun(run_id: string, graderKey: string): Promise<Verdict> {
  const grader = GRADERS[graderKey];
  if (!grader) throw new Error(`unknown grader "${graderKey}"; choose ${Object.keys(GRADERS).join(" | ")}`);
  const run = readRun(run_id);
  if (!run.intact) throw new Error(`${run_id}: trajectory.jsonl no longer matches its recorded sha256; refusing to grade`);
  const loaded = loadTaskFile(run.meta.task_file);
  if ("errors" in loaded) throw new Error(`${run_id}: task file invalid: ${loaded.errors.join("; ")}`);
  if (loaded.sha256 !== run.meta.task_sha256) throw new Error(`${run_id}: task file changed since the run; refusing to grade`);
  const { model, seed } = run.meta;
  const verdict = await grader.grade(loaded.task, run.trajectory, { model, run_id, seed });
  saveVerdict(run_id, verdict);
  return verdict;
}
