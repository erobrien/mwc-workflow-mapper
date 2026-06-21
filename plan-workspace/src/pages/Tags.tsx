import { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Download, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";

interface GhlTag {
  id: string; name: string; locationId: string; pattern: string;
  count: number | null; usage_tier: string;
  created_at: string | null; updated_at: string | null;
  suggested_disposition?: string; suggested_description?: string;
  suggested_reason?: string; suggested_merge_into?: string;
}
interface TagData {
  pulled_at: string; total: number; has_dates: boolean; has_suggestions?: boolean;
  total_contacts_tagged: number; tags: GhlTag[];
}

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
const DISP_LABEL: Record<string, string> = { keep: "Keep", rename: "Rename", merge: "Merge", delete: "Delete", skip: "No Action", "": "—" };

const DISP_BADGE: Record<string, string> = {
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

const PATTERN_BADGE: Record<string, string> = {
  "date-suffixed":      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  "month-suffixed":     "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  "broken-merge-field": "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  "aft-batch":          "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  "adhoc-batch":        "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  "test-junk":          "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
};

const TIER_META: Record<string, { label: string; badge: string }> = {
  unused:  { label: "unused",  badge: "bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200" },
  rare:    { label: "rare",    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200" },
  low:     { label: "low",     badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" },
  medium:  { label: "medium",  badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200" },
  high:    { label: "high",    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" },
  unknown: { label: "?",       badge: "bg-muted text-muted-foreground" },
};

type SortKey = "name" | "count" | "tier" | "disposition" | "suggested" | "created" | "updated";
type SortDir = "asc" | "desc";

function loadAnnotations(): Record<string, Ann> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function saveAnnotations(a: Record<string, Ann>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}
function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" });
}
function patchFromSuggestion(tag: GhlTag, curDesc: string): Partial<Ann> {
  const disp = (tag.suggested_disposition ?? "") as Disposition;
  const patch: Partial<Ann> = { disposition: disp };
  if (!curDesc && tag.suggested_description) patch.description = tag.suggested_description;
  if (tag.suggested_merge_into) {
    if (disp === "merge") patch.mergeInto = tag.suggested_merge_into;
    if (disp === "rename") patch.newName = tag.suggested_merge_into;
  }
  return patch;
}

const inp = "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";
const sel = "w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

function SortIcon({ col, sortBy, sortDir }: { col: SortKey; sortBy: SortKey; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />;
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />;
}

function TagRow({ tag, ann, onChange, rowIdx, showDates, showSuggest }: {
  tag: GhlTag; ann: Ann; onChange: (id: string, patch: Partial<Ann>) => void; rowIdx: number; showDates: boolean; showSuggest: boolean;
}) {
  const set = (patch: Partial<Ann>) => onChange(tag.id, patch);
  const disp = ann.disposition;
  const stripe = rowIdx % 2 === 0 ? "bg-card" : "bg-muted/30";
  const tier = TIER_META[tag.usage_tier] ?? TIER_META.unknown;
  const sd = tag.suggested_disposition ?? "";
  const accepted = sd && disp === sd;

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
      {/* Contacts */}
      <td className="px-3 py-2 align-middle whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <span className={`tabular-nums font-semibold ${tag.count === 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{tag.count ?? "—"}</span>
          <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${tier.badge}`}>{tier.label}</span>
        </div>
      </td>
      {/* Dates */}
      {showDates && (
        <>
          <td className="px-3 py-2 align-middle whitespace-nowrap text-xs text-muted-foreground">{fmtDate(tag.created_at)}</td>
          <td className="px-3 py-2 align-middle whitespace-nowrap text-xs text-muted-foreground">{fmtDate(tag.updated_at)}</td>
        </>
      )}
      {/* Suggested */}
      {showSuggest && (
        <td className="px-3 py-2 align-middle">
          {sd ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${DISP_BADGE[sd]}`}>{DISP_LABEL[sd]}</span>
                {tag.suggested_merge_into && <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={tag.suggested_merge_into}>→ {tag.suggested_merge_into}</span>}
                <button
                  onClick={() => set(patchFromSuggestion(tag, ann.description))}
                  title={accepted ? "Already applied" : "Apply this suggestion to the Disposition"}
                  className={`ml-auto shrink-0 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${accepted ? "border-emerald-400 text-emerald-700 dark:text-emerald-400" : "border-input text-foreground hover:bg-muted"}`}>
                  <Check className="h-3 w-3" /> {accepted ? "applied" : "accept"}
                </button>
              </div>
              {tag.suggested_reason && <div className="text-[11px] leading-snug text-muted-foreground line-clamp-2" title={tag.suggested_reason}>{tag.suggested_reason}</div>}
            </div>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </td>
      )}
      {/* Disposition */}
      <td className="px-3 py-2 align-middle">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {disp && <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${DISP_BADGE[disp]}`}>{DISP_OPTIONS.find(o => o.value === disp)?.label}</span>}
            <select className={sel} value={disp} onChange={(e) => set({ disposition: e.target.value as Disposition })}>
              {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {disp === "rename" && <input className={inp} placeholder="New name…" value={ann.newName} onChange={(e) => set({ newName: e.target.value })} />}
          {disp === "merge" && <input className={inp} placeholder="Merge into…" value={ann.mergeInto} onChange={(e) => set({ mergeInto: e.target.value })} />}
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
  const [filterSuggest, setFilterSuggest] = useState("all");
  const [filterPattern, setFilterPattern] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
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

  const applyMany = useCallback((rows: GhlTag[]) => {
    setAnnotations((prev) => {
      const next = { ...prev };
      for (const t of rows) {
        if (!t.suggested_disposition) continue;
        const cur = next[t.id] ?? EMPTY_ANN;
        next[t.id] = { ...cur, ...patchFromSuggestion(t, cur.description) };
      }
      saveAnnotations(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, []);

  const tags = data?.tags ?? [];
  const showDates = !!data?.has_dates;
  const showSuggest = !!data?.has_suggestions;

  function handleSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let t = tags;
    if (search) { const q = search.toLowerCase(); t = t.filter((x) => x.name.toLowerCase().includes(q)); }
    if (filterDisp !== "all") t = t.filter((x) => (annotations[x.id]?.disposition ?? "") === filterDisp);
    if (filterSuggest !== "all") t = t.filter((x) => (x.suggested_disposition ?? "") === filterSuggest);
    if (filterPattern !== "all") t = t.filter((x) => (filterPattern === "" ? !x.pattern : x.pattern === filterPattern));
    if (filterTier !== "all") t = t.filter((x) => x.usage_tier === filterTier);
    return t;
  }, [tags, search, filterDisp, filterSuggest, filterPattern, filterTier, annotations]);

  const sorted = useMemo(() => {
    const tierRank: Record<string, number> = { unused: 0, rare: 1, low: 2, medium: 3, high: 4, unknown: 5 };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "count") cmp = (a.count ?? -1) - (b.count ?? -1);
      else if (sortBy === "tier") cmp = (tierRank[a.usage_tier] ?? 9) - (tierRank[b.usage_tier] ?? 9);
      else if (sortBy === "disposition") cmp = (annotations[a.id]?.disposition ?? "").localeCompare(annotations[b.id]?.disposition ?? "");
      else if (sortBy === "suggested") cmp = (a.suggested_disposition ?? "").localeCompare(b.suggested_disposition ?? "");
      else if (sortBy === "created") cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      else if (sortBy === "updated") cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, annotations]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterDisp, filterSuggest, filterPattern, filterTier, sortBy, sortDir]);

  const stats = useMemo(() => {
    const c: Record<string, number> = { "": 0, keep: 0, rename: 0, merge: 0, delete: 0, skip: 0 };
    for (const tag of tags) { const d = annotations[tag.id]?.disposition ?? ""; c[d] = (c[d] ?? 0) + 1; }
    return c;
  }, [tags, annotations]);

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tags) c[t.usage_tier] = (c[t.usage_tier] ?? 0) + 1;
    return c;
  }, [tags]);

  const suggestCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tags) { const s = t.suggested_disposition ?? ""; if (s) c[s] = (c[s] ?? 0) + 1; }
    return c;
  }, [tags]);

  const reviewed = tags.length - (stats[""] ?? 0);
  const pct = tags.length > 0 ? Math.round((reviewed / tags.length) * 100) : 0;
  const patterns = useMemo(() => Array.from(new Set(tags.map((t) => t.pattern).filter(Boolean))).sort(), [tags]);

  function exportCSV() {
    const head = ["id", "name", "pattern", "contact_count", "usage_tier", "created_at", "updated_at", "suggested_disposition", "suggested_merge_into", "suggested_reason", "disposition", "new_name", "merge_into", "description", "notes"];
    const rows = [head];
    for (const t of tags) {
      const a = annotations[t.id] ?? EMPTY_ANN;
      rows.push([t.id, t.name, t.pattern, String(t.count ?? ""), t.usage_tier, t.created_at ?? "", t.updated_at ?? "", t.suggested_disposition ?? "", t.suggested_merge_into ?? "", t.suggested_reason ?? "", a.disposition, a.newName, a.mergeInto, a.description, a.notes]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mwc-tag-rationale.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function acceptVisible() {
    const n = sorted.filter((t) => t.suggested_disposition).length;
    if (!n) return;
    if (window.confirm(`Apply the AI-suggested disposition to all ${n} tags matching the current filters? This sets your Disposition column (you can still change any of them).`)) {
      applyMany(sorted);
    }
  }

  const thCls = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border select-none";
  const thBtn = "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors";
  const btnBase = "rounded border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const colCount = 5 + (showDates ? 2 : 0) + (showSuggest ? 1 : 0);

  return (
    <PageShell
      title="Tag library & rationalization"
      subtitle={`${tags.length} live GHL tags · pulled ${data?.pulled_at ?? "…"} · ${(data?.total_contacts_tagged ?? 0).toLocaleString()} tag-applications · counts, dates${showSuggest ? ", and AI-suggested dispositions" : ""}`}
      actions={
        <div className="flex items-center gap-2">
          {saved && <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Saved</span>}
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      }
    >
      {/* Usage stats */}
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Usage breakdown (by contacts carrying the tag)</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { key: "total",  label: "Total tags", value: tags.length, cls: "text-foreground", sub: "" },
            { key: "unused", label: "Unused",     value: tierCounts.unused ?? 0, cls: "text-red-600 dark:text-red-400", sub: "0 contacts" },
            { key: "rare",   label: "Rare",       value: tierCounts.rare ?? 0,   cls: "text-orange-600 dark:text-orange-400", sub: "1–5" },
            { key: "low",    label: "Low",        value: tierCounts.low ?? 0,    cls: "text-amber-600 dark:text-amber-400", sub: "6–50" },
            { key: "medium", label: "Medium",     value: tierCounts.medium ?? 0, cls: "text-sky-600 dark:text-sky-400", sub: "51–500" },
            { key: "high",   label: "High",       value: tierCounts.high ?? 0,   cls: "text-emerald-600 dark:text-emerald-400", sub: "500+" },
          ].map((s) => (
            <button key={s.key}
              onClick={() => { if (s.key !== "total") { setFilterTier(filterTier === s.key ? "all" : s.key); setPage(1); } }}
              className={`text-left rounded-lg border bg-card p-3 transition-colors ${s.key !== "total" ? "hover:border-foreground/30 cursor-pointer" : "cursor-default"} ${filterTier === s.key ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border"}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</div>
              {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* AI suggestion summary */}
      {showSuggest && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">AI suggestions:</span>
          {(["delete", "keep", "skip", "merge", "rename"] as const).map((k) => (
            <button key={k} onClick={() => { setFilterSuggest(filterSuggest === k ? "all" : k); setPage(1); }}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${DISP_BADGE[k]} ${filterSuggest === k ? "ring-2 ring-violet-500" : ""}`}>
              {suggestCounts[k] ?? 0} {DISP_LABEL[k]}
            </button>
          ))}
          <span className="text-xs text-violet-700/80 dark:text-violet-400/80">advisory — click a chip to filter, then “Accept all” or accept per-row</span>
          <button onClick={acceptVisible} className="ml-auto inline-flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
            <Check className="h-3.5 w-3.5" /> Accept all shown ({sorted.filter((t) => t.suggested_disposition).length})
          </button>
        </div>
      )}

      {/* Review progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {reviewed} of {tags.length} reviewed
            {(stats.keep + stats.delete + stats.rename + stats.merge) > 0 && (
              <span className="ml-2">· <span className="text-emerald-600 dark:text-emerald-400">{stats.keep} keep</span> · <span className="text-red-600 dark:text-red-400">{stats.delete} delete</span> · <span className="text-sky-600 dark:text-sky-400">{stats.rename} rename</span> · <span className="text-orange-600 dark:text-orange-400">{stats.merge} merge</span> · <span>{stats.skip} skip</span></span>
            )}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Broken tag alert */}
      {tags.filter((t) => t.pattern === "broken-merge-field").length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <span className="font-bold text-red-800 dark:text-red-300">Broken merge-field tags: </span>
            <span className="font-mono text-xs text-red-700 dark:text-red-400">{tags.filter((t) => t.pattern === "broken-merge-field").map((t) => t.name).join(" · ")}</span>
            <span className="text-red-700 dark:text-red-400"> — GHL wrote the merge field literally instead of resolving it. Mark for delete.</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input className="h-8 w-52 rounded border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          placeholder="Search tag names…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterTier} onChange={(e) => { setFilterTier(e.target.value); setPage(1); }}>
          <option value="all">All usage</option>
          <option value="unused">Unused (0)</option><option value="rare">Rare (1–5)</option><option value="low">Low (6–50)</option><option value="medium">Medium (51–500)</option><option value="high">High (500+)</option>
        </select>
        {showSuggest && (
          <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterSuggest} onChange={(e) => { setFilterSuggest(e.target.value); setPage(1); }}>
            <option value="all">AI: all</option>
            <option value="delete">AI: Delete</option><option value="keep">AI: Keep</option><option value="merge">AI: Merge</option><option value="rename">AI: Rename</option><option value="skip">AI: Skip</option>
          </select>
        )}
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterDisp} onChange={(e) => { setFilterDisp(e.target.value as Disposition | "all"); setPage(1); }}>
          <option value="all">My disp: all</option>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label || "Unreviewed"}</option>)}
        </select>
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterPattern} onChange={(e) => { setFilterPattern(e.target.value); setPage(1); }}>
          <option value="all">All patterns</option><option value="">No pattern</option>
          {patterns.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-sm font-medium text-muted-foreground">{filtered.length} matching</span>
        {(search || filterDisp !== "all" || filterSuggest !== "all" || filterPattern !== "all" || filterTier !== "all") && (
          <button onClick={() => { setSearch(""); setFilterDisp("all"); setFilterSuggest("all"); setFilterPattern("all"); setFilterTier("all"); setPage(1); }}
            className="rounded border border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">Clear filters</button>
        )}
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("name")}>Tag name <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={`${thCls} text-right`}><div className={`${thBtn} justify-end`} onClick={() => handleSort("count")}>Contacts <SortIcon col="count" sortBy={sortBy} sortDir={sortDir} /></div></th>
                {showDates && (<>
                  <th className={thCls}><div className={thBtn} onClick={() => handleSort("created")}>Created <SortIcon col="created" sortBy={sortBy} sortDir={sortDir} /></div></th>
                  <th className={thCls}><div className={thBtn} onClick={() => handleSort("updated")}>Updated <SortIcon col="updated" sortBy={sortBy} sortDir={sortDir} /></div></th>
                </>)}
                {showSuggest && <th className={thCls}><div className={thBtn} onClick={() => handleSort("suggested")}>AI suggestion <SortIcon col="suggested" sortBy={sortBy} sortDir={sortDir} /></div></th>}
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("disposition")}>My disposition <SortIcon col="disposition" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}>Description</th>
                <th className={thCls}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((tag, i) => (
                <TagRow key={tag.id} tag={tag} ann={annotations[tag.id] ?? EMPTY_ANN} onChange={update} rowIdx={i} showDates={showDates} showSuggest={showSuggest} />
              ))}
              {pageSlice.length === 0 && (
                <tr><td colSpan={colCount} className="px-3 py-12 text-center text-sm text-muted-foreground bg-card">No tags match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages} · rows {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className={btnBase}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className={`${btnBase} flex items-center gap-1`}><ChevronLeft className="h-3 w-3" /> Prev</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) p = i + 1;
              else if (safePage <= 4) p = i + 1;
              else if (safePage >= totalPages - 3) p = totalPages - 6 + i;
              else p = safePage - 3 + i;
              return (
                <button key={p} onClick={() => setPage(p)} className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${p === safePage ? "border-foreground/40 bg-foreground text-background" : "border-input bg-background text-foreground hover:bg-muted"}`}>{p}</button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className={`${btnBase} flex items-center gap-1`}>Next <ChevronRight className="h-3 w-3" /></button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className={btnBase}>»</button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Contact counts are exact; Created/Updated from GHL. {showSuggest ? "AI suggestions are advisory (name + count + pattern reasoning, risky deletes double-checked) — your “My disposition” column is the source of truth." : ""} Annotations auto-save to your browser; Export CSV for handoff. No PHI — tag names and counts only.
      </p>
    </PageShell>
  );
}
