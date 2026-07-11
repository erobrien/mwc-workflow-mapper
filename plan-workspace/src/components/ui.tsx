import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground", className)}>{children}</div>;
}
export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

/* ---------- Badge / pill ---------- */
type Tone = "neutral" | "good" | "warning" | "red" | "blue" | "muted" | "accent" | "purple";
const TONES: Record<Tone, string> = {
  neutral: "bg-slate-200 text-slate-800 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  good: "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  warning: "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  red: "bg-red-100 text-red-900 ring-1 ring-inset ring-red-300 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
  blue: "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  purple: "bg-violet-100 text-violet-900 ring-1 ring-inset ring-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30",
  accent: "bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30",
  muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};
export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}
export function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (/(done|locked|won|ready|complete|good|clean)/.test(s)) return "good";
  if (/(blocked|critical|fail|open)/.test(s)) return "red";
  if (/(progress|warning|review|pending|not started)/.test(s)) return "warning";
  return "neutral";
}

/* ---------- Tabs ---------- */
const TabsCtx = createContext<{ value: string; set: (v: string) => void } | null>(null);
export function Tabs({ tabs, initial, children }: { tabs: { value: string; label: string }[]; initial?: string; children: ReactNode }) {
  const [value, set] = useState(initial ?? tabs[0].value);
  return (
    <TabsCtx.Provider value={{ value, set }}>
      <div className="space-y-4">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {tabs.map((t) => (
            <button key={t.value} onClick={() => set(t.value)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                value === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </TabsCtx.Provider>
  );
}
export function TabPanel({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

/* ---------- Table ---------- */
export function Table({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}
export function TH({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("border-b px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}
export function TD({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("border-b px-3 py-2 align-top", className)}>{children}</td>;
}

/* ---------- Alert ---------- */
export function Alert({ tone = "neutral", title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  const border = tone === "red" ? "border-l-destructive" : tone === "warning" ? "border-l-amber-500" : tone === "good" ? "border-l-emerald-500" : "border-l-primary";
  return (
    <div className={cn("rounded-md border border-l-4 bg-card p-4", border)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      {children && <div className="text-sm text-foreground/90">{children}</div>}
    </div>
  );
}

/* ---------- Theme ---------- */
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem("theme");
    if (s) return s === "dark";
    return false; // default light
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

/* ---------- Loading / error ---------- */
export function Loading() {
  return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading data.json…</div>;
}
const STAT_ACCENT: Record<string, { bar: string; value: string }> = {
  neutral: { bar: "bg-primary", value: "text-foreground" },
  good: { bar: "bg-emerald-500", value: "text-emerald-600 dark:text-emerald-400" },
  warning: { bar: "bg-amber-500", value: "text-amber-600 dark:text-amber-400" },
  red: { bar: "bg-red-500", value: "text-red-600 dark:text-red-400" },
  blue: { bar: "bg-sky-500", value: "text-sky-600 dark:text-sky-400" },
  accent: { bar: "bg-orange-500", value: "text-orange-600 dark:text-orange-400" },
  purple: { bar: "bg-violet-500", value: "text-violet-600 dark:text-violet-400" },
  muted: { bar: "bg-border", value: "text-foreground" },
};
export function Stat({ label, value, note, tone = "neutral" }: { label: string; value: ReactNode; note?: string; tone?: Tone }) {
  const a = STAT_ACCENT[tone] ?? STAT_ACCENT.neutral;
  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute inset-y-0 left-0 w-1", a.bar)} />
      <CardContent className="p-4 pl-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-2xl font-bold", a.value)}>{value}</div>
        {note && <div className={cn("mt-1 text-xs", tone === "red" ? "text-destructive" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{note}</div>}
      </CardContent>
    </Card>
  );
}
