import { cn } from "@/lib/utils";

// Authority failures are the only saturated colour; everything else is a soft tint so red stays loud.
const TONE: Record<string, { badge: string; bar: string }> = {
  correct: { badge: "bg-emerald-100 text-emerald-900", bar: "bg-emerald-500" },
  unauthorised_action: { badge: "bg-red-600 text-white", bar: "bg-red-600" },
  over_escalation: { badge: "bg-amber-100 text-amber-900 ring-1 ring-amber-300", bar: "bg-amber-400" },
  wrong_decision: { badge: "bg-orange-100 text-orange-900", bar: "bg-orange-300" },
  wrong_target: { badge: "bg-violet-100 text-violet-900", bar: "bg-violet-300" },
  insufficient_evidence: { badge: "bg-sky-100 text-sky-900", bar: "bg-sky-300" },
  no_decision: { badge: "bg-zinc-200 text-zinc-800", bar: "bg-zinc-400" },
};

export const outcomeTone = (o: string) => TONE[o.startsWith("correct_") ? "correct" : o] ?? { badge: "bg-muted", bar: "bg-muted" };

/** Stable left-to-right order for distributions: successes first, authority failures last and loudest. */
export const OUTCOME_ORDER = [
  "correct_act", "correct_escalation", "correct_refusal", "correct_ask", "correct_handoff",
  "insufficient_evidence", "wrong_target", "over_escalation", "wrong_decision", "no_decision", "unauthorised_action",
];

export function OutcomeBadge({ outcome, count, className }: { outcome: string; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-4 whitespace-nowrap", outcomeTone(outcome).badge, className)}>
      {outcome}
      {count !== undefined && <span className="tabular-nums opacity-80">×{count}</span>}
    </span>
  );
}

const LEGEND: [string, string][] = [
  ["correct_act", "correct"], ["insufficient_evidence", "insufficient evidence"], ["wrong_target", "wrong target"],
  ["over_escalation", "over-escalation"], ["wrong_decision", "wrong decision"], ["no_decision", "no decision"],
  ["unauthorised_action", "unauthorised"],
];

export function OutcomeLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {LEGEND.map(([o, label]) => (
        <li key={o} className="flex items-center gap-1"><span className={cn("size-2 rounded-full", outcomeTone(o).bar)} aria-hidden />{label}</li>
      ))}
    </ul>
  );
}

export function OutcomeBar({ outcomes, total }: { outcomes: Record<string, number>; total: number }) {
  if (!total) return <div className="h-2 rounded-full bg-muted" />;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img"
      aria-label={OUTCOME_ORDER.filter((o) => outcomes[o]).map((o) => `${o} ${outcomes[o]}`).join(", ")}>
      {OUTCOME_ORDER.filter((o) => outcomes[o]).map((o) => (
        <div key={o} className={outcomeTone(o).bar} style={{ width: `${(outcomes[o] / total) * 100}%` }} title={`${o}: ${outcomes[o]}`} />
      ))}
    </div>
  );
}
