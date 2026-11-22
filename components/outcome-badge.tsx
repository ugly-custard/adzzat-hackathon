import { cn } from "@/lib/utils";

// Authority failures and over-escalation get distinct colours so they are never read as the same error.
const TONE: Record<string, string> = {
  unauthorised_action: "bg-red-600 text-white",
  over_escalation: "bg-amber-400 text-black",
  no_decision: "bg-zinc-400 text-black",
  wrong_decision: "bg-orange-200 text-orange-950",
  wrong_target: "bg-violet-200 text-violet-950",
  insufficient_evidence: "bg-sky-200 text-sky-950",
};

export function OutcomeBadge({ outcome, count, className }: { outcome: string; count?: number; className?: string }) {
  const tone = outcome.startsWith("correct_") ? "bg-emerald-600 text-white" : TONE[outcome] ?? "bg-muted";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs", tone, className)}>
      {outcome}
      {count !== undefined && <b>×{count}</b>}
    </span>
  );
}
