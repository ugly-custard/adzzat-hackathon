// One-shot offline harness: load tasks -> run fixture agents -> import organiser fixtures -> grade -> validate.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FIXTURE_MODELS, fixtureAgent } from "../lib/harness/agents/fixtures";
import { GRADERS } from "../lib/harness/graders";
import { gradeRun } from "../lib/harness/replay";
import { HARNESS_VERSION, runTask } from "../lib/harness/runner";
import { RUNS_DIR, newRunId, saveRun, sha256 } from "../lib/harness/store";
import { loadTasks } from "../lib/harness/tasks";
import type { Step, Verdict } from "../lib/harness/types";

const STARTER = path.join("docs", "ADZZAT-CANDIDATE-PACK-v1.2", "starter");
const SEED = 0;

const { tasks, errors } = loadTasks();
for (const e of errors) console.error(`TASK LOAD FAIL ${e.file}: ${e.errors.join("; ")}`);
console.log(`loaded ${tasks.length} task(s), ${errors.length} rejected`);

const runIds: string[] = [];
for (const loaded of tasks) {
  for (const model of FIXTURE_MODELS) {
    const { trajectory, meta } = await runTask(loaded, fixtureAgent(model), { seed: SEED, timeoutMs: 2000 });
    const run_id = newRunId(model, loaded.task.id, SEED);
    saveRun(run_id, trajectory, meta);
    runIds.push(run_id);
  }
}

// Organiser sample trajectories: graded by both graders and compared with the verdict they ship with.
const byId = new Map(tasks.map((t) => [t.task.id, t]));
for (const [traj, verd] of [
  ["trajectory.sample.jsonl", "verdict.sample.json"],
  ["acted-then-escalated.trajectory.jsonl", "acted-then-escalated.verdict.json"],
  ["over-escalation.trajectory.jsonl", "over-escalation.verdict.json"],
  ["timeout.trajectory.jsonl", "timeout.verdict.json"],
]) {
  const run_id = `organiser__${traj.replace(/(\.trajectory)?\.jsonl$/, "")}`;
  if (existsSync(path.join(RUNS_DIR, run_id))) { runIds.push(run_id); continue; }
  const shipped: Verdict = JSON.parse(readFileSync(path.join(STARTER, "examples", verd), "utf8"));
  const loaded = byId.get(shipped.task_id);
  if (!loaded) { console.error(`skip ${traj}: task ${shipped.task_id} not loaded`); continue; }
  const trajectory: Step[] = readFileSync(path.join(STARTER, "examples", traj), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const now = new Date().toISOString();
  saveRun(run_id, trajectory, {
    task_id: loaded.task.id, task_file: loaded.file, task_sha256: loaded.sha256, model: shipped.model,
    agent_kind: "organiser_fixture", seed: shipped.seed, started_at: now, finished_at: now, step_budget: null,
    timeout_ms: null, termination: trajectory.at(-1)?.type === "terminal" && "termination_reason" in trajectory.at(-1)!
      ? (trajectory.at(-1) as { termination_reason: "timeout" }).termination_reason : "terminal",
    harness_version: HARNESS_VERSION, notes: `imported from starter/examples/${traj}; not produced by this harness`,
  });
  writeFileSync(path.join(RUNS_DIR, run_id, "organiser.verdict.json"), JSON.stringify(shipped, null, 2) + "\n");
  runIds.push(run_id);
}

// Naive first so its verdict is the "original" output that later, corrected graders are compared against.
const ORDER = ["naive", "reference", "strict"];
console.log("\nrun".padEnd(62) + ORDER.map((g) => GRADERS[g].version.padEnd(24)).join(""));
for (const id of runIds) {
  const cols: string[] = [];
  for (const g of ORDER) {
    try {
      cols.push((await gradeRun(id, g)).outcome.padEnd(24));
    } catch (err) {
      cols.push(`ERROR ${(err as Error).message}`.slice(0, 23).padEnd(24));
    }
  }
  console.log(id.padEnd(62) + cols.join(""));
}

// Authoritative structural check: the organiser's Python validator over everything we produced.
const files = [
  ...tasks.map((t) => t.file),
  ...runIds.flatMap((id) => {
    const dir = path.join(RUNS_DIR, id);
    return [path.join(dir, "trajectory.jsonl"), ...Object.values(GRADERS).map((g) => path.join(dir, "verdicts", `${g.version}.json`))]
      .filter((f) => existsSync(f));
  }),
];
const val = spawnSync(process.env.PYTHON ?? "python3", [path.join(STARTER, "validate.py"), "--strict-pairs", ...files], { encoding: "utf8" });
const report = `# validate.py --strict-pairs over ${files.length} files (sha256 of list ${sha256(files.join("\n")).slice(0, 12)})\n${val.stdout}${val.stderr}`;
writeFileSync(path.join(RUNS_DIR, "VALIDATION.txt"), report);
console.log(`\n${val.stdout.trim().split("\n").at(-1)} -> runs/VALIDATION.txt`);
process.exit(val.status === 0 ? 0 : 1);
