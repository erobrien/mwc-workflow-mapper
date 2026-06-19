import { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent } from "../components/ui";
import { Download, Tag, AlertTriangle } from "lucide-react";

interface GhlTag { id: string; name: string; locationId: string; pattern: string; }
interface TagData { pulled_at: string; total: number; tags: GhlTag[]; }

type Disposition = "" | "keep" | "rename" | "merge" | "delete" | "skip";
interface Ann { disposition: Disposition; description: string; notes: string; newName: string; mergeInto: string; }

const EMPTY_ANN: Ann = { disposition: "", description: "", notes: "", newName: "", mergeInto: "" };
const STORAGE_KEY = "mwc-tag-rationale-v1";

const DISP_OPTIONS: { value: Disposition; label: string }[] = [
  { value: "", label: "— unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "rename", label: "Rename" },
  { value: "merge", label: "Merge Into" },
  { value: "delete", label: "Delete" },
  { value: "skip", label: "No Action" },
];

const DISP_BADGE: Record<Disposition, string> = {
  "": "bg-muted text-muted-foreground",
  keep: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rename: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  merge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  skip: "bg-muted text-muted-foreground",
};

const PATTERN_BADGE: Record<string, string> = {
  "date-suffixed": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "month-suffixed": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "broken-merge-field": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  "aft-batch": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "adhoc-batch": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

function loadAnnotations(): Record<string, Ann> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function saveAnnotations(a: Record<string, Ann>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

const inp = "w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring";
const sel = "rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring";

function TagRow({ tag, ann, onChange }: {
  tag: GhlTag;
  ann: Ann;
  onChange: (id: string, patch: Partial<Ann>) => void;
}) {
  const set = (patch: Partial<Ann>) => onChange(tag.id, patch);
  const showRename = ann.disposition === "rename";
  const showMerge = ann.disposition === "merge";

  return (
    <tr className="group border-b hover:bg-muted/30">
      <td className="px-3 py-2 align-top">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="font-mono text-xs">{tag.name}</span>
          {tag.pattern && (
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PATTERN_BADGE[tag.pattern] ?? "bg-muted text-muted-foreground"}`}>
              {tag.pattern}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-top w-40">
        <select className={sel} value={ann.disposition} onChange={(e) => set({ disposition: e.target.value as Disposition })}>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {showRename && (
          <input className={`${inp} mt-1`} placeholder="New name…" value={ann.newName}
            onChange={(e) => set({ newName: e.target.value })} />
        )}
        {showMerge && (
          <input className={`${inp} mt-1`} placeholder="Merge into tag name…" value={ann.mergeInto}
            onChange={(e) => set({ mergeInto: e.target.value })} />
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inp} placeholder="What does this tag mean / where is it set?" value={ann.description}
          onChange={(e) => set({ description: e.target.value })} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inp} placeholder="Notes…" value={ann.notes}
          onChange={(e) => set({ notes: e.target.value })} />
      </td>
    </tr>
  );
}

export default function Tags() {
  const [data, setData] = useState<TagData | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, Ann>>(loadAnnotations);
  const [search, setSearch] = useState("");
  const [filterDisp, setFilterDisp] = useState<Disposition | "all">("all");
  const [filterPattern, setFilterPattern] = useState("all");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/tags.json").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  const update = useCallback((id: string, patch: Partial<Ann>) => {
    setAnnotations((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? EMPTY_ANN), ...patch } };
      saveAnnotations(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, []);

  const tags = data?.tags ?? [];

  const visible = useMemo(() => {
    let t = tags;
    if (search) t = t.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()));
    if (filterDisp !== "all") t = t.filter((x) => (annotations[x.id]?.disposition ?? "") === filterDisp);
    if (filterPattern !== "all") t = t.filter((x) => x.pattern === filterPattern);
    return t;
  }, [tags, search, filterDisp, filterPattern, annotations]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { "": 0, keep: 0, rename: 0, merge: 0, delete: 0, skip: 0 };
    for (const tag of tags) counts[annotations[tag.id]?.disposition ?? ""] = (counts[annotations[tag.id]?.disposition ?? ""] ?? 0) + 1;
    return counts;
  }, [tags, annotations]);

  const reviewed = tags.length - (stats[""] ?? 0);

  function exportCSV() {
    const rows = [["id", "name", "pattern", "disposition", "new_name", "merge_into", "description", "notes"]];
    for (const t of tags) {
      const a = annotations[t.id] ?? EMPTY_ANN;
      rows.push([t.id, t.name, t.pattern, a.disposition, a.newName, a.mergeInto, a.description, a.notes]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mwc-tag-rationale.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const patterns = useMemo(() => {
    const s = new Set(tags.map((t) => t.pattern).filter(Boolean));
    return Array.from(s).sort();
  }, [tags]);

  return (
    <PageShell
      title="Tag library & rationalization"
      subtitle={`${tags.length} live GHL tags · pulled ${data?.pulled_at ?? "…"} · annotate disposition and description per tag, auto-saved to browser`}
      actions={
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: tags.length, cls: "text-foreground" },
          { label: "Reviewed", value: reviewed, cls: "text-foreground" },
          { label: "Keep", value: stats.keep, cls: "text-emerald-700 dark:text-emerald-400" },
          { label: "Delete", value: stats.delete, cls: "text-red-700 dark:text-red-400" },
          { label: "Rename", value: stats.rename, cls: "text-sky-700 dark:text-sky-400" },
          { label: "Merge", value: stats.merge, cls: "text-orange-700 dark:text-orange-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-0.5 text-xl font-bold ${s.cls}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{reviewed} of {tags.length} reviewed</span>
          <span>{tags.length > 0 ? Math.round((reviewed / tags.length) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${tags.length > 0 ? (reviewed / tags.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Broken tag alert */}
      {tags.filter((t) => t.pattern === "broken-merge-field").length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-700 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <span className="font-semibold text-red-800 dark:text-red-300">Broken merge-field tags detected: </span>
            <span className="text-red-700 dark:text-red-400">
              {tags.filter((t) => t.pattern === "broken-merge-field").map((t) => t.name).join(", ")}
              {" "}— these contain {"{{"}…{"}}"}  in the tag name itself. GHL never resolved the merge field; the tag was written literally. Mark for delete.
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-8 w-56 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          placeholder="Search tag names…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          value={filterDisp} onChange={(e) => setFilterDisp(e.target.value as Disposition | "all")}>
          <option value="all">All dispositions</option>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label || "Unreviewed"}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          value={filterPattern} onChange={(e) => setFilterPattern(e.target.value)}>
          <option value="all">All patterns</option>
          <option value="">No pattern</option>
          {patterns.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{visible.length} showing</span>
      </div>

      {/* Disposition legend */}
      <div className="flex flex-wrap gap-1.5">
        {DISP_OPTIONS.filter((o) => o.value).map((o) => (
          <span key={o.value} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DISP_BADGE[o.value]}`}>
            {o.label}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">· per-row in the Disposition column</span>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tag name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44">Disposition</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (what it means / where it's set)</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((tag) => (
                <TagRow key={tag.id} tag={tag} ann={annotations[tag.id] ?? EMPTY_ANN} onChange={update} />
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">No tags match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Annotations are saved automatically to your browser (localStorage). Use Export CSV to share or hand off to GHL admin.
        No PHI — tag names and metadata only.
      </div>
    </PageShell>
  );
}
