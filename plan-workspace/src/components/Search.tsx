import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, ExternalLink, CornerDownLeft } from "lucide-react";
import { useData } from "../lib/data";
import { ghlWorkflow, ghlPipelines, ghlFields } from "../lib/ghl";
import { cn } from "./ui";

interface Hit { type: string; label: string; to: string; ghl?: string; sub?: string; tone: string; }

const TONE: Record<string, string> = {
  Workflow: "text-sky-700 dark:text-sky-400",
  "Target workflow": "text-emerald-700 dark:text-emerald-400",
  Pipeline: "text-emerald-700 dark:text-emerald-400",
  Field: "text-amber-700 dark:text-amber-400",
  Decision: "text-foreground", Risk: "text-red-700 dark:text-red-400",
  Message: "text-muted-foreground",
};

export function GlobalSearch() {
  const { data } = useData();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loc = data?.location_id ?? "Ghstz8eIsHWLeXek47dk";

  const index = useMemo<Hit[]>(() => {
    if (!data) return [];
    const h: Hit[] = [];
    for (const w of data.as_is_workflows) h.push({ type: "Workflow", label: w.name, to: `/workflow/${w.id}`, ghl: ghlWorkflow(loc, w.id), sub: w.status, tone: TONE.Workflow });
    for (const w of data.tobe_workflows) h.push({ type: "Target workflow", label: `${w.n}. ${w.name}`, to: "/to-be/workflows", sub: w.absorbs, tone: TONE["Target workflow"] });
    for (const p of data.pipelines) h.push({ type: "Pipeline", label: p.name, to: "/to-be/pipelines", ghl: ghlPipelines(loc), sub: p.role, tone: TONE.Pipeline });
    for (const f of data.fields) h.push({ type: "Field", label: f.name, to: "/inventory", ghl: ghlFields(loc), sub: `${f.model} · ${f.key}`, tone: TONE.Field });
    for (const d of data.decisions) h.push({ type: "Decision", label: d.decision, to: "/decisions", sub: d.status, tone: TONE.Decision });
    for (const r of data.risks) h.push({ type: "Risk", label: r.area, to: "/risks", sub: r.sev, tone: TONE.Risk });
    return h;
  }, [data, loc]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return index.filter((h) => (h.label + " " + (h.sub ?? "")).toLowerCase().includes(t)).slice(0, 50);
  }, [q, index]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);

  const go = (h: Hit) => { setOpen(false); setQ(""); nav(h.to); };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input ref={inputRef} value={q} onFocusCapture={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && results[active]) go(results[active]);
          }}
          placeholder="Search workflows, fields, decisions…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        <kbd className="hidden rounded border px-1.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[420px] overflow-auto rounded-md border bg-card shadow-lg">
          {results.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">No matches for “{q}”.</div>}
          {results.map((h, i) => (
            <div key={i} onMouseEnter={() => setActive(i)} onClick={() => go(h)}
              className={cn("flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-0", i === active && "bg-muted/60")}>
              <span className={cn("w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider", h.tone)}>{h.type}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{h.label || "—"}</div>
                {h.sub && <div className="truncate text-[11px] text-muted-foreground">{h.sub}</div>}
              </div>
              {h.ghl && (
                <a href={h.ghl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  title="Open in GHL" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </div>
          ))}
          {results.length >= 50 && <div className="px-3 py-2 text-[11px] text-muted-foreground">Showing first 50 — refine your search.</div>}
        </div>
      )}
    </div>
  );
}
