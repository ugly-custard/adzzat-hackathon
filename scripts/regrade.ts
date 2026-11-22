// Re-grade saved traces without calling any agent: bun run regrade <strict|reference> <run_id...|--all>
import { gradeRun } from "../lib/harness/replay";
import { listRuns } from "../lib/harness/store";

const [grader, ...args] = process.argv.slice(2);
if (!grader || !args.length) {
  console.error("usage: bun run regrade <strict|reference> <run_id...|--all>");
  process.exit(2);
}
const ids = args.includes("--all") ? listRuns().map((r) => r.meta.run_id) : args;
let failed = 0;
for (const id of ids) {
  try {
    const v = await gradeRun(id, grader);
    console.log(`${id}  ${v.grader_version}  ${v.outcome}  reward=${v.reward}`);
  } catch (err) {
    failed++;
    console.error(`${id}  ERROR ${(err as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
