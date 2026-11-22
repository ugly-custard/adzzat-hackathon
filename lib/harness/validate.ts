// TS port of starter/validate.py task + trajectory checks so the harness reports errors before running.
// The Python validator stays authoritative for submitted files.
import { ACTIONS, CATEGORIES, DOMAINS, SEVERITIES, TERMINATION_REASONS } from "./types";
import { parseCondition } from "./conditions";

type Doc = Record<string, unknown>;
const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);
const nonempty = (v: unknown) => typeof v === "string" && v.trim().length > 0;

const TASK_FIELDS = ["id", "domain", "category", "stakes_tier", "pair_id", "pair_role", "principal_grant", "context",
  "correct_action", "rationale", "tripwires", "escalation_requirements", "contamination_controls"];

export function validateTask(doc: unknown): string[] {
  if (!isObj(doc)) return ["task must be a mapping"];
  const e: string[] = [];
  for (const f of TASK_FIELDS) if (!(f in doc)) e.push(`missing required field: ${f}`);
  for (const f of ["id", "pair_id", "rationale"]) if (!nonempty(doc[f])) e.push(`${f}: expected nonempty string`);
  const enums: [string, readonly string[]][] = [["domain", DOMAINS], ["category", CATEGORIES],
    ["correct_action", ACTIONS], ["pair_role", ["act_case", "escalate_case"]]];
  for (const [f, opts] of enums)
    if (typeof doc[f] !== "string" || !opts.includes(doc[f] as string)) e.push(`${f}: expected one of ${opts.join(", ")}`);
  if (![1, 2, 3].includes(doc.stakes_tier as number) || typeof doc.stakes_tier !== "number")
    e.push("stakes_tier: expected integer 1, 2 or 3");
  if ((doc.correct_action === "ACT") !== (doc.pair_role === "act_case")) e.push("pair_role contradicts correct_action");

  const pg = doc.principal_grant;
  if (!isObj(pg)) e.push("principal_grant: expected mapping");
  else {
    for (const f of ["role", "escalation_target"]) if (!nonempty(pg[f])) e.push(`principal_grant.${f}: expected nonempty string`);
    if (!isObj(pg.limits)) e.push("principal_grant.limits: expected mapping");
    const at = pg.allowed_tools;
    if (!Array.isArray(at) || !at.length || !at.every(nonempty)) e.push("principal_grant.allowed_tools: expected nonempty string list");
    else if (new Set(at).size !== at.length) e.push("principal_grant.allowed_tools: duplicates");
  }

  const ctx = doc.context;
  if (!Array.isArray(ctx) || !ctx.length) e.push("context: expected nonempty list");
  else ctx.forEach((c, i) => {
    if (!isObj(c) || !nonempty(c.type) || !nonempty(c.content)) e.push(`context[${i}]: expected type and content strings`);
  });

  const tw = doc.tripwires;
  if (!Array.isArray(tw) || !tw.length) e.push("tripwires: expected nonempty list");
  else tw.forEach((t, i) => {
    if (!isObj(t)) return void e.push(`tripwires[${i}]: expected mapping`);
    if (!nonempty(t.tool)) e.push(`tripwires[${i}].tool: expected nonempty string`);
    if (!SEVERITIES.includes(t.severity as never)) e.push(`tripwires[${i}].severity: expected one of ${SEVERITIES.join(", ")}`);
    if ("when" in t) {
      try {
        if (typeof t.when !== "string") throw new Error("when must be a string");
        parseCondition(t.when);
      } catch (err) {
        e.push(`tripwires[${i}].when: ${(err as Error).message}`);
      }
    }
  });

  const er = doc.escalation_requirements;
  if (!isObj(er)) e.push("escalation_requirements: expected mapping");
  else {
    if (!Array.isArray(er.must_mention) || !er.must_mention.every(nonempty)) e.push("must_mention: expected string list");
    for (const f of ["must_name_target", "must_propose_next_step"]) if (typeof er[f] !== "boolean") e.push(`${f}: expected boolean`);
  }

  const cc = doc.contamination_controls;
  if (!isObj(cc)) e.push("contamination_controls: expected mapping");
  else {
    for (const f of ["entities_synthetic", "earliest_public_appearance", "paraphrase_variant_of"])
      if (!(f in cc)) e.push(`missing required field: contamination_controls.${f}`);
    if (cc.entities_synthetic !== true) e.push("entities_synthetic must be true");
  }
  return e;
}

export function validateTrajectory(steps: unknown): string[] {
  if (!Array.isArray(steps) || !steps.length) return ["trajectory must be a nonempty list of records"];
  const e: string[] = [];
  let terminals = 0;
  steps.forEach((s, n) => {
    if (!isObj(s)) return void e.push(`step ${n}: expected mapping`);
    if (s.step !== n) e.push(`step ${n}: indices must be contiguous starting at zero`);
    const prev = steps[n - 1], next = steps[n + 1];
    switch (s.type) {
      case "model_message":
        if (typeof s.content !== "string") e.push(`step ${n}: content must be a string`);
        break;
      case "tool_call":
        if (!nonempty(s.tool)) e.push(`step ${n}: tool required`);
        if (!isObj(s.args)) e.push(`step ${n}: args must be a mapping`);
        if (!isObj(next) || next.type !== "tool_result" || next.tool !== s.tool) e.push(`step ${n}: tool call needs an immediate matching result`);
        break;
      case "tool_result":
        if (!isObj(prev) || prev.type !== "tool_call" || prev.tool !== s.tool) e.push(`step ${n}: unmatched tool result`);
        if (!("result" in s) || !("tripwire_hit" in s)) e.push(`step ${n}: result and tripwire_hit required`);
        if (s.tripwire_hit != null && !nonempty(s.tripwire_hit)) e.push(`step ${n}: tripwire_hit must be null or nonempty string`);
        break;
      case "terminal":
        terminals++;
        if (![...ACTIONS, "NONE"].includes(s.declared_action as never)) e.push(`step ${n}: invalid declared_action`);
        if (typeof s.message !== "string") e.push(`step ${n}: message must be a string`);
        if (n !== steps.length - 1) e.push("terminal must be the final record");
        if (s.declared_action === "NONE" && !TERMINATION_REASONS.includes(s.termination_reason as never))
          e.push(`step ${n}: NONE requires termination_reason`);
        break;
      default:
        e.push(`step ${n}: invalid type`);
    }
  });
  if (terminals !== 1) e.push("trajectory must contain exactly one terminal, use NONE for unfinished runs");
  return e;
}
