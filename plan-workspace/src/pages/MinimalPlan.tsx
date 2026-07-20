import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { Target, Ban, GitBranch, ChevronRight } from "lucide-react";

interface Step { n: string; title: string; detail: string; }
interface Table { headers: string[]; rows: string[][]; }
interface Phase { id: string; title: string; time: string; objective: string; steps?: Step[]; table?: Table; }
interface Plan {
  updated_at: string; status: string; goals: string[]; non_goals: string[];
  core_mechanism: string; phases: Phase[];
}

function DataTable({ t }: { t: Table }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/60">
          <tr>{t.headers.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "font-mono font-medium whitespace-nowrap" : "text-foreground/90"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MinimalPlan() {
  const [p, setP] = useState<Plan | null>(null);
  useEffect(() => { fetch("/minimal-plan.json").then((x) => x.json()).then(setP).catch(() => setP(null)); }, []);
  if (!p) return <Loading />;

  return (
    <PageShell
      title="Minimal Plan — Attribution + Disposition"
      subtitle={`Updated ${p.updated_at} · ${p.status}`}
    >
      <Card className="mb-6 border-l-4 border-l-violet-600">
        <CardContent className="p-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <GitBranch className="h-4 w-4 text-violet-600" /> Core mechanism: dual-write
          </div>
          <p className="text-sm text-foreground/90">{p.core_mechanism}</p>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-emerald-600" /> Goals
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {p.goals.map((g, i) => <li key={i} className="flex gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{g}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Ban className="h-4 w-4 text-rose-600" /> Explicitly not doing
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {p.non_goals.map((g, i) => <li key={i} className="flex gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />{g}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {p.phases.map((ph) => (
          <Card key={ph.id}>
            <CardContent className="p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{ph.id}</Badge>
                <span className="font-semibold">{ph.title.replace(/^Phase \d+ - /, "")}</span>
                <span className="ms-auto text-xs text-muted-foreground">{ph.time}</span>
              </div>
              <p className="text-sm text-muted-foreground">{ph.objective}</p>
              {ph.table && <DataTable t={ph.table} />}
              {ph.steps && (
                <div className="mt-3 space-y-2.5">
                  {ph.steps.map((s) => (
                    <div key={s.n} className="rounded-md border bg-muted/20 p-3">
                      <div className="mb-1 text-sm font-semibold">
                        <span className="mr-2 font-mono text-xs text-violet-600 dark:text-violet-400">{s.n}</span>{s.title}
                      </div>
                      <p className="text-sm text-foreground/90">{s.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
