import { useState, useEffect } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";

const CK_KEY = "mwc-telemed-checklist-v1";

export default function TelemedPlan() {
  const { data, isLoading } = useTelemed();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(CK_KEY) ?? "{}")); } catch { /* noop */ }
  }, []);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      localStorage.setItem(CK_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (isLoading || !data) return <Loading />;
  const bp = data.build_plan;
  const done = bp.checklist.filter((_, i) => checked[i]).length;
  const pct = Math.round((done / bp.checklist.length) * 100);

  return (
    <PageShell
      title="Build plan & launch checklist"
      subtitle={`Two-week timeline running in parallel with the in-person rebuild. ${bp.estimate}`}
      actions={<Badge tone={pct === 100 ? "good" : "neutral"}>{done}/{bp.checklist.length} ready</Badge>}
    >
      {/* Timeline */}
      {bp.weeks.map((w) => (
        <section key={w.week}>
          <h2 className="mb-2 text-base font-semibold">{w.week}</h2>
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">Day</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Owner</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task</th>
              </tr></thead>
              <tbody>
                {w.rows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-1.5 font-medium">{r.day}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.owner}</td>
                    <td className="px-3 py-1.5">{r.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></CardContent></Card>
        </section>
      ))}

      {/* Checklist */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pre-launch checklist</h2>
          <span className="text-xs text-muted-foreground">{pct}% complete · saved to browser</span>
        </div>
        <div className="mb-3 h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Card><CardContent className="p-2">
          {bp.checklist.map((c, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
              <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
              <span className={`text-sm ${checked[i] ? "text-muted-foreground line-through" : ""}`}>{c}</span>
            </label>
          ))}
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
