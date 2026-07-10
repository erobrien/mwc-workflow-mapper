import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { RoutedTabs, RoutedTabPanel } from "../components/RoutedTabs";
import { useData, type FieldDestination } from "../lib/data";
import { ghlPipelines } from "../lib/ghl";
import { ExternalLink } from "lucide-react";

const NUMBERING_CROSSWALK: { old: string; canonical: string; note: string }[] = [
  { old: "WF-01 Lead Capture", canonical: "WF-01 Lead Capture and Attribution", note: "unchanged" },
  { old: "WF-02 Non-Booked Recovery", canonical: "WF-02 Non-Booked Recovery", note: "unchanged" },
  { old: "WF-03 Booking Confirmation", canonical: "WF-03 Booking Confirmation and Reminders", note: "merged with reminders" },
  { old: "WF-04 Confirmation Chase", canonical: "WF-04 Medical Intake Chase", note: "renamed; owns all intake chasing" },
  { old: "WF-05 Appointment Reminders", canonical: "WF-03 Reminder Sends", note: "absorbed into WF-03" },
  { old: "WF-06 No-Show Recovery", canonical: "WF-08 No-Show and Cancel Recovery", note: "renumbered" },
  { old: "WF-07 Post-Visit Sold", canonical: "WF-06 Post-Visit Won", note: "renumbered" },
  { old: "WF-08 A&D (Advised and Declined)", canonical: "WF-07 No-Sale Nurture", note: "renumbered" },
  { old: "WF-09 Renewal Reminders", canonical: "WF-09 Renewal Reminders (sub-flow)", note: "now a labeled sub-flow of WF-09" },
  { old: "WF-10 Long-Term Nurture", canonical: "WF-09 Long-Term Nurture (main)", note: "merged into WF-09" },
  { old: "WF-11 Missed Call Text-Back", canonical: "WF-16 Comms Edge", note: "renumbered" },
  { old: "WF-12 Review and Referral", canonical: "WF-06 (review) + WF-14 (referral)", note: "split by purpose" },
];

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
      title="To-be: the rebuild target"
      subtitle={`Tear down ${data.as_is_workflows.length} workflows into ${data.tobe_workflows.length} single-purpose owners and 18 pipelines into ${data.pipelines.length}, with a field model that puts each datum on the object that owns it.`}
    >
      <RoutedTabs base="/to-be" tabs={[
        { value: "workflows", label: `Workflows (${data.tobe_workflows.length})` },
        { value: "pipelines", label: `Pipelines (${data.pipelines.length})` },
        { value: "data-model", label: "Data model" },
      ]}>
        <RoutedTabPanel value="workflows" className="space-y-3">
          <Card><CardContent className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Canonical numbering (WF-01 to WF-16)</div>
                <p className="text-xs text-muted-foreground">The workflow list and master diagram are the canonical scheme. The message library and every diagram are renumbered to match. Step-by-step flows for all 16 owners are on the diagrams page.</p>
              </div>
              <Link to="/wf-diagrams" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
                See to-be workflow diagrams
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pe-3 font-semibold">Old library number</th>
                    <th className="py-1.5 pe-3 font-semibold">Canonical</th>
                    <th className="py-1.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {NUMBERING_CROSSWALK.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pe-3 font-mono text-muted-foreground">{row.old}</td>
                      <td className="py-1.5 pe-3 font-mono">{row.canonical}</td>
                      <td className="py-1.5 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
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
          </div>
        </RoutedTabPanel>

        <RoutedTabPanel value="pipelines" className="space-y-3">
          {data.pipelines.map((p, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <a href={ghlPipelines(data.location_id)} target="_blank" rel="noopener noreferrer"
                  title="Open pipelines in GHL" className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> GHL
                </a>
              </div>
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
        </RoutedTabPanel>

        <RoutedTabPanel value="data-model" className="space-y-4">
          <Card><CardContent className="p-4 text-sm leading-relaxed text-foreground/90">
            <b>Four destinations, each owning its own data.</b> The Contact holds identity and durable profile — including the lead's attribution and consent state. The Opportunity owns the sale outcome and money, and carries a copy of the attribution that drove the deal so revenue rolls up per sale. Medical records stay in the external EMR (GHL keeps only an <code>emr_visit_id</code> and visit date). Never-used fields retire. <b>No custom objects</b> — attribution is fields + <code>source_*</code> tags, and consent is GHL-native DND/STOP plus the Compliance workflow.
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {data.field_destinations.map((d, i) => <DestCard key={i} d={d} />)}
          </div>
        </RoutedTabPanel>
      </RoutedTabs>
    </PageShell>
  );
}
