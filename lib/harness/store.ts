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

/** Fields that describe when/how a verdict was produced rather than what it says. */
const PROVENANCE = new Set(["graded_at", "grader_sha256"]);
const body = (v: Verdict) => JSON.stringify(Object.entries(v).filter(([k]) => !PROVENANCE.has(k)).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Verdict files are write-once. Re-grading with the same grader_version is a no-op when the output
 * is identical and an error when it differs, so a corrected grader can never overwrite the old output:
 * it must carry a new version and lands beside it.
 */
export function saveVerdict(run_id: string, verdict: Verdict): { file: string; verdict: Verdict; written: boolean } {
  const file = path.join(RUNS_DIR, run_id, "verdicts", `${verdict.grader_version}.json`);
  if (existsSync(file)) {
    const prev = readJson<Verdict>(file);
    if (body(prev) !== body(verdict))
      throw new Error(`grader ${verdict.grader_version} now gives a different verdict for ${run_id} (was ${prev.outcome}, now ${verdict.outcome}); `
        + "the stored verdict is kept; bump grader_version to record the corrected output beside it");
    return { file, verdict: prev, written: false };
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(verdict, null, 2) + "\n", { flag: "wx" });
  return { file, verdict, written: true };
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
  // Oldest first, so "original vs corrected" reads left to right.
  const verdicts = existsSync(vdir)
    ? readdirSync(vdir).filter((f) => f.endsWith(".json")).map((f) => readJson<Verdict>(path.join(vdir, f)))
      .sort((a, b) => (a.graded_at ?? "").localeCompare(b.graded_at ?? ""))
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
