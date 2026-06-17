import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, toneFor } from "../components/ui";

interface Finding { id: string; severity: string; area: string; evidence: string; recommendation: string; status: string; }
interface Gaps {
  crawled_at: string; method: string;
  live_counts: Record<string, number>;
  findings: Finding[];
}

const COUNT_LABELS: Record<string, string> = {
  contacts: "Contacts", opportunities: "Opportunities", custom_fields: "Custom fields",
  custom_fields_on_opportunity: "Fields on Opportunity", tags: "Tags", pipelines: "Pipelines",
  workflows: "Workflows", forms: "Forms", surveys: "Surveys", users: "Users", admins: "Admins",
  custom_objects: "Custom objects", custom_values_in_use: "Custom values used",
  saved_templates: "Saved templates", trigger_links: "Trigger links", funnels: "Funnels", products: "Products",
};

export default function Gaps() {
  const [g, setG] = useState<Gaps | null>(null);
  useEffect(() => { fetch("/gaps.json").then((r) => r.json()).then(setG).catch(() => setG(null)); }, []);
  if (!g) return <Loading />;
  const order = ["Critical", "High", "Medium", "Low"];
  const sorted = [...g.findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const crit = g.findings.filter((f) => f.severity === "Critical").length;

  return (
    <PageShell
      title="Audit gaps"
      subtitle={`Live GHL crawl on ${g.crawled_at}: ${g.findings.length} findings (${crit} Critical). ${g.method}`}
    >
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Live account counts</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(g.live_counts).map(([k, v]) => (
            <div key={k} className="rounded-md border bg-card px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{COUNT_LABELS[k] ?? k}</div>
              <div className={`text-lg font-semibold tabular-nums ${k === "custom_fields_on_opportunity" && v === 0 ? "text-destructive" : ""}`}>{v.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {sorted.map((f) => (
          <Card key={f.id} className={f.severity === "Critical" ? "border-l-4 border-l-destructive" : ""}>
            <CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{f.id}</span>
                <Badge tone={toneFor(f.severity)}>{f.severity}</Badge>
                <span className="font-semibold">{f.area}</span>
                <span className="ms-auto"><Badge tone={toneFor(f.status)}>{f.status}</Badge></span>
              </div>
              <p className="text-sm text-foreground/90"><span className="font-medium text-muted-foreground">Evidence: </span>{f.evidence}</p>
              <p className="mt-1.5 text-sm text-foreground/90"><span className="font-medium text-emerald-700 dark:text-emerald-400">Fix: </span>{f.recommendation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
