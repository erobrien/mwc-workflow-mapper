import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-sm border-2 border-border bg-card text-card-foreground shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

/* ---------- Badge / pill ----------
   Palette is MWC: navy on cream (neutral), orange (go), destructive.
   Legacy tone names (blue, purple, warning) map back to the neutral
   navy chip so we do not paint the site rainbow. Orange stays the
   period accent used only for "go" chips and small marks. */
type Tone = "neutral" | "good" | "warning" | "red" | "blue" | "muted" | "accent" | "purple";
const NEUTRAL = "bg-transparent text-foreground ring-1 ring-inset ring-border";
const NEUTRAL_SOLID = "bg-muted text-foreground ring-1 ring-inset ring-border";
const ORANGE = "bg-accent text-accent-foreground ring-1 ring-inset ring-accent";
const INVERSE =
  "bg-primary text-primary-foreground ring-1 ring-inset ring-primary dark:bg-accent dark:text-accent-foreground dark:ring-accent";
const DESTRUCTIVE = "bg-destructive text-destructive-foreground ring-1 ring-inset ring-destructive";

const TONES: Record<Tone, string> = {
  neutral: NEUTRAL,
  good: ORANGE,
  accent: ORANGE,
  warning: INVERSE,
  red: DESTRUCTIVE,
  blue: NEUTRAL,
  purple: NEUTRAL,
  muted: NEUTRAL_SOLID,
};
export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
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
        <div className="inline-flex flex-wrap gap-1 rounded-sm border-2 border-border bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.value} onClick={() => set(t.value)}
              className={cn("rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
                value === t.value
                  ? "border-2 border-accent bg-card text-foreground"
                  : "border-2 border-transparent text-foreground/70 hover:text-foreground")}>
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
  return <div className="w-full overflow-x-auto rounded-sm border-2 border-border"><table className="w-full text-sm">{children}</table></div>;
}
export function TH({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("border-b-2 border-border bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-foreground", className)}>{children}</th>;
}
export function TD({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("border-b border-border px-3 py-2 align-top text-foreground", className)}>{children}</td>;
}

/* ---------- Alert ---------- */
export function Alert({ tone = "neutral", title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  const accent =
    tone === "red" ? "border-l-destructive"
    : tone === "good" || tone === "accent" || tone === "warning" ? "border-l-accent"
    : "border-l-foreground/40";
  return (
    <div className={cn("rounded-sm border-2 border-border border-l-[4px] bg-card p-4", accent)}>
      {title && <div className="mb-1 font-bold text-foreground">{title}</div>}
      {children && <div className="text-sm text-foreground/90">{children}</div>}
    </div>
  );
}

/* ---------- Theme ----------
   Storage key is `theme-v2`. Light is the default (paper). Toggle
   persists. First paint is handled by the inline script in
   index.html so there is no flash. */
const THEME_KEY = "theme-v2";
export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s) return s === "dark";
    } catch { /* ignore */ }
    return false;
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

/* ---------- Loading / error ---------- */
export function Loading() {
  return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>;
}

/* Stat: navy value + orange rule when it means "go". No hero-metric template. */
export function Stat({ label, value, note, tone = "neutral" }: { label: string; value: ReactNode; note?: string; tone?: Tone }) {
  const rule = tone === "good" || tone === "accent" ? "bg-accent" : tone === "red" ? "bg-destructive" : "bg-foreground/60";
  return (
    <Card>
      <CardContent className="relative overflow-hidden p-4">
        <span className={cn("absolute inset-x-0 top-0 h-[3px]", rule)} />
        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/70">{label}</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
        {note && <div className="mt-1 text-xs font-medium text-foreground/70">{note}</div>}
      </CardContent>
    </Card>
  );
}
