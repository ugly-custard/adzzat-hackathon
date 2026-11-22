import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Runs before any module reads RUNS_DIR, so tests never write into the committed runs/ evidence.
process.env.RUNS_DIR = mkdtempSync(path.join(tmpdir(), "runs-"));
