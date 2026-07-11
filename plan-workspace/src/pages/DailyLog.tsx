import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Loading } from "../components/ui";

interface LogEntry {
  date: string;
  time?: string;
  actor: string;
  category: string;
  summary: string;
  ref?: string;
}
interface DailyLogData {
  _note?: string;
  entries: LogEntry[];
}

const REPO_COMMIT_BASE = "https://github.com/erobrien/mwc-workflow-mapper/commit/";

const ACTOR_BADGE: Record<string, string> = {
  Eric: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  Computer: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
  "Claude Code": "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
  Vendor: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  System: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const CATEGORY_BADGE: Record<string, string> = {
  extraction: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
  spec: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
  build: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  audit: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  incident: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
  decision: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  deploy: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
  investigation: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
};

const badge = (map: Record<string, string>, key: string) =>
  map[key] ?? "bg-muted text-muted-foreground";

const SHA_RE = /^[0-9a-f]{7,40}$/i;

function fmtDateHeader(d: string): string {
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function RefChip({ value }: { value: string }) {
  const cls = "inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground";
  if (SHA_RE.test(value)) {
    return (
      <a href={REPO_COMMIT_BASE + value} target="_blank" rel="noreferrer"
        className={`${cls} hover:text-foreground hover:underline`}>
        {value}
      </a>
    );
  }
  return <span className={cls}>{value}</span>;
}

export default function DailyLog() {
  const [data, setData] = useState<DailyLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/daily-log.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ entries: [] }))
      .finally(() => setLoading(false));
  }, []);

  const entries = data?.entries ?? [];

  const actors = useMemo(() => Array.from(new Set(entries.map((e) => e.actor))).sort(), [entries]);
  const categories = useMemo(() => Array.from(new Set(entries.map((e) => e.category))).sort(), [entries]);

  const filtered = useMemo(() => {
    let e = entries;
    if (actor !== "all") e = e.filter((x) => x.actor === actor);
    if (category !== "all") e = e.filter((x) => x.category === category);
    if (search) {
      const q = search.toLowerCase();
      e = e.filter((x) =>
        x.summary.toLowerCase().includes(q) ||
        (x.ref ?? "").toLowerCase().includes(q) ||
        x.actor.toLowerCase().includes(q) ||
        x.category.toLowerCase().includes(q));
    }
    return e;
  }, [entries, actor, category, search]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [entries]);

  const dateRange = useMemo(() => {
    if (entries.length === 0) return "";
    const dates = entries.map((e) => e.date).sort();
    return `${dates[0]} to ${dates[dates.length - 1]}`;
  }, [entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (loading || !data) return <Loading />;

  const filterActive = actor !== "all" || category !== "all" || !!search;

  return (
    <PageShell
      title="Daily Log"
      subtitle="Running history of actions taken on the MWC GHL transformation, so anyone can see what happened and when."
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total entries</div>
            <div className="mt-1 text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categories</div>
            <div className="mt-1 text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date range</div>
            <div className="mt-1 font-mono text-sm font-semibold">{dateRange}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(category === c ? "all" : c)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${badge(CATEGORY_BADGE, c)} ${category === c ? "ring-2 ring-foreground/30" : ""}`}>
            {c} <span className="tabular-nums opacity-70">{categoryCounts[c]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-8 w-56 rounded border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
          placeholder="Search summaries, refs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
          value={actor} onChange={(e) => setActor(e.target.value)}>
          <option value="all">All actors</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="h-8 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
          value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm font-medium text-muted-foreground">{filtered.length} matching</span>
        {filterActive && (
          <button onClick={() => { setActor("all"); setCategory("all"); setSearch(""); }}
            className="rounded border border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">Clear filters</button>
        )}
      </div>

      {/* Grouped entries */}
      <div className="space-y-6">
        {grouped.map(([date, items]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-3 border-b pb-1.5">
              <h2 className="text-sm font-bold tracking-tight">{fmtDateHeader(date)}</h2>
              <span className="font-mono text-xs text-muted-foreground">{date}</span>
              <span className="ms-auto text-xs text-muted-foreground">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
            </div>
            <div className="space-y-2">
              {items.map((e, i) => (
                <Card key={`${date}-${i}`}>
                  <CardContent className="p-4">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {e.time && <span className="font-mono text-xs text-muted-foreground">{e.time}</span>}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge(ACTOR_BADGE, e.actor)}`}>{e.actor}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge(CATEGORY_BADGE, e.category)}`}>{e.category}</span>
                      {e.ref && <span className="ms-auto"><RefChip value={e.ref} /></span>}
                    </div>
                    <div className="text-sm text-foreground/90">{e.summary}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No entries match the current filters.</div>
        )}
      </div>
    </PageShell>
  );
}
