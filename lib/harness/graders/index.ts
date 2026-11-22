import { spawnSync } from "node:child_process";
import path from "node:path";
import type { Grader, Verdict } from "../types";
import { naiveGrader } from "./naive";
import { strictGrader } from "./strict";

const PYTHON = process.env.PYTHON ?? "python3";
const STARTER = "docs/ADZZAT-CANDIDATE-PACK-v1.2/starter";

/** Organiser reference grader, run unmodified through scripts/grade_reference.py. */
export const referenceGrader: Grader = {
  version: "fixture-1.1.0",
  sources: [`${STARTER}/reference_grader.py`, `${STARTER}/validate.py`, "scripts/grade_reference.py"],
  async grade(task, trajectory, { model, run_id, seed }) {
    const res = spawnSync(PYTHON, [path.join(process.cwd(), "scripts", "grade_reference.py")], {
      input: JSON.stringify({ task, trajectory, model, run_id, seed }), encoding: "utf8",
    });
    if (res.error) throw new Error(`cannot start ${PYTHON}: ${res.error.message}`);
    if (res.status !== 0) throw new Error(res.stderr.trim() || `reference grader exited ${res.status}`);
    return JSON.parse(res.stdout) as Verdict;
  },
};

export const GRADERS: Record<string, Grader> = { strict: strictGrader, reference: referenceGrader, naive: naiveGrader };
