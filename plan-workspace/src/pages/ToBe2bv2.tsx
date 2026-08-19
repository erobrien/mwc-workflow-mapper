import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { Link } from "react-router-dom";
import { ChevronRight, Network } from "lucide-react";

interface WF2bv2 {
  n: string;
  name: string;
  id: string;
  status: string;
  version: number;
  steps: number;
  step_types: string[];
  absorbs: string;
  copy: string;
}

interface Data2bv2 {
  generated_at: string;
  location_id: string;
  source: string;
  workflows: WF2bv2[];
}

function WFBadge({ type }: { type: string }) {
  const tone: Record<string, "good" | "blue" | "warning" | "muted" | "accent"> = {
    sms: "good",
    email: "blue",
    custom_code: "accent",
    wait: "warning",
    add_contact_tag: "muted",
    remove_contact_tag: "muted",
    add_to_workflow: "muted",
    remove_from_workflow: "muted",
    update_contact_field: "muted",
    internal_notification: "muted",
  };
  return <Badge tone={tone[type] ?? "muted"}>{type}</Badge>;
}

export default function ToBe2bv2() {
  const [data, setData] = useState<Data2bv2 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/2bv2-data.json")
      .then((r) => r.json())
      .then((d: Data2bv2) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Loading />;

  return (
    <PageShell
      title="To-Be v2 (2bv2): Live Workflow Export"
      subtitle={`${data.workflows.length} workflows from location ${data.location_id} · exported ${data.generated_at} · source: ${data.source}`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {data.workflows.map((w) => (
          <Card key={w.id} className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardContent className="p-4">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">WF-{w.n}</span>
                  <span className="font-semibold">{w.name}</span>
                </div>
                <Badge tone={w.status === "published" ? "good" : "warning"}>{w.status}</Badge>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{w.copy}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">v{w.version}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{w.steps} steps</span>
                <span className="text-muted-foreground">·</span>
                {w.step_types.map((t) => <WFBadge key={t} type={t} />)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">Absorbs:</span> {w.absorbs}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Link
                  to={`/workflow/${w.id}`}
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
                >
                  <Network className="h-3 w-3" /> View in GHL
                </Link>
                <a
                  href={`https://github.com/mwcforme/mwc-workflow-mapper/tree/main/ghl_workflows_export`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <ChevronRight className="h-3 w-3" /> JSON
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
