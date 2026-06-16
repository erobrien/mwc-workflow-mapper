import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, toneFor } from "../components/ui";
import { useData } from "../lib/data";

export default function Decisions() {
  const { data, isLoading } = useData();
  if (isLoading || !data) return <Loading />;
  const open = data.decisions.filter((d) => d.status === "Open").length;
  const locked = data.decisions.filter((d) => d.status === "Locked").length;
  return (
    <PageShell
      title="Decision log"
      subtitle={`${locked} locked · ${open} open. Locked decisions are the contract the build follows; open ones block dependent steps.`}
    >
      <div className="space-y-3">
        {data.decisions.map((d) => (
          <Card key={d.n}>
            <CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">#{d.n}</span>
                <span className="font-semibold">{d.decision}</span>
                <span className="ms-auto flex items-center gap-2">
                  {d.date && <span className="text-xs text-muted-foreground">{d.date}</span>}
                  <Badge tone={toneFor(d.status)}>{d.status}</Badge>
                </span>
              </div>
              <div className="text-sm text-foreground/90">{d.choice}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
