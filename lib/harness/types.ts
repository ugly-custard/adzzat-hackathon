export const ACTIONS = ["ACT", "ASK_USER", "ESCALATE_HUMAN", "REFUSE", "HANDOFF"] as const;
export type Action = (typeof ACTIONS)[number];
export type Declared = Action | "NONE";
export const CATEGORIES = ["epistemic_failure", "high_stakes", "authority_scope", "human_state", "adversarial", "value_judgement"] as const;
export const DOMAINS = ["finance_ops", "hr_admin", "customer_refunds"] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export const TERMINATION_REASONS = ["timeout", "step_budget", "model_error", "aborted"] as const;
export type TerminationReason = (typeof TERMINATION_REASONS)[number];

export const CORRECT_OUTCOME: Record<Action, string> = {
  ACT: "correct_act",
  ESCALATE_HUMAN: "correct_escalation",
  REFUSE: "correct_refusal",
  ASK_USER: "correct_ask",
  HANDOFF: "correct_handoff",
};
export const OUTCOMES = [
  ...Object.values(CORRECT_OUTCOME),
  "unauthorised_action", "over_escalation", "wrong_target", "no_decision", "wrong_decision", "insufficient_evidence",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface Tripwire { tool: string; severity: (typeof SEVERITIES)[number]; when?: string }

export interface Task {
  id: string;
  domain: (typeof DOMAINS)[number];
  category: (typeof CATEGORIES)[number];
  stakes_tier: 1 | 2 | 3;
  pair_id: string;
  pair_role: "act_case" | "escalate_case";
  principal_grant: {
    role: string;
    limits: Record<string, unknown>;
    allowed_tools: string[];
    escalation_target: string;
  };
  /** Harness extension: read tools that must succeed before the agent's first action. */
  required_evidence?: string[];
  context: { type: string; content: string }[];
  correct_action: Action;
  rationale: string;
  tripwires: Tripwire[];
  escalation_requirements: { must_mention: string[]; must_name_target: boolean; must_propose_next_step: boolean };
  contamination_controls: Record<string, unknown>;
  [extra: string]: unknown;
}

export type Step =
  | { step: number; ts: string; type: "model_message"; content: string }
  | { step: number; ts: string; type: "tool_call"; tool: string; args: Record<string, unknown> }
  | {
      step: number; ts: string; type: "tool_result"; tool: string; result: string;
      tripwire_hit: string | null; tripwires_hit?: string[]; blocked: boolean;
    }
  | {
      step: number; ts: string; type: "terminal"; declared_action: Declared; message: string;
      next_step?: string; target?: string; termination_reason?: TerminationReason;
    };

export interface Verdict {
  task_id: string;
  model: string;
  run_id: string;
  declared_action: Declared;
  correct_action: Action;
  action_match: boolean;
  tripwires_hit: string[];
  escalation_quality: number;
  evidence_steps: number;
  reward: number;
  outcome: Outcome;
  grader_notes: string;
  grader_version: string;
  seed: number | null;
  /** Provenance stamped by replay.gradeRun; extra fields are allowed by the contract. */
  graded_at?: string;
  grader_sha256?: string;
  trajectory_sha256?: string;
  [diagnostic: string]: unknown;
}

/** agent_kind keeps fixture runs and organiser samples from being mistaken for live-model evidence. */
export type AgentKind = "fixture" | "organiser_fixture";

export interface RunMeta {
  run_id: string;
  task_id: string;
  task_file: string;
  task_sha256: string;
  model: string;
  agent_kind: AgentKind;
  seed: number | null;
  started_at: string;
  finished_at: string;
  step_budget: number | null;
  timeout_ms: number | null;
  termination: "terminal" | TerminationReason;
  trajectory_sha256: string;
  harness_version: string;
  notes?: string;
}

export interface Grader {
  version: string;
  /** Files whose contents define this grader's behaviour; hashed into every verdict it writes. */
  sources: string[];
  grade(task: Task, trajectory: Step[], opts: { model: string; run_id: string; seed: number | null }): Promise<Verdict>;
}
