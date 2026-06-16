import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, toneFor } from "../components/ui";
import { useData } from "../lib/data";

export default function Risks() {
  const { data, isLoading } = useData();
  if (isLoading || !data) return <Loading />;
  const order = ["Critical", "High", "Medium", "Low"];
  const sorted = [...data.risks].sort((a, b) => order.indexOf(a.sev) - order.indexOf(b.sev));
  const crit = data.risks.filter((r) => r.sev === "Critical").length;
  return (
    <PageShell
      title="Risk register"
      subtitle={`${data.risks.length} tracked risks · ${crit} Critical. Each carries a concrete mitigation that gates execution.`}
    >
      <div className="space-y-3">
        {sorted.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{r.id}</span>
                <Badge tone={toneFor(r.sev)}>{r.sev}</Badge>
                <span className="font-semibold">{r.area}</span>
              </div>
              <div className="text-sm text-foreground/90">
                <span className="font-medium text-muted-foreground">Mitigation: </span>{r.mitigation}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
