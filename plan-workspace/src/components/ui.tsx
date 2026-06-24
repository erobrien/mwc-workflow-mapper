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
type Tone = "neutral" | "good" | "warning" | "red" | "blue" | "muted";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  muted: "bg-muted text-muted-foreground",
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
export function Stat({ label, value, note, tone = "neutral" }: { label: string; value: ReactNode; note?: string; tone?: Tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {note && <div className={cn("mt-1 text-xs", tone === "red" ? "text-destructive" : tone === "good" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-muted-foreground")}>{note}</div>}
      </CardContent>
    </Card>
  );
}
