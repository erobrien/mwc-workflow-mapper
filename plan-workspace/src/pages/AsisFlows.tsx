import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Stat, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { useAsisFlows, type AsisFlow } from "../lib/asis";
import { ghlWorkflow } from "../lib/ghl";
import { ChevronDown, ChevronRight, ExternalLink, Maximize2 } from "lucide-react";

const FOLDER_ORDER = [
  "01. WP Lead Capture", "02. Appointments & Visit Journey",
  "03. Call Routing & Dispositions", "04. System Admin & Error Handling",
  "AI Call (new, drafts, added 2026-07-21)", "PCC", "Vercel",
  "Affiliate Marketing (live, outside Active Workflows)",
  "Paid Marketing Attribution (live, outside Active Workflows)",
  "Social Call (live, outside Active Workflows)",
];

// Large graphs (the 202-step lead-capture flows, 100+ step post-visit) stay
// collapsed until the user opens them, so the page paints instantly.
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
              <Link to={`/workflow/${f.id}`} className="text-muted-foreground hover:text-foreground">
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

export default function AsisFlows() {
  const { data, isLoading } = useAsisFlows();
  const [q, setQ] = useState("");
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  // bump forces the FlowCard local state to reset when we expand/collapse all
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
  const folderNames = FOLDER_ORDER.filter((f) => byFolder.has(f));
  const totalSteps = flows.reduce((s, f) => s + f.n_steps, 0);
  const totalSms = flows.reduce((s, f) => s + f.n_sms, 0);
  const totalEmail = flows.reduce((s, f) => s + f.n_email, 0);
  const totalBranches = flows.reduce((s, f) => s + f.n_branches, 0);

  return (
    <PageShell
      title="As-Is Workflow Flows — live re-map (2026-07-22)"
      subtitle="A Mermaid flowchart for every one of the 45 workflows in the 2026-07-22 live re-map (the Active Workflows tree plus published, live-firing workflows outside it) — one diagram per workflow, generated directly from the extracted GHL step graph. Entry triggers, ordered steps, real wait durations, if/else branches with their live condition labels, gotos, labelled SMS/email, tag ops and opportunity moves, all 100% faithful to the current configuration. Large graphs render on demand."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Workflows" value={flows.length} note="one diagram each" />
        <Stat label="Total steps" value={totalSteps} tone="good" />
        <Stat label="Branches" value={totalBranches} tone="blue" />
        <Stat label="SMS steps" value={totalSms} tone="good" />
        <Stat label="Email steps" value={totalEmail} tone="good" />
        <Stat label="Folders" value={folderNames.length} tone="muted" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflow or folder…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={() => { setForceOpen(true); setBump((b) => b + 1); }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Expand all</button>
        <button onClick={() => { setForceOpen(false); setBump((b) => b + 1); }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Collapse all</button>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="space-y-8">
        {folderNames.map((folder) => (
          <section key={folder}>
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="red">As-Is · today</Badge>
              <h2 className="text-base font-semibold">{folder}</h2>
              <Badge tone="muted">{byFolder.get(folder)!.length}</Badge>
            </div>
            <div className="space-y-3">
              {byFolder.get(folder)!.map((f) => (
                <FlowCard key={`${f.id}-${bump}`} f={f} loc={data.location_id} forceOpen={forceOpen} />
              ))}
            </div>
          </section>
        ))}
        {folderNames.length === 0 && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">No workflows match this search.</div>
        )}
      </div>
    </PageShell>
  );
}
