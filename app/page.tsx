import Link from "next/link";
import { OutcomeBadge } from "@/components/outcome-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GRADERS } from "@/lib/harness/graders";
import {
  categoryDomainMatrix, latestRuns, modelSummary, pairConsistency, stakesBreakdown, verdictFor, type Cell, type TaskInfo,
} from "@/lib/harness/results";
import { listRuns } from "@/lib/harness/store";
import { loadTasks } from "@/lib/harness/tasks";
import { DOMAINS } from "@/lib/harness/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  fixture: "scripted fixture",
  mock_api: "scripted mock API",
  organiser_fixture: "organiser sample",
};
const OTHER_ERRORS = ["wrong_decision", "wrong_target", "insufficient_evidence"];

function Outcomes({ cell }: { cell: Cell }) {
  if (!cell.runs.length) return <span className="text-xs text-muted-foreground italic">unrun</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(cell.outcomes).sort().map(([o, n]) => <OutcomeBadge key={o} outcome={o} count={n} />)}
      {cell.ungraded > 0 && <Badge variant="outline">ungraded ×{cell.ungraded}</Badge>}
      <span className="text-xs text-muted-foreground">n={cell.runs.length}</span>
    </div>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const graderKey = one(sp.grader) && GRADERS[one(sp.grader)!] ? one(sp.grader)! : "strict";
  const version = GRADERS[graderKey].version;

  const { tasks: loaded, errors } = loadTasks();
  const tasks = new Map<string, TaskInfo>(loaded.map(({ task: t }) => [t.id, t]));
  const all = listRuns();
  const latest = latestRuns(all);
  const models = [...new Set(latest.map((r) => r.meta.model))].sort();
  const model = models.includes(one(sp.model) ?? "") ? one(sp.model)! : models[0];
  const cat = one(sp.cat), dom = one(sp.dom);

  const mine = latest.filter((r) => r.meta.model === model);
  const matrix = categoryDomainMatrix(mine, tasks, version);
  const stakes = stakesBreakdown(mine, tasks, version);
  const summary = modelSummary(latest, version);
  const pairs = pairConsistency(latest, tasks, version);
  const listed = all.filter((r) => r.meta.model === model && (!cat || (tasks.get(r.meta.task_id)?.category === cat && tasks.get(r.meta.task_id)?.domain === dom)));

  const href = (o: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ model, grader: graderKey, cat, dom, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/?${q}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-950">
        All results are from <b>scripted fixture agents</b>, <b>organiser sample trajectories</b> or the <b>scripted mock API</b>.
        None of this is live-model evidence. Matrix counts use the latest run per model × task × seed.
      </div>

      {errors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-destructive">Rejected task files ({errors.length})</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {errors.map((e) => <p key={e.file}><code>{e.file}</code>: {e.errors.join("; ")}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground">Model:</span>
          {models.map((m) => (
            <Link key={m} href={href({ model: m, cat: undefined, dom: undefined })}
              className={cn("rounded px-2 py-0.5 font-mono", m === model ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{m}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Grader:</span>
          {Object.entries(GRADERS).map(([k, g]) => (
            <Link key={k} href={href({ grader: k })}
              className={cn("rounded px-2 py-0.5 font-mono", k === graderKey ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{g.version}</Link>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Category × domain: <code>{model}</code> · {KIND_LABEL[mine[0]?.meta.agent_kind] ?? ""} · graded by <code>{version}</code></h2>
        <Table className="border">
          <TableHeader>
            <TableRow><TableHead>category \ domain</TableHead>{DOMAINS.map((d) => <TableHead key={d}>{d}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.category}>
                <TableCell className="font-mono text-xs">{row.category}</TableCell>
                {row.cells.map((c) => (
                  <TableCell key={c.domain} className={cn("align-top", cat === row.category && dom === c.domain && "bg-muted")}>
                    {c.runs.length
                      ? <Link href={href({ cat: row.category, dom: c.domain })} className="block hover:opacity-80"><Outcomes cell={c} /></Link>
                      : <Outcomes cell={c} />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Stakes tier: <code>{model}</code></h2>
          <Table className="border">
            <TableBody>
              {stakes.map((s) => (
                <TableRow key={s.tier}><TableCell className="w-20">tier {s.tier}</TableCell><TableCell><Outcomes cell={s} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Twin-pair consistency</h2>
          <Table className="border">
            <TableHeader><TableRow><TableHead>model</TableHead><TableHead>consistent / complete pairs</TableHead></TableRow></TableHeader>
            <TableBody>
              {pairs.map((p) => (
                <TableRow key={p.model}>
                  <TableCell className="font-mono text-xs">{p.model}</TableCell>
                  <TableCell>{p.complete ? `${p.consistent} / ${p.complete}` : <span className="italic text-muted-foreground">no complete pair (of {p.total})</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">All models: outcome counts (<code>{version}</code>)</h2>
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>model</TableHead><TableHead>source</TableHead><TableHead>n</TableHead><TableHead>correct</TableHead>
              <TableHead className="text-red-700">unauthorised_action</TableHead><TableHead className="text-amber-700">over_escalation</TableHead>
              <TableHead>other errors</TableHead><TableHead>no_decision</TableHead><TableHead>ungraded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((s) => {
              const count = (pred: (o: string) => boolean) => Object.entries(s.outcomes).filter(([o]) => pred(o)).reduce((a, [, n]) => a + n, 0);
              return (
                <TableRow key={s.model}>
                  <TableCell><Link href={href({ model: s.model, cat: undefined, dom: undefined })} className="font-mono text-xs underline">{s.model}</Link></TableCell>
                  <TableCell className="text-xs">{KIND_LABEL[s.kind]}</TableCell>
                  <TableCell>{s.runs.length}</TableCell>
                  <TableCell>{count((o) => o.startsWith("correct_"))}</TableCell>
                  <TableCell className="font-semibold text-red-700">{count((o) => o === "unauthorised_action")}</TableCell>
                  <TableCell className="font-semibold text-amber-700">{count((o) => o === "over_escalation")}</TableCell>
                  <TableCell>{count((o) => OTHER_ERRORS.includes(o))}</TableCell>
                  <TableCell>{count((o) => o === "no_decision")}</TableCell>
                  <TableCell>{s.ungraded}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">
          Runs: <code>{model}</code>{cat && <> · {cat} × {dom} <Link href={href({ cat: undefined, dom: undefined })} className="text-xs underline">clear</Link></>}
          <span className="ml-2 text-xs font-normal text-muted-foreground">(all runs incl. superseded reruns)</span>
        </h2>
        <Table className="border">
          <TableHeader>
            <TableRow><TableHead>run</TableHead><TableHead>task</TableHead><TableHead>declared</TableHead><TableHead>termination</TableHead><TableHead>outcome ({version})</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {listed.map((r) => {
              const v = verdictFor(r, version);
              const t = tasks.get(r.meta.task_id);
              return (
                <TableRow key={r.meta.run_id}>
                  <TableCell><Link href={`/runs/${r.meta.run_id}`} className="font-mono text-xs underline">{r.meta.run_id}</Link></TableCell>
                  <TableCell className="text-xs">{r.meta.task_id}<div className="text-muted-foreground">{t?.category} · {t?.domain} · tier {t?.stakes_tier}</div></TableCell>
                  <TableCell className="font-mono text-xs">{(() => { const last = r.trajectory.at(-1); return last?.type === "terminal" ? last.declared_action : "—"; })()}</TableCell>
                  <TableCell className="text-xs">{r.meta.termination}</TableCell>
                  <TableCell>{v ? <OutcomeBadge outcome={v.outcome} /> : <Badge variant="outline">ungraded</Badge>}{!r.intact && <Badge variant="destructive" className="ml-1">trace modified</Badge>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
