# Adzzat Round 2 Hiring Hackathon
## Track A - Head of Research
Sunday, 22 November 2026 | 10:00-15:00 IST | Candidate brief v1.1

Read SHARED-CONTRACT.md first. Design a defensible evaluation of agent authority and escalation, then test what your evidence supports. Prioritise research judgement. You do not need to force a model failure or claim novelty without a literature review.

## Minimum submission, in priority order
### 1. METHODOLOGY.md
Define the construct, label boundaries and exact unit of decision. Explain how two annotators would label a case, resolve disagreement and handle genuinely contested cases. Propose an agreement statistic and explain its limits on a small or imbalanced set. Defend or challenge the supplied taxonomy while preserving the interchange labels. Explain a cheap shortcut and how you would test it, contamination controls, and the limitations of a small benchmark. Cite up to three verified adjacent efforts if available. Mark unverified recollections explicitly. A documented search plan is acceptable when you cannot verify a source.

### 2. Six complete twin pairs: 12 tasks in tasks/
Cover at least three of the six categories, two domains and two stakes tiers. Each pair contains an ACT case and a non-ACT case; HANDOFF is allowed. Keep surface details constant wherever possible and identify every changed fact. Explain remaining confounds. Use synthetic entities, defensible rationales and tripwires that agree with the authorised behaviour. Include both authorised and unauthorised cases. Validate with --strict-pairs. List missing category/tier coverage and the next pairs you would add. More tasks alone earn no extra credit.

### 3. One model through your own tools, plus simple baselines
Run one model available through your own subscription/tool on the 12 tasks, and evaluate always-ACT and always-ESCALATE_HUMAN on the same cases. Save inputs, outputs, model ID and settings. A chat interface with saved exact prompts/responses or a disclosed single-turn decision-and-justification variant is acceptable; API access is optional. Label manual runs and their limits; explain what it cannot measure about tool use or actual action. Never include answer metadata in prompts. If your tool is unavailable or rate-limited, save the attempted prompt/error and provide a reproducible fixture/replay path clearly labelled as such. Do not present fixture output as live-model evidence.

### 4. RESULTS.md
For each model/baseline, report category x domain counts and a stakes-tier breakdown. Separate unnecessary escalation, unauthorised action and other errors. Include complete-pair consistency and sample sizes. For a single-turn design, distinguish an unsafe ACT prediction from an observed tool violation. Include up to two informative specimens, whether successful or failing, with trace references. State threats to validity, what remains untested and what the next experiment should resolve. Do not claim statistical significance from this sample.

## Stretch work
Only after the minimum: add a second model, extend to 12 pairs covering all six categories and all three stakes tiers, or write a one-page scale/annotation plan. Stretch work earns credit within the same rubric, with no separate completion bonus.

## Role-specific score: 60 points
| Dimension | Points | Evidence |
|---|---:|---|
| Construct validity | 18 | Clear decision unit, defensible boundaries, confounds identified |
| Task and label quality | 14 | Coherent twin pairs, rationales, coverage and disputed-case treatment |
| Shortcut and contamination analysis | 10 | Concrete shortcut tests and realistic contamination controls |
| Reporting and interpretation | 10 | Honest disaggregated results, denominators, limitations |
| Reproducible execution | 5 | Traceable inputs, model settings and reproducible reporting |
| Contract integration | 3 | Organiser fixtures and strict pair validation |

Construct validity and task/label quality are essential competencies. Missing evidence triggers a documented follow-up or a decision not to progress; it is not hidden by a high total. There is no 6/12 or calibration-only rejection rule.

## Explanation/live-change prompt
Choose your weakest pair. Explain the decision boundary and any confound. Predict the labels after a judge changes one authority fact, then edit the rationale or walk through a discriminating test. The judge uses a comparable variation for every Track A candidate.

## Follow-up interview
The hackathon does not establish research leadership on its own. A later interview covers research strategy, prioritisation, mentoring and how you would validate this evaluation beyond a small pilot.

## Shared deliverables and assessment
Submit CALIBRATION.md by 11:30, then CHANGE-RESPONSE.md and DECISIONS.md with your final snapshot by 15:00. See SHARED-CONTRACT.md for the exact formats and the shared 40 points: calibration 10, constraint response 10, explanation/live change 10, decisions and verification 10.

Use the public reference fixtures for integration. Your score does not depend on another candidate finishing. AI tools and research are allowed under the shared rules. Real results, negative results and incomplete work must be labelled honestly. The assessment informs a shortlist rather than guaranteeing a job offer.

## Submission and showcase
Include README.md with setup, one demo command, dependency versions, run metadata and known limitations. Keep keys out of files and logs. Validate the task pairs, trajectories and verdicts you submit. Frozen snapshot due 15:00 IST. Showcase slots start 15:15: 7 minutes demo, 4 minutes questions, 4 minutes explanation/live change, followed by 5 minutes of private scoring. You may use your repository and notes in the ownership check.
