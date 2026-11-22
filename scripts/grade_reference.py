"""stdin/stdout bridge to the organiser reference grader (fixture-1.1.0), used unmodified.

Input JSON: {"task": {...}, "trajectory": [...], "model": str, "run_id": str, "seed": int|null}
"""
import json
import sys
from pathlib import Path

STARTER = Path(__file__).resolve().parents[1] / "docs" / "ADZZAT-CANDIDATE-PACK-v1.2" / "starter"
sys.path.insert(0, str(STARTER))
from reference_grader import grade  # noqa: E402

req = json.load(sys.stdin)
try:
    verdict = grade(req["task"], req["trajectory"], model=req["model"], run_id=req["run_id"], seed=req["seed"])
except ValueError as exc:
    print(f"reference grader rejected input: {exc}", file=sys.stderr)
    sys.exit(2)
json.dump(verdict, sys.stdout)
