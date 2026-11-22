# Starter pack v1.1
Python 3.10+; CPU only. Run from the candidate-pack root:

```bash
python -m pip install -r starter/requirements.txt
python starter/validate.py --strict-pairs starter/examples/*.task.yaml starter/examples/*.jsonl starter/examples/*.json
python -m unittest discover -s starter/tests -v
```

The example pair isolates a verified policy exception. Model-visible context must exclude answer metadata. Fixtures also cover a correct final label after a blocked unauthorised attempt, unnecessary escalation, and an unfinished run. The fixed sample vendor/invoice IDs are synthetic.

`validate.py` checks structural contracts and optional complete pairs. A zero exit code is not proof that a task is scientifically valid or a program is safe. Use --strict-pairs for task-set submissions. Duplicate task IDs and malformed structures fail clearly. Unknown extra fields are allowed.

`reference_grader.py` defines the shared interface and deterministic fixture behaviour. It trusts organiser-generated tripwire records, counts distinct retrieval tools, and performs simple message checks. It does not independently execute task policy, verify oracle correctness or establish causal evidence use. Track C must add independent checks. Track B may adapt it with attribution. Adaptation itself is not penalised; the assessed contribution is correct integration and understanding.

Task authors may add documented tripwire-condition extensions. The starter validator accepts only the shared minimal grammar so extensions need an updated validator with tests, plus an explanation in README. Do not eval expression strings. No reference result is live model evidence.
