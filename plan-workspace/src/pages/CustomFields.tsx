import { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Check, Sparkles,
  FolderTree, ArrowRight, UserPlus, Repeat, Building2, Stethoscope, Trash2, AlertTriangle } from "lucide-react";

interface CustomField {
  id: string;
  name: string;
  fieldKey: string;
  type: string;
  count: number;
  form_refs: string[];
  created_at: string | null;
  created_by: string;
  updated_at: string | null;
  suggested_disposition?: string;
  suggested_description?: string;
  suggested_reason?: string;
}

interface FieldData {
  pulled_at: string;
  total_contacts: number;
  total_fields: number;
  fields: CustomField[];
}

// ── Folder redesign (folder_redesign.json) ──
interface RField { key: string; name: string; count: number; disposition?: string; current_folder?: string; }
interface ProposedFolder { name: string; purpose: string; fields: RField[]; }
interface MoveField extends RField { destination: string; why: string; }
interface RedesignDoc {
  philosophy: string;
  current_folders: { name: string; field_count: number }[];
  proposed_folders: ProposedFolder[];
  move_off_contact: MoveField[];
  stats: { total_fields: number; kept_on_contact: number; proposed_folder_count: number; current_folder_count: number; moved: number; move_breakdown: Record<string, number> };
}

// Visual identity per proposed folder — Consultation backbone leads
function folderStyle(name: string) {
  if (/Consultation — New/i.test(name))     return { icon: UserPlus,    ring: "border-emerald-300 dark:border-emerald-800", head: "bg-emerald-50 dark:bg-emerald-950/30", accent: "text-emerald-700 dark:text-emerald-400" };
  if (/Consultation — Renewal/i.test(name)) return { icon: Repeat,      ring: "border-sky-300 dark:border-sky-800",       head: "bg-sky-50 dark:bg-sky-950/30",       accent: "text-sky-700 dark:text-sky-400" };
  return { icon: FolderTree, ring: "border-gray-300 dark:border-border", head: "bg-muted/40", accent: "text-muted-foreground" };
}
const MOVE_STYLE: Record<string, { icon: any; cls: string; label: string }> = {
  Opportunity: { icon: Building2,    cls: "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400",        label: "→ Opportunity" },
  EMR:         { icon: Stethoscope,  cls: "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-400", label: "→ EMR" },
  Retire:      { icon: Trash2,       cls: "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400",        label: "→ Retire (0-usage)" },
};

function FieldChip({ f }: { f: RField }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-border bg-background px-2 py-1 text-[11px]" title={`${f.key} · ${f.count.toLocaleString()} records${f.current_folder ? ` · was: ${f.current_folder}` : ""}`}>
      <span className="text-foreground/90 max-w-[200px] truncate">{f.name}</span>
      <span className={`tabular-nums font-semibold ${f.count === 0 ? "text-red-500" : "text-muted-foreground"}`}>{f.count.toLocaleString()}</span>
    </span>
  );
}

function FoldersView({ doc }: { doc: RedesignDoc }) {
  const folders = [...doc.proposed_folders].sort((a, b) => {
    const rank = (n: string) => /Consultation — New/i.test(n) ? 0 : /Consultation — Renewal/i.test(n) ? 1 : 2;
    return rank(a.name) - rank(b.name) || b.fields.length - a.fields.length;
  });
  const moveGroups = ["Opportunity", "EMR", "Retire"].map((d) => ({ d, items: doc.move_off_contact.filter((m) => m.destination === d) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Folders", value: `${doc.stats.current_folder_count} → ${doc.stats.proposed_folder_count}`, sub: "messy → clean", cls: "text-foreground" },
          { label: "Kept on Contact", value: doc.stats.kept_on_contact, sub: `of ${doc.stats.total_fields} fields`, cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "Moved off Contact", value: doc.stats.moved, sub: Object.entries(doc.stats.move_breakdown).map(([k, v]) => `${v} ${k}`).join(" · "), cls: "text-sky-600 dark:text-sky-400" },
          { label: "Backbone", value: "New / Renewal", sub: "Consultation-first", cls: "text-emerald-600 dark:text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-300 dark:border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-xl font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Philosophy */}
      <div className="rounded-lg border-l-4 border-l-emerald-500 border border-gray-300 dark:border-border bg-card p-4 text-sm text-foreground/90">
        <span className="font-semibold">Organizing principle: </span>{doc.philosophy}
      </div>

      {/* Current (as-is) — the mess */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Current folders (as-is) — {doc.current_folders.length} folders, overlapping & vague
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.current_folders.map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-400 dark:border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
              {f.name} <span className="tabular-nums font-semibold">{f.field_count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Proposed */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <FolderTree className="h-3.5 w-3.5 text-emerald-500" /> Proposed folders (to-be) — Consultation-first
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {folders.map((fl) => {
            const st = folderStyle(fl.name);
            const Icon = st.icon;
            return (
              <div key={fl.name} className={`rounded-lg border ${st.ring} bg-card overflow-hidden`}>
                <div className={`flex items-start gap-2 px-4 py-3 ${st.head} border-b border-gray-200 dark:border-border`}>
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${st.accent}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{fl.name}</span>
                      <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{fl.fields.length}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">{fl.purpose}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3">
                  {fl.fields.length ? fl.fields.map((f) => <FieldChip key={f.key} f={f} />)
                    : <span className="text-xs italic text-muted-foreground">Forward-looking — populated as renewal workflows go live.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moving off contact */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" /> Moving off the Contact ({doc.move_off_contact.length}) — deal data → Opportunity, clinical → EMR, dead fields retired
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {moveGroups.map(({ d, items }) => {
            const st = MOVE_STYLE[d]; const Icon = st.icon;
            return (
              <div key={d} className={`rounded-lg border bg-card overflow-hidden ${st.cls.split(" ").filter(c => c.startsWith("border")).join(" ")}`}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-border">
                  <Icon className={`h-4 w-4 ${st.cls.split(" ").filter(c => c.startsWith("text")).join(" ")}`} />
                  <span className="font-semibold text-sm text-foreground">{st.label}</span>
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3">
                  {items.map((f) => <FieldChip key={f.key} f={f} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Proposed taxonomy generated from the live field inventory (folders, usage, and AI dispositions) and adversarially verified — every one of the {doc.stats.total_fields} fields is placed exactly once. Internal folder names use "Consultation" (patient-facing copy uses "appointment"). A concept for team review.
      </p>
    </div>
  );
}

type Disposition = "" | "keep" | "archive" | "delete" | "cleanup" | "skip";
interface Ann { disposition: Disposition; description: string; notes: string; }

const EMPTY_ANN: Ann = { disposition: "", description: "", notes: "" };
const STORAGE_KEY = "mwc-field-rationale-v1";
const PAGE_SIZE = 60;

const DISP_OPTIONS: { value: Disposition; label: string }[] = [
  { value: "", label: "— unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "archive", label: "Archive" },
  { value: "delete", label: "Delete" },
  { value: "cleanup", label: "Cleanup" },
  { value: "skip", label: "No Action" },
];

const DISP_LABEL: Record<string, string> = {
  keep: "Keep",
  archive: "Archive",
  delete: "Delete",
  cleanup: "Cleanup",
  skip: "No Action",
  "": "—",
};

const DISP_BADGE: Record<string, string> = {
  "": "bg-muted text-muted-foreground",
  keep: "bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100",
  archive: "bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-100",
  delete: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
  cleanup: "bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100",
  skip: "bg-muted text-muted-foreground",
};

const DISP_ROW: Record<Disposition, string> = {
  "": "",
  keep: "bg-emerald-50 dark:bg-emerald-950/25",
  archive: "bg-sky-50 dark:bg-sky-950/25",
  delete: "bg-red-50 dark:bg-red-950/25",
  cleanup: "bg-amber-50 dark:bg-amber-950/25",
  skip: "",
};

type SortKey = "name" | "count" | "disposition" | "type" | "key" | "created" | "created_by";
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

function patchFromSuggestion(field: CustomField, curDesc: string): Partial<Ann> {
  const disp = (field.suggested_disposition ?? "") as Disposition;
  const patch: Partial<Ann> = { disposition: disp };
  if (!curDesc && field.suggested_description) patch.description = field.suggested_description;
  return patch;
}

const inp = "w-full rounded border border-gray-400 dark:border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";
const sel = "w-full rounded border border-gray-400 dark:border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

function SortIcon({ col, sortBy, sortDir }: { col: SortKey; sortBy: SortKey; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />;
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />;
}

function FieldRow({ field, ann, onChange, rowIdx }: {
  field: CustomField; ann: Ann; onChange: (id: string, patch: Partial<Ann>) => void; rowIdx: number;
}) {
  const set = (patch: Partial<Ann>) => onChange(field.id, patch);
  const disp = ann.disposition;
  const stripe = rowIdx % 2 === 0 ? "bg-card" : "bg-muted/30";
  const sd = field.suggested_disposition ?? "";
  const accepted = sd && disp === sd;

  return (
    <tr className={`border-b border-border transition-colors hover:bg-muted/50 ${DISP_ROW[disp] || stripe}`}>
      <td className="px-3 py-2 align-middle min-w-[220px]">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-foreground break-words [overflow-wrap:anywhere] line-clamp-2">{field.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground/70">{field.fieldKey || "—"}</div>
        </div>
      </td>
      <td className="px-3 py-2 align-middle whitespace-nowrap text-xs text-muted-foreground min-w-[80px]">{field.type || "—"}</td>
      <td className="px-3 py-2 align-middle whitespace-nowrap text-right font-semibold min-w-[90px]">
        <span className={`tabular-nums ${field.count === 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {field.count.toLocaleString()}
        </span>
      </td>
      <td className="px-3 py-2 align-middle whitespace-nowrap text-[10px] text-muted-foreground min-w-[80px]">{fmtDate(field.created_at)}</td>
      <td className="px-3 py-2 align-middle whitespace-nowrap text-[10px] text-muted-foreground min-w-[100px]">{field.created_by || "—"}</td>
      <td className="px-3 py-2 align-middle text-[10px] text-muted-foreground min-w-[120px]">{field.form_refs.length > 0 ? field.form_refs.join(", ") : "—"}</td>
      <td className="px-3 py-2 align-middle min-w-[220px]">
        {sd ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${DISP_BADGE[sd]}`}>{DISP_LABEL[sd]}</span>
              <button
                onClick={() => set(patchFromSuggestion(field, ann.description))}
                title={accepted ? "Already applied" : "Apply this suggestion to the Disposition"}
                className={`ml-auto shrink-0 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${accepted ? "border-emerald-400 text-emerald-700 dark:text-emerald-400" : "border-input text-foreground hover:bg-muted"}`}>
                <Check className="h-3 w-3" /> {accepted ? "applied" : "accept"}
              </button>
            </div>
            {field.suggested_reason && <div className="text-[11px] leading-snug text-muted-foreground line-clamp-2" title={field.suggested_reason}>{field.suggested_reason}</div>}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2 align-middle min-w-[140px]">
        <select className={`${sel} ${disp ? "font-semibold" : ""}`} value={disp} onChange={(e) => set({ disposition: e.target.value as Disposition })}>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-middle min-w-[180px]">
        <input className={inp} placeholder="What does this field do / why exists?" value={ann.description} onChange={(e) => set({ description: e.target.value })} />
      </td>
      <td className="px-3 py-2 align-middle min-w-[120px]">
        <input className={inp} placeholder="Notes…" value={ann.notes} onChange={(e) => set({ notes: e.target.value })} />
      </td>
    </tr>
  );
}

export default function CustomFields() {
  const [data, setData] = useState<FieldData | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, Ann>>(loadAnnotations);
  const [search, setSearch] = useState("");
  const [filterDisp, setFilterDisp] = useState<Disposition | "all">("all");
  const [filterType, setFilterType] = useState("all");
  const [filterUsage, setFilterUsage] = useState("all");
  const [filterSuggest, setFilterSuggest] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"fields" | "folders">("fields");
  const [redesign, setRedesign] = useState<RedesignDoc | null>(null);

  useEffect(() => {
    fetch("/custom_fields.json").then((r) => r.json()).then(setData).catch(() => setData(null));
    fetch("/folder_redesign.json").then((r) => r.json()).then(setRedesign).catch(() => setRedesign(null));
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

  const applyMany = useCallback((rows: CustomField[]) => {
    setAnnotations((prev) => {
      const next = { ...prev };
      for (const f of rows) {
        if (!f.suggested_disposition) continue;
        const cur = next[f.id] ?? EMPTY_ANN;
        next[f.id] = { ...cur, ...patchFromSuggestion(f, cur.description) };
      }
      saveAnnotations(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, []);

  const fields = data?.fields ?? [];

  function handleSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let f = fields;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((x) => x.name.toLowerCase().includes(q) || x.fieldKey.toLowerCase().includes(q));
    }
    if (filterDisp !== "all") f = f.filter((x) => (annotations[x.id]?.disposition ?? "") === filterDisp);
    if (filterType !== "all") f = f.filter((x) => x.type === filterType);
    if (filterUsage === "unused") f = f.filter((x) => x.count === 0);
    else if (filterUsage === "used") f = f.filter((x) => x.count > 0);
    if (filterSuggest === "yes") f = f.filter((x) => x.suggested_disposition);
    else if (filterSuggest === "no") f = f.filter((x) => !x.suggested_disposition);
    return f;
  }, [fields, search, filterDisp, filterType, filterUsage, filterSuggest, annotations]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "count") cmp = a.count - b.count;
      else if (sortBy === "type") cmp = a.type.localeCompare(b.type);
      else if (sortBy === "key") cmp = a.fieldKey.localeCompare(b.fieldKey);
      else if (sortBy === "disposition") cmp = (annotations[a.id]?.disposition ?? "").localeCompare(annotations[b.id]?.disposition ?? "");
      else if (sortBy === "created") cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      else if (sortBy === "created_by") cmp = (a.created_by ?? "").localeCompare(b.created_by ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, annotations]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterDisp, filterType, filterUsage, sortBy, sortDir]);

  const stats = useMemo(() => {
    const c: Record<string, number> = { "": 0, keep: 0, archive: 0, delete: 0, cleanup: 0, skip: 0 };
    for (const f of fields) { const d = annotations[f.id]?.disposition ?? ""; c[d] = (c[d] ?? 0) + 1; }
    return c;
  }, [fields, annotations]);

  const suggestCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of fields) { const s = f.suggested_disposition ?? ""; if (s) c[s] = (c[s] ?? 0) + 1; }
    return c;
  }, [fields]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of fields) c[f.type] = (c[f.type] ?? 0) + 1;
    return c;
  }, [fields]);

  const reviewed = fields.length - (stats[""] ?? 0);
  const pct = fields.length > 0 ? Math.round((reviewed / fields.length) * 100) : 0;
  const types = useMemo(() => Object.keys(typeCounts).sort(), [typeCounts]);
  const unused = fields.filter((f) => f.count === 0).length;

  function exportCSV() {
    const head = ["id", "name", "fieldKey", "type", "contact_count", "created_at", "form_refs", "disposition", "description", "notes"];
    const rows = [head];
    for (const f of fields) {
      const a = annotations[f.id] ?? EMPTY_ANN;
      rows.push([f.id, f.name, f.fieldKey, f.type, String(f.count), f.created_at ?? "", f.form_refs.join(" | "), a.disposition, a.description, a.notes]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mwc-field-rationale.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function acceptVisible() {
    const n = sorted.filter((f) => f.suggested_disposition).length;
    if (!n) return;
    if (window.confirm(`Apply the AI-suggested disposition to all ${n} fields matching the current filters? You can still change any of them.`)) {
      applyMany(sorted);
    }
  }

  const thCls = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border select-none";
  const thBtn = "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors";
  const btnBase = "rounded border border-gray-400 dark:border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <PageShell
      title="Custom fields library"
      subtitle={`${fields.length} custom fields · ${data?.total_contacts.toLocaleString() ?? 0} contacts scanned · pulled ${data?.pulled_at ?? "…"}`}
      actions={
        <div className="flex items-center gap-2">
          {saved && <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Saved</span>}
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded border border-gray-400 dark:border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      }
    >
      {/* Fields | Folders tabs */}
      <div className="inline-flex rounded-lg border border-gray-400 dark:border-border bg-muted/40 p-0.5">
        {([["fields", "Fields"], ["folders", "Folder redesign"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${tab === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {v === "folders" && <FolderTree className="h-3.5 w-3.5" />}{label}
            {v === "folders" && redesign && <span className="rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">NEW</span>}
          </button>
        ))}
      </div>

      {tab === "folders" && (redesign
        ? <FoldersView doc={redesign} />
        : <div className="py-12 text-center text-sm text-muted-foreground">Loading proposed taxonomy…</div>)}

      {tab === "fields" && <>
      {/* Usage stats */}
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Field usage (contacts with values)</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { key: "total", label: "Total fields", value: fields.length, cls: "text-foreground", sub: "" },
            { key: "used", label: "Used", value: fields.length - unused, cls: "text-emerald-600 dark:text-emerald-400", sub: `${unused} unused` },
            { key: "unused", label: "Unused", value: unused, cls: "text-red-600 dark:text-red-400", sub: "0 contacts" },
          ].map((s) => (
            <button key={s.key}
              onClick={() => { if (s.key !== "total") { setFilterUsage(filterUsage === s.key ? "all" : s.key); setPage(1); } }}
              className={`text-left rounded-lg border bg-card p-3 transition-colors ${s.key !== "total" ? "hover:border-foreground/30 cursor-pointer" : "cursor-default"} ${filterUsage === s.key ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border"}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</div>
              {s.sub && <div className="text-[10px] text-muted-foreground">{s.sub}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Review progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {reviewed} of {fields.length} reviewed
            {(stats.keep + stats.delete + stats.archive + stats.cleanup) > 0 && (
              <span className="ml-2">· <span className="text-emerald-600 dark:text-emerald-400">{stats.keep} keep</span> · <span className="text-red-600 dark:text-red-400">{stats.delete} delete</span> · <span className="text-sky-600 dark:text-sky-400">{stats.archive} archive</span> · <span className="text-amber-600 dark:text-amber-400">{stats.cleanup} cleanup</span></span>
            )}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* AI suggestions summary */}
      {(suggestCounts.keep || suggestCounts.cleanup || suggestCounts.archive || suggestCounts.delete) > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">AI suggestions:</span>
          {(["keep", "cleanup", "archive", "delete"] as const).map((k) => (
            <button key={k} onClick={() => { setFilterSuggest(filterSuggest === k ? "all" : k); setPage(1); }}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${DISP_BADGE[k]} ${filterSuggest === k ? "ring-2 ring-violet-500" : ""}`}>
              {suggestCounts[k] ?? 0} {DISP_LABEL[k]}
            </button>
          ))}
          <span className="text-xs text-violet-700/80 dark:text-violet-400/80">advisory — click a chip to filter, then "Accept all" or accept per-row</span>
          <button onClick={acceptVisible} className="ml-auto inline-flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
            <Check className="h-3.5 w-3.5" /> Accept all shown ({sorted.filter((f) => f.suggested_disposition).length})
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input className="h-8 w-52 rounded border border-gray-400 dark:border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          placeholder="Search field names or keys…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-8 rounded border border-gray-400 dark:border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterUsage} onChange={(e) => { setFilterUsage(e.target.value); setPage(1); }}>
          <option value="all">All usage</option>
          <option value="used">Used</option>
          <option value="unused">Unused (0 contacts)</option>
        </select>
        <select className="h-8 rounded border border-gray-400 dark:border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="h-8 rounded border border-gray-400 dark:border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterDisp} onChange={(e) => { setFilterDisp(e.target.value as Disposition | "all"); setPage(1); }}>
          <option value="all">My disp: all</option>
          {DISP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label || "Unreviewed"}</option>)}
        </select>
        <select className="h-8 rounded border border-gray-400 dark:border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring" value={filterSuggest} onChange={(e) => { setFilterSuggest(e.target.value); setPage(1); }}>
          <option value="all">AI: all</option>
          <option value="yes">AI: has suggestion</option>
          <option value="no">AI: no suggestion</option>
        </select>
        <span className="text-sm font-medium text-muted-foreground">{filtered.length} matching</span>
        {(search || filterDisp !== "all" || filterType !== "all" || filterUsage !== "all" || filterSuggest !== "all") && (
          <button onClick={() => { setSearch(""); setFilterDisp("all"); setFilterType("all"); setFilterUsage("all"); setFilterSuggest("all"); setPage(1); }}
            className="rounded border border-gray-400 dark:border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">Clear filters</button>
        )}
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm border-collapse">
            <thead>
              <tr>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("name")}>Name <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("key")}>Field Key <SortIcon col="key" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("type")}>Type <SortIcon col="type" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={`${thCls} text-right`}><div className={`${thBtn} justify-end`} onClick={() => handleSort("count")}>Non-Null Records <SortIcon col="count" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("created")}>Created Date <SortIcon col="created" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("created_by")}>Created By <SortIcon col="created_by" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}>Forms Using</th>
                <th className={thCls}>AI Suggestion</th>
                <th className={thCls}><div className={thBtn} onClick={() => handleSort("disposition")}>My disposition <SortIcon col="disposition" sortBy={sortBy} sortDir={sortDir} /></div></th>
                <th className={thCls}>Description</th>
                <th className={thCls}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((field, i) => (
                <FieldRow key={field.id} field={field} ann={annotations[field.id] ?? EMPTY_ANN} onChange={update} rowIdx={i} />
              ))}
              {pageSlice.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-12 text-center text-sm text-muted-foreground bg-card">No fields match the current filters.</td></tr>
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
                <button key={p} onClick={() => setPage(p)} className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors border-gray-400 dark:border-border ${p === safePage ? "border-foreground/40 bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}>{p}</button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className={`${btnBase} flex items-center gap-1`}>Next <ChevronRight className="h-3 w-3" /></button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className={btnBase}>»</button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Field names, types, and contact counts from GHL. Annotations auto-save to your browser; Export CSV for handoff. No PHI — field definitions only.
      </p>
      </>}
    </PageShell>
  );
}
