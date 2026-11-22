# Adzzat Round 2 Hiring Hackathon
## Track C - RL Environment Engineer
Sunday, 22 November 2026 | 10:00-15:00 IST | Candidate brief v1.1

Read SHARED-CONTRACT.md first. Build a small reproducible environment and test how its reward could be exploited. Demonstrate what works, what fails and what remains open. You are not required to prove that any reward is impossible to game.

## Minimum submission, in priority order
### 1. Seeded environment in env/
Use CPU-only synthetic invoice approval with a documented reset/step interface. Gym-style or an equivalent clean API is acceptable. Support tools and the five terminal decisions. Separate hidden task/answer state from observations: reveal context through tools, never reveal correct_action, pair metadata or reward rules. Grant information and the task brief are visible. Include at least two independently variable factors: amount/cap and verifiable versus claimed authority. A supplied seed reproduces the same instance. State separate policy/randomness seeds.

Expose an oracle that follows a verifiable solution path and uses the same observation/tool interface for its reported baseline. A hidden-state solver may validate instances separately, but label it as such. Emit contract-valid trajectories. Mock tools may update isolated synthetic in-memory state when needed, but must never affect external systems. Log blocked unauthorised attempts. Define step limits and NONE termination.

### 2. Independent evaluation in grader/
Implement the shared grader interface and a small CLI wrapper runnable in a separate process. Keep evaluator code and training reward separate. A process boundary alone does not establish independence: explain shared assumptions and use held-out checks that do not simply mirror reward logic. Use deterministic rules for pass/fail. An optional LLM quality score cannot determine pass/fail on its own.

Check more than the terminal label: attempted unauthorised actions, target and message requirements, and relevant evidence. Recompute tripwire evidence from trusted task rules and raw tool calls rather than trusting agent-written success claims. Count distinct relevant observations, not repeated searches. Preserve a tripwire failure even when the final label is correct.

### 3. REWARD.md
Write the numeric training reward and explain penalties for unnecessary escalation and unauthorised action. Defend the relative cost. Discuss dense/sparse rewards and repeated-tool shaping exploits. Name at least three concrete ways a policy could game the reward, show an attempted exploit test, and label remaining weaknesses. Document the separate evaluation reward in verdicts.

### 4. BASELINES.md
Run random, always-ACT, always-ESCALATE_HUMAN and the observation-based oracle on the same 20 seeded instances. Include both ACT and non-ACT cases, disclose class balance and report seed lists, reward, decision accuracy and unauthorised-action rates. Optionally run a model available through your own tool on a declared subset of at least five of those seeds. A manual chat loop is acceptable if you record each observation, proposed action and returned tool result. This optional model baseline does not add a separate score or require API access. Compare all policies on that same subset when reporting LLM gaps. Preserve traces and actual denominators. If your chosen tool fails or you cannot automate it, record the limitation and use the mandatory scripted baselines. Do not present fixtures as model results.

An LLM may be worse than a trivial policy or match the oracle. Report what happened and what it implies; neither result is automatically a failure. If an always-escalating policy scores near the oracle, diagnose the distribution/reward and describe a repair. Do not invent a positive gap.

## Stretch work
After the minimum: extend baselines to 50 seeds, add a compounding-authority variant, injected tool instructions, a difficulty curriculum, a second domain or a short training run. No training run is required. Pick one extension rather than spreading effort across all of them.

## Role-specific score: 60 points
| Dimension | Points | Evidence |
|---|---:|---|
| Reward integrity and exploit analysis | 18 | Numerical reward, concrete attacks, honest limitations |
| Environment and oracle | 14 | Seeded generation, discoverable evidence and valid oracle path |
| Baselines and interpretation | 12 | Matched seeds, class balance, honest gaps and reproducibility |
| Independent grader | 10 | Separate evaluation, raw-call checks, evidence and target checks |
| Code and contract integration | 6 | One-command demo, process wrapper and valid files |

Reward integrity and environment/oracle quality are essential competencies. Shared 40 points are additional. An identified unresolved exploit can be valuable evidence of judgement; hiding it is not.

## Explanation/live-change prompt
Open your reward function and explain its terms. Predict what happens if evidence-gathering can be repeated without limit. Then demonstrate an exploit attempt or walk through a test that detects it. Explain which evaluator check would still catch a high-reward bad policy.

## Follow-up interview
Later assessment covers learning dynamics, training failures, curriculum choices and scaling. Compensation is discussed through recruiting; the exercise makes no unlimited-budget promise.

## Shared deliverables and assessment
Submit CALIBRATION.md by 11:30, then CHANGE-RESPONSE.md and DECISIONS.md with your final snapshot by 15:00. See SHARED-CONTRACT.md for the exact formats and the shared 40 points: calibration 10, constraint response 10, explanation/live change 10, decisions and verification 10.

Use the public reference fixtures for integration. Your score does not depend on another candidate finishing. AI tools and research are allowed under the shared rules. Real results, negative results and incomplete work must be labelled honestly. The assessment informs a shortlist rather than guaranteeing a job offer.

## Submission and showcase
Include README.md with setup, one demo command, dependency versions, run metadata and known limitations. Keep keys out of files and logs. Validate the task pairs, trajectories and verdicts you submit. Frozen snapshot due 15:00 IST. Showcase slots start 15:15: 7 minutes demo, 4 minutes questions, 4 minutes explanation/live change, followed by 5 minutes of private scoring. You may use your repository and notes in the ownership check.
