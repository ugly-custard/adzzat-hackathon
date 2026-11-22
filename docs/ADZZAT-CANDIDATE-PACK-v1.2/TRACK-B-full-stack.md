# Adzzat Round 2 Hiring Hackathon
## Track B - Founding Full-Stack Engineer
Sunday, 22 November 2026 | 10:00-15:00 IST | Track B brief v1.2

## Core deliverable: an evaluation harness with a results UI
Build the system that loads evaluation tasks, runs an agent through controlled mock tools, captures its actions, detects violations, grades the run and exposes the evidence in a results UI. The harness is the core deliverable; the UI is its inspection surface. Demonstrate a complete working path backed by saved evidence.

This clarification matches slides 7 and 9 of the revised presentation and replaces the earlier Track B brief. Read SHARED-CONTRACT.md v1.1 first. The 60 role-specific / 40 shared scoring split and deadlines remain the same.

## Minimum submission, in priority order
### 1. Evaluation harness execution and offline demo
Load the supplied YAML pair from disk, validate it and report clear errors. Run a scripted fixture agent through allowed mock tools driven by task context. Check permissions and tripwires before mock execution, record blocked attempts and preserve every failure. External effects are forbidden. Enforce a step budget and timeout, and emit a terminal NONE record for incomplete runs. Keep grading/answer metadata out of agent observations.

Provide one documented command that runs the complete harness and starts the results UI without an API key. It must work offline after dependencies are installed. Save the task/run identity, full trace, verdict and relevant model/seed metadata. Remove credentials from raw requests/responses. Recording a seed does not make an API model deterministic.

### 2. Pluggable grading and saved-trace replay
Use grade(task, trajectory, *, model, run_id, seed) from the shared contract. Ship a deterministic grader or an attributed adaptation of the reference implementation. Demonstrate swapping the grader and re-grading the same saved trace without another agent/model call. Preserve the original trace and identify grader versions. A matching final label must never erase an earlier unauthorised attempt. An LLM judge is optional.

### 3. Results UI and evidence inspection
Show a run list and a category x domain or category x stakes matrix per model with counts and distinct outcomes. Label fixture-agent runs honestly; do not imply they are live-model results. Empty cells stay empty or say unrun. Show over-escalation and unauthorised action separately. Let a reviewer select a cell, open its task and inspect the full trace alongside verdict and notes. Mark blocked attempts clearly. Plain server-rendered HTML is sufficient.

### 4. Operational evidence and contract integration
README.md explains clean setup, dependencies, the one-command harness demo, replay and known limits. Include meaningful tests for tripwire detection, malformed tasks, unfinished runs and an unauthorised attempt followed by a correct escalation. Use the independent organiser fixtures and validate submitted task, trajectory and verdict files. Your assessment does not depend on another candidate finishing.

## AI tools and access
Bring your own AI tools or subscriptions. Adzzat provides no API keys, credits or AI subscriptions. Any provider or tool is allowed under the shared rules. A deterministic fixture-agent harness meets the minimum; live-model integration, a manual model run or an LLM judge is optional. No paid tier or API purchase is required. API access and model price earn no points. Keep credentials private and out of files/logs. If your tool fails, record the incident and demonstrate offline execution or replay.

## Stretch work
After the minimum, you may add model comparison, matrix export, authoring, rate-limit-safe concurrency or another grader. Feature count, framework size and visual polish unrelated to evidence inspection earn no automatic bonus.

## Role-specific score: 60 points
| Dimension | Points | Evidence |
|---|---:|---|
| Evaluation harness execution | 20 | Reproducible offline task-to-run-to-trace-to-verdict flow |
| Grading architecture and replay | 12 | Replaceable grader; saved-trace re-grading without rerunning the agent |
| Results UI and evidence inspection | 10 | Counts, distinct outcomes and task/trace/verdict drill-down |
| Trace and violation correctness | 10 | Permission checks, blocked attempts, full logs and timeout/NONE |
| Engineering hygiene | 5 | Focused harness tests, setup, diagnostics and secret handling |
| Shared-contract integration | 3 | Organiser fixtures, published grader interface and valid outputs |

Evaluation harness execution and trace and violation correctness are essential competencies. Show the execution and saved evidence behind the screens. Shared assessment adds 40 points: calibration 10, constraint response 10, explanation/live change 10, and decisions/verification 10. The explanation/live-change check is also essential. Judges use evidence-based 0-4 ratings; calibration is scored directly. A fully offline submission can earn the full available score.

## Explanation/live-change prompt
Trace a task through the harness: loading, tool dispatch, tripwire detection, trace persistence, grading and results UI. Predict what changes if the grader is replaced. On a disposable copy, change one outcome rule or show the precise test you would run. Explain a failure path the harness still handles poorly. Repository and notes may remain open; no outside assistance during this check.

## Submission and showcase
Submit CALIBRATION.md by 11:30 IST. Include it with README.md, harness code, saved traces/verdicts, tests, CHANGE-RESPONSE.md and one-page DECISIONS.md in the frozen snapshot due 15:00. README.md must include dependency versions, run commands, metadata and known limitations. Record incomplete work and missing evidence honestly. Keep credentials out of the package. Use the shared submission naming and channel announced by the host.

Lunch: 12:30-13:00. Constraint change: 13:30. Showcases start 15:15 in assigned slots: demo 7 minutes, questions 4, ownership check 4, private panel scoring 5. Use a separate copy for live edits. Follow-up interviews examine production ownership; the hackathon supports shortlisting and does not guarantee an offer.
