import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Stat, Loading } from "../components/ui";
import { useCodyNeoDetail, type AsisWorkflow } from "../lib/asis";
// Cody Neo: corrected copy of the Cody build — outcome data on the Opportunity.
import { MessageSquare, Mail, Zap, GitBranch, Clock, ArrowRightLeft, Target, MapPin } from "lucide-react";

function count(w: AsisWorkflow, ...kinds: string[]) {
  return kinds.reduce((s, k) => s + (w.step_counts[k] || 0), 0);
}

function WorkflowRow({ w }: { w: AsisWorkflow }) {
  const decisions = count(w, "decision");
  const waits = count(w, "wait");
  const gotos = count(w, "goto");
  const opps = count(w, "opportunity");
  return (
    <Link to={`/cody-neo/workflow/${w.id}`}
      className="flex flex-col gap-1.5 rounded-md border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{w.name}</span>
        <Badge tone={w.status === "published" ? "good" : "muted"}>{w.status}</Badge>
        {w.location && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{w.location}</span>}
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{w.n_steps} steps</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {w.triggers.length > 0 && <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />{w.triggers.length} trigger{w.triggers.length > 1 ? "s" : ""}</span>}
        {w.sms > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{w.sms} SMS</span>}
        {w.email > 0 && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{w.email} email</span>}
        {decisions > 0 && <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" />{decisions} branch{decisions > 1 ? "es" : ""}</span>}
        {waits > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{waits} wait{waits > 1 ? "s" : ""}</span>}
        {gotos > 0 && <span className="inline-flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" />{gotos} goto</span>}
        {opps > 0 && <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{opps} opp</span>}
      </div>
    </Link>
  );
}

export default function CodyNeo() {
  const { data, isLoading } = useCodyNeoDetail();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [folder, setFolder] = useState<string>("all");

  const filtered = useMemo(() => {
    const all = data?.workflows ?? [];
    const t = q.trim().toLowerCase();
    return all.filter((w) => {
      if (status === "published" && w.status !== "published") return false;
      if (status === "draft" && w.status === "published") return false;
      if (folder !== "all" && w.folder !== folder) return false;
      if (t && !(w.name.toLowerCase().includes(t) ||
        w.triggers.some((x) => x.name.toLowerCase().includes(t)))) return false;
      return true;
    });
  }, [data, q, status, folder]);

  const byFolder = useMemo(() => {
    const m = new Map<string, AsisWorkflow[]>();
    for (const w of filtered) (m.get(w.folder) ?? m.set(w.folder, []).get(w.folder)!).push(w);
    return m;
  }, [filtered]);

  if (isLoading || !data) return <Loading />;
  const c = data.coverage;
  const folderNames = data.folders.map((f) => f.name).filter((f) => byFolder.has(f));

  // per-location clone estimate: names that repeat across Richmond / VA Beach / Newport News
  const cloneBase = new Map<string, number>();
  for (const w of data.workflows) {
    const base = w.name.replace(/richmond|virginia beach|va beach|newport news/gi, "•").trim();
    cloneBase.set(base, (cloneBase.get(base) ?? 0) + 1);
  }
  const cloned = [...cloneBase.values()].filter((n) => n >= 3).length;

  return (
    <PageShell
      title="Cody Neo build — workflows"
      subtitle={`All ${c.total} workflows in the corrected copy of the Cody build (${data.location_id}), extracted live via the backend API after the field-architecture pass — per-deal data moved to the Opportunity, enum codes normalized, outcome and attribution stamps spliced into the routers and lead workflows.`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Workflows" value={c.total} note={`${c.published} published · ${c.draft} draft`} />
        <Stat label="Full step detail" value={c.with_steps} note={`of ${c.total} — complete graph`} tone="good" />
        <Stat label="Total steps" value={c.total_steps} note="across all workflows" />
        <Stat label="Triggers" value={c.total_triggers} tone="blue" />
        <Stat label="SMS steps" value={c.total_sms} tone="good" />
        <Stat label="Email steps" value={c.total_email} tone="good" />
        <Stat label="Cloned ×3" value={cloned} note="responsibilities duplicated per clinic" tone="red" />
      </div>

      <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
        This is the <b className="text-foreground">corrected copy</b> of the Cody build (per-clinic pattern retained by decision). Applied so far: 29 opportunity custom fields including <b className="text-foreground">provider</b>, appt_status, lead_source, outcome_processed_at and referred_by; sale_outcome recreated as single-select with codes (sold / nosale / mut / mar); all enum options normalized to codes; 17 per-deal contact fields parked in a deprecated folder; the three PCC Disposition Routers now stamp outcome, PCC, provider and timestamps onto the <b className="text-foreground">Opportunity</b>; the three Lead Notification workflows stamp frozen attribution at opportunity create. All changes are drafts.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or trigger…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select value={folder} onChange={(e) => setFolder(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All folders</option>
          {data.folders.map((f) => <option key={f.name} value={f.name}>{f.name} ({f.count})</option>)}
        </select>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="space-y-6">
        {folderNames.map((f) => {
          const items = byFolder.get(f)!;
          return (
            <section key={f}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{f}</h2>
                <Badge tone="muted">{items.length}</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((w) => <WorkflowRow key={w.id} w={w} />)}
              </div>
            </section>
          );
        })}
        {folderNames.length === 0 && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">No workflows match these filters.</div>
        )}
      </div>
    </PageShell>
  );
}
