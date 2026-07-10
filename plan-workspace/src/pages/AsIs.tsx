import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Stat, Loading } from "../components/ui";
import { useAsisDetail, type AsisWorkflow, type Coverage } from "../lib/asis";
import { MessageSquare, Zap, Tag as TagIcon, MapPin } from "lucide-react";

const FOLDER_ORDER = [
  "01. WP Lead Capture", "02. Appointments & Visit Journey",
  "03. Call Routing & Dispositions", "04. System Admin & Error Handling",
  "Uncategorized",
];

const COVERAGE_LABEL: Record<Coverage, string> = {
  messages: "Message detail",
  triggers: "Triggers only",
  metadata: "Structure only",
};
const COVERAGE_TONE: Record<Coverage, "good" | "blue" | "muted"> = {
  messages: "good", triggers: "blue", metadata: "muted",
};

function WorkflowRow({ w }: { w: AsisWorkflow }) {
  const tags = [...w.tags_added, ...w.tags_removed];
  return (
    <Link to={`/workflow/${w.id}`}
      className="flex flex-col gap-1.5 rounded-md border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{w.name}</span>
        <Badge tone={w.status === "published" ? "good" : "muted"}>{w.status}</Badge>
        <Badge tone={COVERAGE_TONE[w.coverage]}>{COVERAGE_LABEL[w.coverage]}</Badge>
        {w.location && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{w.location}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {w.triggers.length > 0 && <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />{w.triggers.length} trigger{w.triggers.length > 1 ? "s" : ""}</span>}
        {w.messages.length > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{w.messages.length} msg ({w.msg_sms} SMS · {w.msg_email} email)</span>}
        {tags.length > 0 && <span className="inline-flex items-center gap-1"><TagIcon className="h-3 w-3" />{tags.length} tag ref{tags.length > 1 ? "s" : ""}</span>}
        {w.disposition && <span>→ {w.disposition}{w.target_nn ? ` ${w.target_nn}` : ""}</span>}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 6).map((t) => <Badge key={t} tone="muted">{t}</Badge>)}
          {tags.length > 6 && <Badge tone="muted">+{tags.length - 6}</Badge>}
        </div>
      )}
    </Link>
  );
}

export default function AsIs() {
  const { data, isLoading } = useAsisDetail();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [folder, setFolder] = useState<string>("all");
  const [group, setGroup] = useState(false);

  const filtered = useMemo(() => {
    const all = data?.workflows ?? [];
    const t = q.trim().toLowerCase();
    return all.filter((w) => {
      if (status === "published" && w.status !== "published") return false;
      if (status === "draft" && w.status === "published") return false;
      if (folder !== "all" && w.folder !== folder) return false;
      if (t && !(w.name.toLowerCase().includes(t) ||
        w.tags_added.some((x) => x.toLowerCase().includes(t)) ||
        w.tags_removed.some((x) => x.toLowerCase().includes(t)))) return false;
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
  const folderNames = FOLDER_ORDER.filter((f) => byFolder.has(f));

  return (
    <PageShell
      title="As-is workflows — current state"
      subtitle={`All ${c.total} workflows in the location today, exactly as extracted from GHL — names, statuses, triggers, verbatim message copy, and tag references, with no brand-voice rewrite. Only ${data.folders.filter((f) => f.name !== "Uncategorized").reduce((s, f) => s + f.count, 0)} are organised into folders; the rest are uncategorised.`}
    >
      {/* Coverage summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Workflows" value={c.total} note={`${c.published} published · ${c.draft} draft`} />
        <Stat label="Published" value={c.published} tone="good" />
        <Stat label="Draft" value={c.draft} note="out of scope for cutover" tone="muted" />
        <Stat label="Message detail" value={c.with_messages} note="verbatim copy recovered" tone="good" />
        <Stat label="Triggers only" value={c.triggers_only} note="no step copy" tone="warning" />
        <Stat label="Structure only" value={c.metadata_only} note="step extraction pending" tone="red" />
        <Stat label="Verbatim messages" value={c.total_messages} note="across all workflows" />
      </div>

      <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
        Step-level structure (ordered waits, if/else branches, action sequences) was not recoverable from the GHL export for any workflow — the step extraction returned empty everywhere. Coverage below is tiered honestly: <b className="text-foreground">Message detail</b> = verbatim SMS/email steps recovered, <b className="text-foreground">Triggers only</b> = trigger(s) recovered but no message copy, <b className="text-foreground">Structure only</b> = name/status/folder metadata only.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or tag…"
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
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} /> Group per-location duplicates
        </label>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{filtered.length} shown</span>
      </div>

      {/* Grouped list */}
      <div className="space-y-6">
        {folderNames.map((f) => {
          const items = byFolder.get(f)!;
          return (
            <section key={f}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{f}</h2>
                <Badge tone="muted">{items.length}</Badge>
              </div>
              {group ? <GroupedByFamily items={items} /> : (
                <div className="grid gap-2 md:grid-cols-2">
                  {items.map((w) => <WorkflowRow key={w.id} w={w} />)}
                </div>
              )}
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

function GroupedByFamily({ items }: { items: AsisWorkflow[] }) {
  const families = useMemo(() => {
    const m = new Map<string, AsisWorkflow[]>();
    for (const w of items) (m.get(w.family) ?? m.set(w.family, []).get(w.family)!).push(w);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  return (
    <div className="space-y-3">
      {families.map(([fam, group]) => (
        group.length > 1 ? (
          <div key={fam} className="rounded-md border border-dashed bg-muted/20 p-2">
            <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
              <span>{group.length} variants of the same workflow</span>
              <div className="flex flex-wrap gap-1">
                {group.map((w) => w.location && <Badge key={w.id} tone="red">{w.location}</Badge>)}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {group.map((w) => <WorkflowRow key={w.id} w={w} />)}
            </div>
          </div>
        ) : (
          <WorkflowRow key={group[0].id} w={group[0]} />
        )
      ))}
    </div>
  );
}
