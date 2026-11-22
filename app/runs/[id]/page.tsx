import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, FlagIcon, MessageSquareIcon, ShieldAlertIcon, WrenchIcon } from "lucide-react";
import { OutcomeBadge } from "@/components/outcome-badge";
import { Button } from "@/components/ui/button";
import { GRADERS } from "@/lib/harness/graders";
import { diffVerdicts, verdictFor } from "@/lib/harness/results";
import { RUNS_DIR, readRun } from "@/lib/harness/store";
import { loadTaskFile } from "@/lib/harness/tasks";
import type { Step, Verdict } from "@/lib/harness/types";
import { cn } from "@/lib/utils";
import { regrade } from "./actions";

export const dynamic = "force-dynamic";

type ToolCall = Extract<Step, { type: "tool_call" }>;
type ToolResult = Extract<Step, { type: "tool_result" }>;

const StepNo = ({ n }: { n: number }) => <span className="font-mono text-[11px] tabular-nums text-muted-foreground">#{n}</span>;

function ToolBlock({ call, result }: { call: ToolCall; result?: ToolResult }) {
  const hits = result ? (result.tripwires_hit ?? (result.tripwire_hit ? [result.tripwire_hit] : [])) : [];
  const flagged = hits.length > 0;
  return (
    <div id={`step-${call.step}`} className={cn("scroll-mt-6 rounded-lg border", flagged && "border-red-500 bg-red-50/60 ring-1 ring-red-500")}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {flagged ? <ShieldAlertIcon className="size-4 text-red-600" aria-hidden /> : <WrenchIcon className="size-4 text-muted-foreground" aria-hidden />}
        <code className="text-sm font-semibold">{call.tool}</code>
        <StepNo n={call.step} />{result && <StepNo n={result.step} />}
        {flagged && (
          <span className="ml-auto rounded-md bg-red-600 px-1.5 py-0.5 font-mono text-[11px] text-white">
            {result?.blocked === false ? "TRIPWIRE HIT" : "BLOCKED"} · {hits.join(", ")}
          </span>
        )}
      </div>
      {Object.keys(call.args).length > 0 && (
        <pre className="overflow-x-auto border-b bg-muted/30 px-3 py-2 font-mono text-xs">{JSON.stringify(call.args, null, 2)}</pre>
      )}
      {result && <pre id={`step-${result.step}`} className="max-h-56 overflow-auto px-3 py-2 font-mono text-xs whitespace-pre-wrap">{result.result}</pre>}
    </div>
  );
}

function Timeline({ steps }: { steps: Step[] }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.type === "tool_call") {
      const next = steps[i + 1];
      const result = next?.type === "tool_result" ? next : undefined;
      out.push(<ToolBlock key={s.step} call={s} result={result} />);
      if (result) i++;
    } else if (s.type === "model_message") {
      out.push(
        <div key={s.step} id={`step-${s.step}`} className="flex gap-2 px-1 text-sm">
          <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground italic">{s.content} <StepNo n={s.step} /></p>
        </div>,
      );
    } else if (s.type === "terminal") {
      const none = s.declared_action === "NONE";
      out.push(
        <div key={s.step} id={`step-${s.step}`} className={cn("rounded-lg border-2 px-3 py-2", none ? "border-zinc-400 border-dashed" : "border-foreground")}>
          <div className="flex flex-wrap items-center gap-2">
            <FlagIcon className="size-4" aria-hidden />
            <span className="text-sm text-muted-foreground">Final decision</span>
            <code className="text-sm font-semibold">{s.declared_action}</code>
            {s.termination_reason && <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[11px]">{s.termination_reason}</span>}
            <StepNo n={s.step} />
          </div>
          <p className="mt-1 text-sm">{s.message}</p>
          {(s.target || s.next_step) && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
              {s.target && <><dt className="text-muted-foreground">target</dt><dd>{s.target}</dd></>}
              {s.next_step && <><dt className="text-muted-foreground">next step</dt><dd>{s.next_step}</dd></>}
            </dl>
          )}
        </div>,
      );
    } else {
      out.push(<pre key={s.step} className="rounded-lg border border-dashed px-3 py-2 text-xs">orphan result <StepNo n={s.step} />: {s.result}</pre>);
    }
  }
  return <div className="flex flex-col gap-3">{out}</div>;
}

function VerdictSummary({ v, title }: { v: Verdict; title?: string }) {
  const diagnostics = Array.isArray(v.diagnostics) ? (v.diagnostics as unknown[]).map(String) : [];
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <code className="text-xs font-semibold">{title ?? v.grader_version}</code>
        <OutcomeBadge outcome={v.outcome} className="ml-auto" />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2 text-xs">
        <dt className="text-muted-foreground">declared → expected</dt>
        <dd className="font-mono">{v.declared_action} → {v.correct_action} {v.action_match ? "(match)" : "(mismatch)"}</dd>
        <dt className="text-muted-foreground">tripwires</dt>
        <dd className={cn("font-mono", v.tripwires_hit.length && "font-semibold text-red-700")}>{v.tripwires_hit.join(", ") || "none"}</dd>
        <dt className="text-muted-foreground">evidence · quality</dt>
        <dd className="font-mono tabular-nums">{v.evidence_steps} · {v.escalation_quality}</dd>
        <dt className="text-muted-foreground">reward</dt>
        <dd className="font-mono tabular-nums">{v.reward}</dd>
        {v.graded_at && <><dt className="text-muted-foreground">graded</dt><dd className="font-mono tabular-nums">{v.graded_at}</dd></>}
      </dl>
      {diagnostics.length > 0 && (
        <ul className="list-disc border-t px-3 py-2 pl-7 text-xs">{diagnostics.map((d, i) => <li key={i}>{d}</li>)}</ul>
      )}
      <details className="border-t px-3 py-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground">Notes and raw verdict JSON</summary>
        <p className="mt-2">{v.grader_notes}</p>
        <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 font-mono">{JSON.stringify(v, null, 2)}</pre>
      </details>
    </div>
  );
}

const versionOptions = (vs: Verdict[]) =>
  vs.map((v) => <option key={v.grader_version} value={v.grader_version}>{v.grader_version} · {v.graded_at?.slice(11, 19) ?? "?"}</option>);

export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  if (!/^[\w.-]+$/.test(id) || !existsSync(path.join(RUNS_DIR, id, "meta.json"))) notFound();
  const run = readRun(id);
  const { meta } = run;
  const loaded = loadTaskFile(meta.task_file);
  const task = "task" in loaded ? loaded.task : null;

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(sp.error);
  // Default comparison: the original (oldest) verdict vs the current strict grader.
  const a = run.verdicts.find((v) => v.grader_version === one(sp.a)) ?? run.verdicts[0];
  const b = run.verdicts.find((v) => v.grader_version === one(sp.b)) ?? verdictFor(run, GRADERS.strict.version) ?? run.verdicts.at(-1);
  const sameEvidence = !!a && !!b && a.trajectory_sha256 === meta.trajectory_sha256 && b.trajectory_sha256 === meta.trajectory_sha256;
  const hitSteps = run.trajectory.flatMap((s) => (s.type === "tool_result" && (s.tripwire_hit || s.tripwires_hit?.length) ? [s.step] : []));
  const rows = a && b ? diffVerdicts(a, b) : [];
  const changed = rows.filter((r) => r.changed && r.field !== "graded_at" && r.field !== "grader_sha256");
  const facts: [string, string][] = [
    ["termination", meta.termination], ["seed", String(meta.seed)], ["step budget", String(meta.step_budget ?? "n/a")],
    ["timeout", meta.timeout_ms ? `${meta.timeout_ms} ms` : "n/a"], ["started (UTC)", meta.started_at.replace("T", " ").slice(0, 19)],
    ["harness", meta.harness_version],
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href={`/?model=${encodeURIComponent(meta.model)}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" aria-hidden /> Results for <code className="text-xs">{meta.model}</code>
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.task_id}</h1>
          <code className="text-sm">{meta.model}</code>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{meta.agent_kind.replace("_", " ")}</span>
        </div>
        <p className="font-mono text-xs break-all text-muted-foreground">{meta.run_id}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {facts.map(([k, v]) => <div key={k}><dt className="inline text-muted-foreground">{k} </dt><dd className="inline font-mono tabular-nums">{v}</dd></div>)}
          <div>
            <dt className="inline text-muted-foreground">trajectory sha256 </dt>
            <dd className={cn("inline font-mono", run.intact ? "text-emerald-700" : "font-semibold text-red-700")}>
              {meta.trajectory_sha256.slice(0, 12)} {run.intact ? "intact" : "MODIFIED: grading refused"}
            </dd>
          </div>
        </dl>
        {meta.notes && <p className="text-xs text-muted-foreground">{meta.notes}</p>}
        {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"><b>Re-grade refused.</b> {error}</p>}
      </header>

      {a && b && run.verdicts.length > 1 && (
        <section className="rounded-lg border">
          <form className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
            <h2 className="mr-2 font-semibold">Compare verdicts</h2>
            <select name="a" defaultValue={a.grader_version} aria-label="Verdict A" className="h-8 rounded-md border bg-background px-2 font-mono text-xs">{versionOptions(run.verdicts)}</select>
            <span className="text-muted-foreground">vs</span>
            <select name="b" defaultValue={b.grader_version} aria-label="Verdict B" className="h-8 rounded-md border bg-background px-2 font-mono text-xs">{versionOptions(run.verdicts)}</select>
            <Button type="submit" size="sm" variant="outline">Compare</Button>
            <span className={cn("ml-auto text-xs", sameEvidence ? "text-emerald-700" : "text-red-700")}>
              {sameEvidence ? `Same saved trace (${meta.trajectory_sha256.slice(0, 12)}), no model call` : "Verdicts reference different trace hashes"}
            </span>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr><th className="px-3 py-1.5 font-medium">field</th><th className="px-3 py-1.5 font-medium">A · {a.grader_version}</th><th className="px-3 py-1.5 font-medium">B · {b.grader_version}</th></tr>
              </thead>
              <tbody>
                {changed.length === 0 && <tr><td colSpan={3} className="px-3 py-2 text-muted-foreground">No differences in verdict content.</td></tr>}
                {changed.map((r) => (
                  <tr key={r.field} className="border-b align-top last:border-0">
                    <td className="px-3 py-1.5 font-mono font-medium">{r.field}</td>
                    <td className="px-3 py-1.5 font-mono break-all">{r.field === "outcome" && a ? <OutcomeBadge outcome={a.outcome} /> : r.a ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono break-all">{r.field === "outcome" && b ? <OutcomeBadge outcome={b.outcome} /> : r.b ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>{rows.length - changed.length} fields unchanged (incl. provenance timestamps/hashes)</span>
            {hitSteps.length > 0 && (
              <span>Tripwire evidence: {hitSteps.map((n) => <a key={n} href={`#step-${n}`} className="mr-2 font-mono text-red-700 underline underline-offset-2">step #{n}</a>)}</span>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section>
          <h2 className="mb-3 text-base font-semibold">Trace <span className="font-normal text-muted-foreground">· {run.trajectory.length} steps</span></h2>
          <Timeline steps={run.trajectory} />
        </section>

        <aside className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Verdicts</h2>
          <form action={regrade} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <input type="hidden" name="run_id" value={meta.run_id} />
            <label htmlFor="grader" className="text-muted-foreground">Re-grade with</label>
            <select id="grader" name="grader" className="h-8 rounded-md border bg-background px-2 font-mono text-xs">
              {Object.entries(GRADERS).map(([k, g]) => <option key={k} value={k}>{g.version}</option>)}
            </select>
            <Button type="submit" size="sm" disabled={!run.intact}>Re-grade</Button>
            <p className="w-full text-xs text-muted-foreground">Reads the saved trajectory only. No agent or model call. Existing verdicts are never overwritten.</p>
          </form>
          {[...run.verdicts].reverse().map((v) => <VerdictSummary key={v.grader_version} v={v} />)}
          {run.organiserVerdict && <VerdictSummary v={run.organiserVerdict} title="shipped with organiser sample" />}

          {task && (
            <details className="rounded-lg border text-xs">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Task {task.id} <span className="font-normal text-muted-foreground">· reviewer view, includes the answer</span></summary>
              <div className="flex flex-col gap-2 border-t px-3 py-2">
                <p>{task.category} · {task.domain} · tier {task.stakes_tier} · pair {task.pair_id} ({task.pair_role})</p>
                <p><span className="text-muted-foreground">correct action</span> <code className="font-semibold">{task.correct_action}</code></p>
                <p className="leading-relaxed">{task.rationale}</p>
                <p><span className="text-muted-foreground">allowed tools</span> <span className="font-mono">{task.principal_grant.allowed_tools.join(", ")}</span></p>
                <p><span className="text-muted-foreground">tripwires</span> <span className="font-mono">{task.tripwires.map((t) => `${t.tool}${t.when ? ` when ${t.when}` : ""} (${t.severity})`).join("; ")}</span></p>
                {task.context.map((c, i) => <pre key={i} className="rounded bg-muted/50 p-2 font-mono whitespace-pre-wrap">[{c.type}]{"\n"}{c.content.trim()}</pre>)}
              </div>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
