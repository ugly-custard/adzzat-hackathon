import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { FilterSelect } from "@/components/filter-select";
import { OutcomeBadge, OutcomeBar, OutcomeLegend } from "@/components/outcome-badge";
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
  organiser_fixture: "organiser sample",
};
const OTHER_ERRORS = ["wrong_decision", "wrong_target", "insufficient_evidence"];

function Outcomes({ cell }: { cell: Cell }) {
  if (!cell.runs.length) return <span className="text-xs text-muted-foreground/70">unrun</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Object.entries(cell.outcomes).sort().map(([o, n]) => <OutcomeBadge key={o} outcome={o} count={n} />)}
      {cell.ungraded > 0 && <span className="text-xs text-muted-foreground">ungraded ×{cell.ungraded}</span>}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">n={cell.runs.length}</span>
    </div>
  );
}

function Num({ n, tone }: { n: number; tone?: string }) {
  return <span className={cn("tabular-nums", n === 0 ? "text-muted-foreground/50" : tone)}>{n}</span>;
}

const th = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";
const td = "px-3 py-2";

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
  const model = models.includes(one(sp.model) ?? "") ? one(sp.model)! : (models.find((m) => m === "fixture/careful") ?? models[0]);
  const cat = one(sp.cat), dom = one(sp.dom);

  const mine = latest.filter((r) => r.meta.model === model);
  const matrix = categoryDomainMatrix(mine, tasks, version);
  const stakes = stakesBreakdown(mine, tasks, version);
  const summary = modelSummary(latest, version);
  const pairs = pairConsistency(latest, tasks, version);
  const listed = all.filter((r) => r.meta.model === model && (!cat || (tasks.get(r.meta.task_id)?.category === cat && tasks.get(r.meta.task_id)?.domain === dom)));
  const params = Object.fromEntries(Object.entries({ model, grader: graderKey, cat, dom }).filter(([, v]) => v)) as Record<string, string>;
  const href = (o: Record<string, string | undefined>) =>
    `/?${new URLSearchParams(Object.entries({ ...params, ...o }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loaded.length} tasks · {all.length} runs · {models.length} agents. Counts use the latest run per agent × task × seed.
            </p>
          </div>
          <FilterSelect label="Grader" name="grader" value={graderKey} params={params}
            options={Object.entries(GRADERS).map(([k, g]) => ({ value: k, label: g.version }))} />
        </div>
        <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Every run here comes from a scripted fixture agent or an organiser sample trajectory. None of it is live-model evidence.
        </p>
        {graderKey === "naive" && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            naive-0.1.0 grades the final label only and ignores tripwires. It exists to show the failure this benchmark targets. Do not read these counts as results.
          </p>
        )}
        {errors.length > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            <b>{errors.length} task file(s) rejected and not run</b>
            {errors.map((e) => <p key={e.file} className="mt-1 font-mono text-xs">{e.file}: {e.errors.join("; ")}</p>)}
          </div>
        )}
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Agents compared <span className="font-normal text-muted-foreground">· graded by <code className="text-xs">{version}</code></span></h2>
          <OutcomeLegend />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className={th}>agent</th><th className={cn(th, "w-48")}>outcomes</th><th className={cn(th, "text-right")}>runs</th>
                <th className={cn(th, "text-right")}>correct</th>
                <th className={cn(th, "text-right text-red-700")}>unauthorised</th>
                <th className={cn(th, "text-right text-amber-700")}>over-escalation</th>
                <th className={cn(th, "text-right")}>other errors</th><th className={cn(th, "text-right")}>no decision</th>
                <th className={cn(th, "text-right")}>twin pairs</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => {
                const count = (pred: (o: string) => boolean) => Object.entries(s.outcomes).filter(([o]) => pred(o)).reduce((a, [, n]) => a + n, 0);
                // Organiser samples are excluded from pair consistency, so they have no entry here.
                const p = pairs.find((x) => x.model === s.model);
                return (
                  <tr key={s.model} className={cn("border-b last:border-0", s.model === model ? "bg-muted/60" : "hover:bg-muted/30")}>
                    <td className={td}>
                      <Link href={href({ model: s.model, cat: undefined, dom: undefined })} className="font-mono text-xs font-medium whitespace-nowrap hover:underline">{s.model}</Link>
                      <div className="text-xs text-muted-foreground">{KIND_LABEL[s.kind]}</div>
                    </td>
                    <td className={td}><OutcomeBar outcomes={s.outcomes} total={s.runs.length} /></td>
                    <td className={cn(td, "text-right")}><Num n={s.runs.length} /></td>
                    <td className={cn(td, "text-right")}><Num n={count((o) => o.startsWith("correct_"))} tone="text-emerald-700" /></td>
                    <td className={cn(td, "text-right font-semibold")}><Num n={count((o) => o === "unauthorised_action")} tone="text-red-700" /></td>
                    <td className={cn(td, "text-right font-semibold")}><Num n={count((o) => o === "over_escalation")} tone="text-amber-700" /></td>
                    <td className={cn(td, "text-right")}><Num n={count((o) => OTHER_ERRORS.includes(o))} /></td>
                    <td className={cn(td, "text-right")}><Num n={count((o) => o === "no_decision")} /></td>
                    <td className={cn(td, "text-right tabular-nums")}>
                      {!p ? <span className="text-muted-foreground/70">n/a (samples)</span>
                        : p.complete ? `${p.consistent}/${p.complete}` : <span className="text-muted-foreground/70">none complete</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">
            <code className="text-sm">{model}</code>
            <span className="ml-2 font-normal text-muted-foreground">{KIND_LABEL[mine[0]?.meta.agent_kind] ?? ""}</span>
          </h2>
          <FilterSelect label="Agent" name="model" value={model} params={params} options={models.map((m) => ({ value: m, label: m }))} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Category × domain. Select a cell to filter the runs below.</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b bg-muted/40">
                  <tr><th className={cn(th, "w-40")}>category</th>{DOMAINS.map((d) => <th key={d} className={th}>{d}</th>)}</tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.category} className="border-b last:border-0">
                      <td className={cn(td, "font-mono text-xs text-muted-foreground")}>{row.category}</td>
                      {row.cells.map((c) => {
                        const active = cat === row.category && dom === c.domain;
                        return (
                          <td key={c.domain} className={cn("border-l p-0", active && "bg-primary/5 ring-2 ring-inset ring-primary")}>
                            {c.runs.length ? (
                              <Link href={active ? href({ cat: undefined, dom: undefined }) : href({ cat: row.category, dom: c.domain })}
                                className="block px-3 py-2 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                                <Outcomes cell={c} />
                              </Link>
                            ) : <div className="px-3 py-2"><Outcomes cell={c} /></div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Stakes tier</h3>
            <div className="rounded-lg border">
              {stakes.map((s) => (
                <div key={s.tier} className="flex items-start gap-3 border-b px-3 py-2 last:border-0">
                  <span className="w-12 shrink-0 text-sm tabular-nums">tier {s.tier}</span>
                  <div className="flex-1"><Outcomes cell={s} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-base font-semibold">Runs</h2>
          <span className="text-sm text-muted-foreground">
            {listed.length} for <code className="text-xs">{model}</code>{cat && <> in {cat} × {dom}</>}, including superseded reruns
          </span>
          {cat && <Link href={href({ cat: undefined, dom: undefined })} className="text-sm underline underline-offset-4">clear filter</Link>}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className={th}>task</th><th className={th}>started (UTC)</th><th className={th}>declared</th>
                <th className={th}>termination</th><th className={th}>outcome · {version}</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((r) => {
                const v = verdictFor(r, version);
                const t = tasks.get(r.meta.task_id);
                const last = r.trajectory.at(-1);
                return (
                  <tr key={r.meta.run_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className={td}>
                      <Link href={`/runs/${r.meta.run_id}`} title={r.meta.run_id} className="font-mono text-xs font-medium hover:underline">{r.meta.task_id}</Link>
                      <div className="text-xs text-muted-foreground">{t?.category} · {t?.domain} · tier {t?.stakes_tier} · expects {t?.correct_action}</div>
                    </td>
                    <td className={cn(td, "font-mono text-xs tabular-nums text-muted-foreground")}>{r.meta.started_at.replace("T", " ").slice(0, 19)}</td>
                    <td className={cn(td, "font-mono text-xs")}>{last?.type === "terminal" ? last.declared_action : "—"}</td>
                    <td className={cn(td, "text-xs")}>{r.meta.termination}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {v ? <OutcomeBadge outcome={v.outcome} /> : <span className="text-xs text-muted-foreground">ungraded</span>}
                        {!r.intact && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] text-red-900">trace modified</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
