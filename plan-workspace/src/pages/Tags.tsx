import { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Download, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface GhlTag { id: string; name: string; locationId: string; pattern: string; }
interface TagData { pulled_at: string; total: number; tags: GhlTag[]; }

type Disposition = "" | "keep" | "rename" | "merge" | "delete" | "skip";
interface Ann { disposition: Disposition; description: string; notes: string; newName: string; mergeInto: string; }

const EMPTY_ANN: Ann = { disposition: "", description: "", notes: "", newName: "", mergeInto: "" };
const STORAGE_KEY = "mwc-tag-rationale-v1";
const PAGE_SIZE = 50;

const DISP_OPTIONS: { value: Disposition; label: string }[] = [
  { value: "", label: "— unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "rename", label: "Rename" },
  { value: "merge", label: "Merge Into" },
  { value: "delete", label: "Delete" },
  { value: "skip", label: "No Action" },
];

/* colors that work in both light and dark mode */
const DISP_BADGE: Record<Disposition, string> = {
  "":     "bg-muted text-muted-foreground",
  keep:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100",
  rename: "bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-100",
  merge:  "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100",
  delete: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
  skip:   "bg-muted text-muted-foreground",
};
const DISP_ROW: Record<Disposition, string> = {
  "":     "",
  keep:   "bg-emerald-50 dark:bg-emerald-950/25",
  rename: "bg-sky-50 dark:bg-sky-950/25",
  merge:  "bg-orange-50 dark:bg-orange-950/25",
  delete: "bg-red-50 dark:bg-red-950/25",
  skip:   "",
};
const DISP_STAT_VAL: Record<string, string> = {
  keep: "text-emerald-700 dark:text-emerald-400",
  delete: "text-red-700 dark:text-red-400",
  rename: "text-sky-700 dark:text-sky-400",
  merge: "text-orange-700 dark:text-orange-400",
};

const PATTERN_BADGE: Record<string, string> = {
  "date-suffixed":      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  "month-suffixed":     "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  "broken-merge-field": "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  "aft-batch":          "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  "adhoc-batch":        "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
};

type SortKey = "name" | "disposition" | "pattern";
type SortDir = "asc" | "desc";

function loadAnnotations(): Record<string, Ann> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function saveAnnotations(a: Record<string, Ann>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

const inp = "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";
const sel = "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

function SortIcon({ col, sortBy, sortDir }: { col: SortKey; sortBy: SortKey; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />;
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />;
}

function TagRow({ tag, ann, onChange, rowIdx }: {
  tag: GhlTag; ann: Ann; onChange: (id: string, patch: Partial<Ann>) => void; rowIdx: number;
}) {
  const set = (patch: Partial<Ann>) => onChange(tag.id, patch);
  const disp = ann.disposition;
  const stripe = rowIdx % 2 === 0 ? "bg-card" : "bg-muted/30";

  return (
    <tr className={`border-b border-border transition-colors hover:bg-muted/50 ${DISP_ROW[disp] || stripe}`}>
      {/* Tag name */}
      <td className="px-3 py-2 align-middle">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-medium text-foreground break-all">{tag.name}</span>
          {tag.pattern && (
            <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${PATTERN_BADGE[tag.pattern] ?? "bg-muted text-muted-foreground"}`}>
              {tag.pattern}
            </span>
          )}
        </div>
      </td>
      {/* Disposition */}
      <td className="px-3 py-2 align-middle">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {disp && (
              <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${DISP_BADGE[disp]}`}>
                {DISP_OPTIONS.find(o => o.value === disp)?.label}
              </span>
            )}
            <select className={sel} value={disp} onChange={(e) => set({ disposition: e.target.value as Disposition })}>
              {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {disp === "rename" && (
            <input className={inp} placeholder="New name…" value={ann.newName} onChange={(e) => set({ newName: e.target.value })} />
          )}
          {disp === "merge" && (
            <input className={inp} placeholder="Merge into…" value={ann.mergeInto} onChange={(e) => set({ mergeInto: e.target.value })} />
          )}
        </div>
      </td>
      {/* Description */}
      <td className="px-3 py-2 align-middle">
        <input className={inp} placeholder="What does this tag mean / where is it set?" value={ann.description} onChange={(e) => set({ description: e.target.value })} />
      </td>
      {/* Notes */}
      <td className="px-3 py-2 align-middle">
        <input className={inp} placeholder="Notes…" value={ann.notes} onChange={(e) => set({ notes: e.target.value })} />
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
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
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

  function handleSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let t = tags;
    if (search) { const q = search.toLowerCase(); t = t.filter((x) => x.name.toLowerCase().includes(q)); }
    if (filterDisp !== "all") t = t.filter((x) => (annotations[x.id]?.disposition ?? "") === filterDisp);
    if (filterPattern !== "all") t = t.filter((x) => (filterPattern === "" ? !x.pattern : x.pattern === filterPattern));
    return t;
  }, [tags, search, filterDisp, filterPattern, annotations]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (sortBy === "name") { av = a.name; bv = b.name; }
      else if (sortBy === "disposition") { av = annotations[a.id]?.disposition ?? ""; bv = annotations[b.id]?.disposition ?? ""; }
      else if (sortBy === "pattern") { av = a.pattern; bv = b.pattern; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortBy, sortDir, annotations]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterDisp, filterPattern, sortBy, sortDir]);

  const stats = useMemo(() => {
    const c: Record<string, number> = { "": 0, keep: 0, rename: 0, merge: 0, delete: 0, skip: 0 };
    for (const tag of tags) { const d = annotations[tag.id]?.disposition ?? ""; c[d] = (c[d] ?? 0) + 1; }
    return c;
  }, [tags, annotations]);

  const reviewed = tags.length - (stats[""] ?? 0);
  const pct = tags.length > 0 ? Math.round((reviewed / tags.length) * 100) : 0;
  const patterns = useMemo(() => Array.from(new Set(tags.map((t) => t.pattern).filter(Boolean))).sort(), [tags]);

  function exportCSV() {
    const rows = [["id", "name", "pattern", "disposition", "new_name", "merge_into", "description", "notes"]];
    for (const t of tags) {
      const a = annotations[t.id] ?? EMPTY_ANN;
      rows.push([t.id, t.name, t.pattern, a.disposition, a.newName, a.mergeInto, a.description, a.notes]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mwc-tag-rationale.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const thCls = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border select-none";
  const thBtn = "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors";
  const btnBase = "rounded border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <PageShell
      title="Tag library & rationalization"
      subtitle={`${tags.length} live GHL tags · pulled ${data?.pulled_at ?? "…"} · click column headers to sort · filter by disposition or pattern · auto-saved`}
      actions={
        <div className="flex items-center gap-2">
          {saved && <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Saved</span>}
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Total",    value: tags.length, cls: "text-foreground" },
          { label: "Reviewed", value: reviewed,     cls: "text-foreground" },
          { label: "Keep",     value: stats.keep,   cls: DISP_STAT_VAL.keep },
          { label: "Delete",   value: stats.delete, cls: DISP_STAT_VAL.delete },
          { label: "Rename",   value: stats.rename, cls: DISP_STAT_VAL.rename },
          { label: "Merge",    value: stats.merge,  cls: DISP_STAT_VAL.merge },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{reviewed} of {tags.length} reviewed</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Broken tag alert */}
      {tags.filter((t) => t.pattern === "broken-merge-field").length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <span className="font-bold text-red-800 dark:text-red-300">Broken merge-field tags: </span>
            <span className="font-mono text-xs text-red-700 dark:text-red-400">
              {tags.filter((t) => t.pattern === "broken-merge-field").map((t) => t.name).join(" · ")}
            </span>
            <span className="text-red-700 dark:text-red-400"> — GHL wrote the merge field literally instead of resolving it. Mark for delete.</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-8 w-60 rounded border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          placeholder="Search tag names…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
          value={filterDisp} onChange={(e) => { setFilterDisp(e.target.value as Disposition | "all"); setPage(1); }}>
          <option value="all">All dispositions</option>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label || "Unreviewed"}</option>)}
        </select>
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
          value={filterPattern} onChange={(e) => { setFilterPattern(e.target.value); setPage(1); }}>
          <option value="all">All patterns</option>
          <option value="">No pattern</option>
          {patterns.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-sm font-medium text-muted-foreground">{filtered.length} matching</span>
        {(search || filterDisp !== "all" || filterPattern !== "all") && (
          <button onClick={() => { setSearch(""); setFilterDisp("all"); setFilterPattern("all"); setPage(1); }}
            className="rounded border border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        {DISP_OPTIONS.filter((o) => o.value).map((o) => (
          <span key={o.value} className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${DISP_BADGE[o.value]}`}>
            {o.label}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">— set per-row in the Disposition column</span>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thCls} style={{ width: "38%" }}>
                  <div className={thBtn} onClick={() => handleSort("name")}>
                    Tag name <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                <th className={thCls} style={{ width: "18%" }}>
                  <div className={thBtn} onClick={() => handleSort("disposition")}>
                    Disposition <SortIcon col="disposition" sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
                <th className={thCls} style={{ width: "27%" }}>Description</th>
                <th className={thCls} style={{ width: "17%" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((tag, i) => (
                <TagRow key={tag.id} tag={tag} ann={annotations[tag.id] ?? EMPTY_ANN} onChange={update} rowIdx={i} />
              ))}
              {pageSlice.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-sm text-muted-foreground bg-card">
                    No tags match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages} · rows {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className={btnBase}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              className={`${btnBase} flex items-center gap-1`}>
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) p = i + 1;
              else if (safePage <= 4) p = i + 1;
              else if (safePage >= totalPages - 3) p = totalPages - 6 + i;
              else p = safePage - 3 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                    p === safePage
                      ? "border-foreground/40 bg-foreground text-background"
                      : "border-input bg-background text-foreground hover:bg-muted"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className={`${btnBase} flex items-center gap-1`}>
              Next <ChevronRight className="h-3 w-3" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className={btnBase}>»</button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Annotations auto-save to localStorage — no submit needed. Export CSV for GHL admin handoff. No PHI — tag names only.
      </p>
    </PageShell>
  );
}
