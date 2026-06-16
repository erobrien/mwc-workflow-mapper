import { PageShell } from "../components/Shell";
import { Card, CardContent, Tabs, TabPanel, Badge, Loading } from "../components/ui";
import { useData, type FieldDestination } from "../lib/data";

const OBJECT_TONE: Record<string, "good" | "blue" | "warning" | "muted"> = {
  Contact: "blue",
  Opportunity: "good",
  "External EMR": "warning",
  Retire: "muted",
};

function DestCard({ d }: { d: FieldDestination }) {
  const short = d.target.split(" ")[0];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge tone={OBJECT_TONE[d.target] ?? "muted"}>{d.target}</Badge>
          <span className="text-xs text-muted-foreground">{d.card}</span>
        </div>
        <div className="mb-2 text-sm font-medium">{d.role}</div>
        <p className="mb-3 text-xs text-muted-foreground">{d.examples}</p>
        {d.removing && d.removing.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">Removing from Contact ({d.removing.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.removing.map((r) => <span key={r.key} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{r.label} → {r.to}</span>)}
            </div>
          </div>
        )}
        {d.adding && d.adding.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Adding to {short} ({d.adding.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.adding.map((a) => <span key={a.key} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{a.label}{a.note ? ` · ${a.note}` : ""}</span>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ToBe() {
  const { data, isLoading } = useData();
  if (isLoading || !data) return <Loading />;

  return (
    <PageShell
      title="To-be: target architecture"
      subtitle={`${data.tobe_workflows.length} single-purpose workflows, ${data.pipelines.length} pipelines, and a field model that puts each datum on the object that owns it.`}
    >
      <Tabs tabs={[
        { value: "wf", label: `Workflows (${data.tobe_workflows.length})` },
        { value: "pipes", label: `Pipelines (${data.pipelines.length})` },
        { value: "model", label: "Data model" },
      ]}>
        <TabPanel value="wf" className="grid gap-3 md:grid-cols-2">
          {data.tobe_workflows.map((w) => (
            <Card key={w.n}><CardContent className="p-4">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{w.n}</span>
                <span className="font-semibold">{w.name}</span>
              </div>
              {w.copy && <p className="mb-2 text-sm text-foreground/90">{w.copy}</p>}
              {w.absorbs && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Absorbs</div>
                  <div className="text-[12px] text-muted-foreground">{w.absorbs}</div>
                </div>
              )}
            </CardContent></Card>
          ))}
        </TabPanel>

        <TabPanel value="pipes" className="space-y-3">
          {data.pipelines.map((p, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1 font-semibold">{p.name}</div>
              {p.role && <p className="mb-2 text-xs text-muted-foreground">{p.role}</p>}
              {p.stages && (
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  {p.stages.map((s, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <Badge tone="good">{s}</Badge>{j < p.stages!.length - 1 && <span className="text-muted-foreground">→</span>}
                    </span>
                  ))}
                </div>
              )}
              {p.exits && p.exits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exits:</span>
                  {p.exits.map((e, j) => <Badge key={j} tone="muted">{e}</Badge>)}
                </div>
              )}
            </CardContent></Card>
          ))}
        </TabPanel>

        <TabPanel value="model" className="space-y-4">
          <Card><CardContent className="p-4 text-sm leading-relaxed text-foreground/90">
            <b>Four destinations, each owning its own data.</b> The Contact holds identity and durable profile — including the lead's attribution and consent state. The Opportunity owns the sale outcome and money, and carries a copy of the attribution that drove the deal so revenue rolls up per sale. Medical records stay in the external EMR (GHL keeps only an <code>emr_visit_id</code> and visit date). Never-used fields retire. <b>No custom objects</b> — attribution is fields + <code>source_*</code> tags, and consent is GHL-native DND/STOP plus the Compliance workflow.
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {data.field_destinations.map((d, i) => <DestCard key={i} d={d} />)}
          </div>
        </TabPanel>
      </Tabs>
    </PageShell>
  );
}
