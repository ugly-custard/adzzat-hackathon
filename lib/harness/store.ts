import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RunMeta, Step, Verdict } from "./types";
import type { RunRecord } from "./runner";

export const RUNS_DIR = process.env.RUNS_DIR ?? path.join(process.cwd(), "runs");

export const toJsonl = (steps: Step[]) => steps.map((s) => JSON.stringify(s)).join("\n") + "\n";
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function newRunId(model: string, taskId: string, seed: number | null, at = new Date()): string {
  const stamp = at.toISOString().replace(/[-:]/g, "").replace(".", "");
  return `${model.replace(/[^\w.-]+/g, "-")}__${taskId}__s${seed ?? "none"}__${stamp}`;
}

/** Trajectory is written once; its hash in meta lets regrading detect later edits. */
export function saveRun(run_id: string, trajectory: Step[], record: RunRecord, raw?: unknown[]): RunMeta {
  const dir = path.join(RUNS_DIR, run_id);
  if (existsSync(path.join(dir, "trajectory.jsonl"))) throw new Error(`run ${run_id} already exists; trajectories are immutable`);
  mkdirSync(path.join(dir, "verdicts"), { recursive: true });
  const text = toJsonl(trajectory);
  const meta: RunMeta = { run_id, ...record, trajectory_sha256: sha256(text) };
  writeFileSync(path.join(dir, "trajectory.jsonl"), text);
  writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  if (raw?.length) writeFileSync(path.join(dir, "raw.jsonl"), raw.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return meta;
}

export function saveVerdict(run_id: string, verdict: Verdict): string {
  const file = path.join(RUNS_DIR, run_id, "verdicts", `${verdict.grader_version}.json`);
  writeFileSync(file, JSON.stringify(verdict, null, 2) + "\n");
  return file;
}

export interface StoredRun {
  meta: RunMeta;
  trajectory: Step[];
  verdicts: Verdict[];
  /** False when trajectory.jsonl no longer matches the hash recorded at run time. */
  intact: boolean;
  raw: unknown[] | null;
  organiserVerdict: Verdict | null;
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));

export function readRun(run_id: string): StoredRun {
  const dir = path.join(RUNS_DIR, run_id);
  const meta = readJson<RunMeta>(path.join(dir, "meta.json"));
  const text = readFileSync(path.join(dir, "trajectory.jsonl"), "utf8");
  const trajectory = text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Step);
  const vdir = path.join(dir, "verdicts");
  const verdicts = existsSync(vdir)
    ? readdirSync(vdir).filter((f) => f.endsWith(".json")).sort().map((f) => readJson<Verdict>(path.join(vdir, f)))
    : [];
  const rawFile = path.join(dir, "raw.jsonl");
  const raw = existsSync(rawFile)
    ? readFileSync(rawFile, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
    : null;
  const orgFile = path.join(dir, "organiser.verdict.json");
  const organiserVerdict = existsSync(orgFile) ? readJson<Verdict>(orgFile) : null;
  return { meta, trajectory, verdicts, intact: sha256(text) === meta.trajectory_sha256, raw, organiserVerdict };
}

export function listRuns(): StoredRun[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(RUNS_DIR, d.name, "meta.json")))
    .map((d) => readRun(d.name))
    .sort((a, b) => b.meta.started_at.localeCompare(a.meta.started_at));
}
