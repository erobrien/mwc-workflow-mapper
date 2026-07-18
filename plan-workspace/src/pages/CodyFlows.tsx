import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { useCodyFlows, type AsisFlow } from "../lib/asis";
import { ghlWorkflow } from "../lib/ghl";
import { ChevronDown, ChevronRight, ExternalLink, Maximize2 } from "lucide-react";

// Large graphs stay collapsed until opened so the page paints instantly.
const AUTO_OPEN_MAX = 40;

function FlowCard({ f, loc, forceOpen }: { f: AsisFlow; loc: string; forceOpen: boolean | null }) {
  const [openState, setOpenState] = useState<boolean | null>(null);
  const open = openState ?? forceOpen ?? f.n_steps <= AUTO_OPEN_MAX;

  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={() => setOpenState(!open)}
          className="flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-muted/40"
        >
          {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{f.name}</span>
              <Badge tone={f.status === "published" ? "good" : "muted"}>{f.status}</Badge>
              {f.n_steps > AUTO_OPEN_MAX && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <Maximize2 className="h-3 w-3" />large graph
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{f.desc}</div>
          </div>
        </button>

        {open && (
          <div className="border-t p-3">
            <MermaidChart src={f.src} active={open} />
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <Link to={`/cody/workflow/${f.id}`} className="text-muted-foreground hover:text-foreground">
                Open full step detail →
              </Link>
              <a href={ghlWorkflow(loc, f.id)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                GHL builder <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CodyFlows() {
  const { data, isLoading } = useCodyFlows();
  const [q, setQ] = useState("");
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  const [bump, setBump] = useState(0);

  const flows = data?.flows ?? [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return flows;
    return flows.filter((f) => f.name.toLowerCase().includes(t) || f.folder.toLowerCase().includes(t));
  }, [flows, q]);

  const byFolder = useMemo(() => {
    const m = new Map<string, AsisFlow[]>();
    for (const f of filtered) (m.get(f.folder) ?? m.set(f.folder, []).get(f.folder)!).push(f);
    return m;
  }, [filtered]);

  if (isLoading || !data) return <Loading />;
  const folderNames = data.folders.map((f) => f.name).filter((f) => byFolder.has(f));

  return (
    <PageShell
      title="Cody build — flow diagrams"
      subtitle={`One full-fidelity flowchart per workflow in the Cavenaugh build sub-account (${data.location_id}) — real triggers, ordered steps, if/else branches with their live condition labels, waits, gotos, and message steps. Nothing summarised or depth-capped.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or folder…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={() => { setForceOpen(true); setBump((b) => b + 1); }}
          className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">Expand all</button>
        <button onClick={() => { setForceOpen(false); setBump((b) => b + 1); }}
          className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">Collapse all</button>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{filtered.length} of {flows.length}</span>
      </div>

      <div className="space-y-6">
        {folderNames.map((fn) => (
          <section key={fn}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold">{fn}</h2>
              <Badge tone="muted">{byFolder.get(fn)!.length}</Badge>
            </div>
            <div className="space-y-3">
              {byFolder.get(fn)!.map((f) => (
                <FlowCard key={`${f.key}-${bump}`} f={f} loc={data.location_id} forceOpen={forceOpen} />
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">No flows match this search.</div>
        )}
      </div>
    </PageShell>
  );
}
