import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Stat, Loading, toneFor } from "../components/ui";
import { useData } from "../lib/data";

export default function AsIs() {
  const { data, isLoading } = useData();
  if (isLoading || !data) return <Loading />;
  const k = data.kpis;
  const top = [...data.as_is_workflows]
    .filter((w) => w.status === "published")
    .sort((a, b) => (b.steps ?? 0) - (a.steps ?? 0))
    .slice(0, 10);
  const maxStep = top[0]?.steps ?? 1;
  const breakdown = data.triggers_summary.type_breakdown;
  const maxTrig = Math.max(...breakdown.map(([, n]) => n), 1);

  return (
    <PageShell
      title="As-is: current state"
      subtitle="Captured directly from the GHL API. This is what the account looks like today, before any change."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Published workflows" value={k.workflows_published} note={`${k.workflows_drafts} drafts out of scope`} />
        <Stat label="Pipelines" value={k.pipelines_now} note={`target ${k.pipelines_target}`} tone="warning" />
        <Stat label="Custom fields" value={k.fields_total} note={`${k.fields_on_contact} on Contact`} tone="warning" />
        <Stat label="A&D false wins" value={k.ad_false_wins.toLocaleString()} note={`${k.wins_with_zero_value_pct}% of wins are $0`} tone="red" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Heaviest published workflows (by step count)</h2>
        <Card><CardContent className="p-0">
          <Table>
            <thead><tr><TH>Workflow</TH><TH className="text-right">Steps</TH><TH className="w-1/3">Weight</TH></tr></thead>
            <tbody>
              {top.map((w) => (
                <tr key={w.id} className="hover:bg-muted/40">
                  <TD className="font-medium">{w.name}</TD>
                  <TD className="text-right tabular-nums">{w.steps ?? 0}</TD>
                  <TD><div className="h-2 rounded-full bg-primary/80" style={{ width: `${Math.max(4, ((w.steps ?? 0) / maxStep) * 100)}%` }} /></TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent></Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Critical defects</h2>
        <Card><CardContent className="p-0">
          <Table>
            <thead><tr><TH>ID</TH><TH>Defect</TH><TH>Severity</TH><TH>Evidence</TH></tr></thead>
            <tbody>
              {data.defects.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <TD className="font-mono text-xs">{d.id}</TD>
                  <TD className="font-medium">{d.title}<div className="text-xs font-normal text-muted-foreground">{d.impact}</div></TD>
                  <TD><Badge tone={toneFor(d.severity)}>{d.severity}</Badge></TD>
                  <TD className="text-xs text-muted-foreground">{d.evidence}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent></Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent>
          <h2 className="mb-2 text-sm font-semibold">Field distribution</h2>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Total custom fields</span><b className="tabular-nums">{k.fields_total}</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">On Contact</span><b className="tabular-nums">{k.fields_on_contact}</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">On Opportunity (now → target)</span><b className="tabular-nums">{k.fields_on_opportunity_now} → {k.fields_on_opportunity_target}</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Never populated</span><b className="tabular-nums text-amber-600">{k.fields_never_populated}</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Rarely used</span><b className="tabular-nums text-amber-600">{k.fields_rare}</b></li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Scanned {k.contacts_scanned.toLocaleString()} contacts and {k.opportunities_scanned.toLocaleString()} opportunities.</p>
        </CardContent></Card>

        <Card><CardContent>
          <h2 className="mb-2 text-sm font-semibold">Trigger types in use</h2>
          <p className="mb-2 text-xs text-muted-foreground">{data.triggers_summary.total_trigger_records} trigger records across {data.triggers_summary.active_workflows_with_triggers} active workflows.</p>
          <div className="space-y-1">
            {breakdown.map(([name, n]) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-muted-foreground">{name}</span>
                <div className="h-2 rounded-full bg-primary/70" style={{ width: `${(n / maxTrig) * 100}%` }} />
                <span className="tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </div>
    </PageShell>
  );
}
