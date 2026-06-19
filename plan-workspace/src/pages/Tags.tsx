import { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent } from "../components/ui";
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

const DISP_STYLE: Record<Disposition, { badge: string; row: string }> = {
  "":      { badge: "bg-zinc-700 text-zinc-200",                              row: "" },
  keep:    { badge: "bg-emerald-700 text-white font-semibold",                row: "bg-emerald-950/20" },
  rename:  { badge: "bg-sky-700 text-white font-semibold",                    row: "bg-sky-950/20" },
  merge:   { badge: "bg-orange-700 text-white font-semibold",                 row: "bg-orange-950/20" },
  delete:  { badge: "bg-red-700 text-white font-semibold",                    row: "bg-red-950/20" },
  skip:    { badge: "bg-zinc-600 text-zinc-200",                              row: "bg-zinc-900/30" },
};

const PATTERN_STYLE: Record<string, string> = {
  "date-suffixed":    "bg-amber-800/60 text-amber-200",
  "month-suffixed":   "bg-amber-800/60 text-amber-200",
  "broken-merge-field": "bg-red-800/70 text-red-100",
  "aft-batch":        "bg-purple-800/60 text-purple-200",
  "adhoc-batch":      "bg-purple-800/60 text-purple-200",
};

type SortKey = "name" | "disposition" | "pattern";
type SortDir = "asc" | "desc";

function loadAnnotations(): Record<string, Ann> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function saveAnnotations(a: Record<string, Ann>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

const sel = "rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-400 focus:ring-0 w-full";
const inp = "rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400 focus:ring-0 w-full";

function SortIcon({ col, sortBy, sortDir }: { col: SortKey; sortBy: SortKey; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

function TagRow({ tag, ann, onChange, rowIdx }: {
  tag: GhlTag; ann: Ann; onChange: (id: string, patch: Partial<Ann>) => void; rowIdx: number;
}) {
  const set = (patch: Partial<Ann>) => onChange(tag.id, patch);
  const disp = ann.disposition;
  const rowBg = DISP_STYLE[disp].row;
  const stripe = rowIdx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-850";

  return (
    <tr className={`border-b border-zinc-700 ${rowBg || stripe} hover:bg-zinc-700/40 transition-colors`}>
      {/* Tag name */}
      <td className="px-3 py-2 align-middle w-[38%]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-medium text-zinc-100 break-all">{tag.name}</span>
          {tag.pattern && (
            <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${PATTERN_STYLE[tag.pattern] ?? "bg-zinc-700 text-zinc-300"}`}>
              {tag.pattern}
            </span>
          )}
        </div>
      </td>
      {/* Disposition */}
      <td className="px-3 py-2 align-middle w-[18%]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {disp && (
              <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${DISP_STYLE[disp].badge}`}>
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
      <td className="px-3 py-2 align-middle w-[27%]">
        <input className={inp} placeholder="What does this tag mean / where is it set?" value={ann.description} onChange={(e) => set({ description: e.target.value })} />
      </td>
      {/* Notes */}
      <td className="px-3 py-2 align-middle w-[17%]">
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

  const thCls = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 border-b-2 border-zinc-600 select-none";
  const thBtn = "flex items-center gap-1 cursor-pointer hover:text-white transition-colors";

  return (
    <PageShell
      title="Tag library & rationalization"
      subtitle={`${tags.length} live GHL tags · pulled ${data?.pulled_at ?? "…"} · sort any column · filter · annotate disposition — auto-saved to browser`}
      actions={
        <div className="flex items-center gap-2">
          {saved && <span className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-medium text-white">Saved</span>}
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Total",    value: tags.length,  cls: "text-white" },
          { label: "Reviewed", value: reviewed,      cls: "text-white" },
          { label: "Keep",     value: stats.keep,    cls: "text-emerald-400" },
          { label: "Delete",   value: stats.delete,  cls: "text-red-400" },
          { label: "Rename",   value: stats.rename,  cls: "text-sky-400" },
          { label: "Merge",    value: stats.merge,   cls: "text-orange-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span>{reviewed} of {tags.length} reviewed</span>
          <span>{tags.length > 0 ? Math.round((reviewed / tags.length) * 100) : 0}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-700">
          <div className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${tags.length > 0 ? (reviewed / tags.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Broken tag alert */}
      {tags.filter((t) => t.pattern === "broken-merge-field").length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-600 bg-red-950/50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="text-sm">
            <span className="font-bold text-red-300">Broken merge-field tags: </span>
            <span className="font-mono text-red-200 text-xs">
              {tags.filter((t) => t.pattern === "broken-merge-field").map((t) => t.name).join(" · ")}
            </span>
            <span className="text-red-300"> — GHL wrote the merge field literally instead of resolving it. Mark for delete.</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-8 w-60 rounded border border-zinc-600 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
          placeholder="Search tag names…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="h-8 rounded border border-zinc-600 bg-zinc-800 px-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
          value={filterDisp} onChange={(e) => { setFilterDisp(e.target.value as Disposition | "all"); setPage(1); }}>
          <option value="all">All dispositions</option>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label || "Unreviewed"}</option>)}
        </select>
        <select className="h-8 rounded border border-zinc-600 bg-zinc-800 px-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
          value={filterPattern} onChange={(e) => { setFilterPattern(e.target.value); setPage(1); }}>
          <option value="all">All patterns</option>
          <option value="">No pattern</option>
          {patterns.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-sm font-medium text-zinc-300">{filtered.length} matching</span>
        {(search || filterDisp !== "all" || filterPattern !== "all") && (
          <button onClick={() => { setSearch(""); setFilterDisp("all"); setFilterPattern("all"); setPage(1); }}
            className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Disposition legend */}
      <div className="flex flex-wrap gap-2 items-center">
        {DISP_OPTIONS.filter((o) => o.value).map((o) => (
          <span key={o.value} className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${DISP_STYLE[o.value].badge}`}>
            {o.label}
          </span>
        ))}
        <span className="text-xs text-zinc-500">set per-row in the Disposition column</span>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
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
                  <td colSpan={4} className="px-3 py-12 text-center text-sm text-zinc-500 bg-zinc-900">
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
          <span className="text-sm text-zinc-400">
            Page {safePage} of {totalPages} · {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              «
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              className="flex items-center gap-1 rounded border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${p === safePage
                    ? "border-zinc-400 bg-zinc-600 text-white"
                    : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="flex items-center gap-1 rounded border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight className="h-3 w-3" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              »
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Annotations auto-save to localStorage — no submit needed. Export CSV for GHL admin handoff. No PHI — tag names only.
      </p>
    </PageShell>
  );
}
