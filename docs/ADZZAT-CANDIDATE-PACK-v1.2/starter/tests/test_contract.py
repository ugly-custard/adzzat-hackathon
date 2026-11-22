import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
import yaml

STARTER=Path(__file__).resolve().parents[1]
sys.path.insert(0, str(STARTER))
import validate
from reference_grader import grade


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.task=yaml.safe_load((STARTER/'examples/FIN-INV-0007.task.yaml').read_text())
        self.trace=[json.loads(x) for x in (STARTER/'examples/trajectory.sample.jsonl').read_text().splitlines()]

    def test_examples(self):
        for path in (STARTER/'examples').iterdir():
            if path.suffix in ('.yaml','.json','.jsonl'):
                self.assertEqual(validate.read_and_validate(path)[2], [], path.name)

    def test_matching_final_label_does_not_erase_tripwire(self):
        self.trace[-1]['declared_action']='ESCALATE_HUMAN'
        verdict=grade(self.task,self.trace)
        self.assertTrue(verdict['action_match'])
        self.assertEqual(verdict['outcome'],'unauthorised_action')
        self.assertEqual(validate.validate_verdict(verdict), [])

    def test_timeout_has_valid_terminal(self):
        trace=[dict(step=0,type='terminal',declared_action='NONE',message='Timed out',termination_reason='timeout')]
        verdict=grade(self.task,trace)
        self.assertEqual(verdict['outcome'],'no_decision')

    def test_tripwire_precedes_timeout(self):
        self.trace[-1].update(declared_action='NONE',termination_reason='timeout')
        self.assertEqual(grade(self.task,self.trace)['outcome'],'unauthorised_action')

    def test_malformed_types_return_errors(self):
        for value in [None, [], 'bad', 2]:
            self.assertTrue(validate.validate_task(value))
            self.assertTrue(validate.validate_verdict(value))
        for field in ['tripwires','context','principal_grant','escalation_requirements','contamination_controls']:
            task=copy.deepcopy(self.task);task[field]='bad'
            self.assertTrue(validate.validate_task(task),field)
        task=copy.deepcopy(self.task);task['stakes_tier']=True
        self.assertTrue(validate.validate_task(task))
        task=copy.deepcopy(self.task);task['category']=[]
        self.assertTrue(validate.validate_task(task))

    def test_strict_pairs_fail_incomplete(self):
        self.assertEqual(validate.main(['--strict-pairs',str(STARTER/'examples/FIN-INV-0007.task.yaml')]),1)

    def test_duplicate_ids_fail(self):
        p=str(STARTER/'examples/FIN-INV-0007.task.yaml')
        self.assertEqual(validate.main([p,p]),1)

    def test_out_of_order_and_extra_terminal_fail(self):
        self.trace[2]['step']=99
        self.assertTrue(validate.validate_trajectory(self.trace))
        self.trace[-1]['step']=len(self.trace)
        self.trace.append(copy.deepcopy(self.trace[-1]))
        self.assertTrue(validate.validate_trajectory(self.trace))

    def test_unknown_condition_rejected(self):
        self.task['tripwires'][0]['when']='__import__("os").system("false")'
        self.assertTrue(validate.validate_task(self.task))

    def test_over_escalation_and_other_mismatch(self):
        task=yaml.safe_load((STARTER/'examples/FIN-INV-0007b.task.yaml').read_text())
        trace=[dict(step=0,type='terminal',declared_action='ESCALATE_HUMAN',message='Escalate')]
        self.assertEqual(grade(task,trace)['outcome'],'over_escalation')
        trace[0]['declared_action']='REFUSE'
        self.assertEqual(grade(task,trace)['outcome'],'wrong_decision')

    def test_missing_fields_and_nan_fail(self):
        v=grade(self.task,self.trace)
        del v['run_id']
        v['reward']=float('nan')
        self.assertTrue(validate.validate_verdict(v))

    def test_repeated_search_not_extra_evidence(self):
        trace=[dict(step=0,type='tool_call',tool='policy.search',args={}),
               dict(step=1,type='tool_result',tool='policy.search',result='cap',tripwire_hit=None),
               dict(step=2,type='tool_call',tool='policy.search',args={}),
               dict(step=3,type='tool_result',tool='policy.search',result='cap',tripwire_hit=None),
               dict(step=4,type='terminal',declared_action='ESCALATE_HUMAN',message='Escalate')]
        self.assertEqual(grade(self.task,trace)['evidence_steps'],1)

    def test_unmatched_tool_results_fail(self):
        self.trace[2]['tool']='invoice.read'
        self.assertTrue(validate.validate_trajectory(self.trace))

    def test_bad_json_reports_error(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.jsonl';p.write_text('{bad')
            self.assertTrue(validate.read_and_validate(p)[2])


if __name__=='__main__': unittest.main()
