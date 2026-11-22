import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeBadge } from "@/components/outcome-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GRADERS } from "@/lib/harness/graders";
import { diffVerdicts, verdictFor } from "@/lib/harness/results";
import { RUNS_DIR, readRun } from "@/lib/harness/store";
import { loadTaskFile } from "@/lib/harness/tasks";
import type { Step, Verdict } from "@/lib/harness/types";
import { cn } from "@/lib/utils";
import { regrade } from "./actions";

export const dynamic = "force-dynamic";

function StepView({ s }: { s: Step }) {
  const base = "rounded border px-3 py-2 text-sm";
  const head = <span className="mr-2 font-mono text-xs text-muted-foreground">#{s.step} {s.type}</span>;
  switch (s.type) {
    case "model_message":
      return <div className={cn(base, "bg-muted/40")}>{head}<p className="mt-1 whitespace-pre-wrap">{s.content}</p></div>;
    case "tool_call":
      return <div className={base}>{head}<code className="font-semibold">{s.tool}</code><pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(s.args, null, 2)}</pre></div>;
    case "tool_result": {
      const hits = s.tripwires_hit ?? (s.tripwire_hit ? [s.tripwire_hit] : []);
      return (
        <div className={cn(base, hits.length && "border-2 border-red-600 bg-red-50")}>
          {head}<code>{s.tool}</code>
          {hits.length > 0 && <Badge variant="destructive" className="ml-2">{s.blocked === false ? "TRIPWIRE HIT" : "BLOCKED"} · {hits.join(", ")}</Badge>}
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{s.result}</pre>
        </div>
      );
    }
    case "terminal":
      return (
        <div className={cn(base, "border-2", s.declared_action === "NONE" ? "border-zinc-500" : "border-primary")}>
          {head}<b className="font-mono">{s.declared_action}</b>
          {s.termination_reason && <Badge variant="outline" className="ml-2">{s.termination_reason}</Badge>}
          <p className="mt-1 whitespace-pre-wrap">{s.message}</p>
          {s.target && <p className="text-xs"><b>target:</b> {s.target}</p>}
          {s.next_step && <p className="text-xs"><b>next_step:</b> {s.next_step}</p>}
        </div>
      );
  }
}

function VerdictCard({ v, title }: { v: Verdict; title: string }) {
  const { diagnostics, grader_notes, ...rest } = v;
  return (
    <Card size="sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm">{title} <OutcomeBadge outcome={v.outcome} /></CardTitle></CardHeader>
      <CardContent className="text-xs">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {Object.entries(rest).map(([k, val]) => (
            <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono break-all">{JSON.stringify(val)}</dd></div>
          ))}
        </dl>
        <p className="mt-2 text-muted-foreground">{grader_notes}</p>
        {Array.isArray(diagnostics) && diagnostics.length > 0 && (
          <ul className="mt-2 list-disc pl-4">{diagnostics.map((d, i) => <li key={i}>{String(d)}</li>)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

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

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/?model=${encodeURIComponent(meta.model)}`} className="text-sm underline">← results</Link>
      <div>
        <h1 className="font-mono text-lg font-semibold break-all">{meta.run_id}</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{meta.agent_kind}</Badge>
          <Badge variant="outline">model {meta.model}</Badge>
          <Badge variant="outline">task {meta.task_id}</Badge>
          <Badge variant="outline">termination {meta.termination}</Badge>
          <Badge variant="outline">seed {String(meta.seed)}</Badge>
          {run.intact
            ? <Badge variant="outline">trajectory sha256 {meta.trajectory_sha256.slice(0, 12)} ✓</Badge>
            : <Badge variant="destructive">trajectory modified since run: grading refused</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {meta.started_at} → {meta.finished_at} · budget {String(meta.step_budget)} · timeout {String(meta.timeout_ms)} ms · {meta.harness_version}
          {meta.notes && <> · {meta.notes}</>}
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-600 bg-red-50 px-4 py-2 text-sm text-red-900"><b>Re-grade refused:</b> {error}</div>
      )}

      {a && b && (
        <section className="rounded border p-3">
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <b>Compare verdicts</b>
            <span>A</span>
            <select name="a" defaultValue={a.grader_version} className="rounded border px-2 py-1 font-mono text-xs">
              {run.verdicts.map((v) => <option key={v.grader_version} value={v.grader_version}>{v.grader_version} ({v.graded_at ?? "?"})</option>)}
            </select>
            <span>vs B</span>
            <select name="b" defaultValue={b.grader_version} className="rounded border px-2 py-1 font-mono text-xs">
              {run.verdicts.map((v) => <option key={v.grader_version} value={v.grader_version}>{v.grader_version} ({v.graded_at ?? "?"})</option>)}
            </select>
            <Button type="submit" size="sm" variant="outline">Compare</Button>
          </form>
          <p className={cn("mt-2 text-xs", sameEvidence ? "text-emerald-700" : "text-red-700")}>
            {sameEvidence
              ? `Both verdicts graded the same saved trajectory (sha256 ${meta.trajectory_sha256.slice(0, 12)}). No model call was made to produce either comparison.`
              : "Verdicts do not both reference this run's trajectory hash; treat the comparison with suspicion."}
          </p>
          <table className="mt-2 w-full text-xs">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">field</th><th>A: {a.grader_version}</th><th>B: {b.grader_version}</th></tr></thead>
            <tbody>
              {diffVerdicts(a, b).map((r) => (
                <tr key={r.field} className={cn("border-t align-top", r.changed && "bg-amber-100 font-semibold")}>
                  <td className="py-1 pr-2 font-mono">{r.changed ? "≠ " : ""}{r.field}</td>
                  <td className="pr-2 font-mono break-all">{r.a ?? "—"}</td>
                  <td className="font-mono break-all">{r.b ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hitSteps.length > 0 && (
            <p className="mt-2 text-xs">
              Tripwire evidence in the saved trace: {hitSteps.map((n) => <a key={n} href={`#step-${n}`} className="mr-2 font-mono text-red-700 underline">step #{n}</a>)}
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Trace ({run.trajectory.length} steps)</h2>
          {run.trajectory.map((s) => <div key={s.step} id={`step-${s.step}`} className="scroll-mt-4"><StepView s={s} /></div>)}
        </section>

        <aside className="flex flex-col gap-3">
          <form action={regrade} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="run_id" value={meta.run_id} />
            <span>Re-grade saved trace with</span>
            <select name="grader" className="rounded border px-2 py-1 font-mono text-xs">
              {Object.entries(GRADERS).map(([k, g]) => <option key={k} value={k}>{g.version}</option>)}
            </select>
            <Button type="submit" size="sm" disabled={!run.intact}>Re-grade</Button>
          </form>
          <p className="text-xs text-muted-foreground">Re-grading reads trajectory.jsonl only. No agent or model is called.</p>
          {run.verdicts.map((v) => <VerdictCard key={v.grader_version} v={v} title={`${v.grader_version} · graded ${v.graded_at ?? "?"}`} />)}
          {run.organiserVerdict && <VerdictCard v={run.organiserVerdict} title="shipped with organiser sample" />}

          {task && (
            <Card size="sm">
              <CardHeader><CardTitle className="text-sm">Task {task.id} (reviewer view: includes answer)</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-xs">
                <p>{task.category} · {task.domain} · tier {task.stakes_tier} · pair {task.pair_id} ({task.pair_role})</p>
                <p><b>correct_action:</b> <code>{task.correct_action}</code></p>
                <p className="whitespace-pre-wrap"><b>rationale:</b> {task.rationale}</p>
                <p><b>allowed_tools:</b> {task.principal_grant.allowed_tools.join(", ")}</p>
                <p><b>tripwires:</b> {task.tripwires.map((t) => `${t.tool}${t.when ? ` when ${t.when}` : ""} (${t.severity})`).join("; ")}</p>
                <details><summary className="cursor-pointer">context ({task.context.length})</summary>
                  {task.context.map((c, i) => <pre key={i} className="mt-1 whitespace-pre-wrap rounded bg-muted p-2">[{c.type}]{"\n"}{c.content}</pre>)}
                </details>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
