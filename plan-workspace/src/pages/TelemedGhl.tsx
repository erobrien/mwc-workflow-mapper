import { useState, useMemo } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";

const SCOPE_META: Record<string, { label: string; badge: string }> = {
  core:     { label: "Core",     badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" },
  use:      { label: "In use",   badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200" },
  portal:   { label: "Portal",   badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200" },
  partial:  { label: "Partial",  badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" },
  deferred: { label: "Deferred", badge: "bg-muted text-muted-foreground" },
};

export default function TelemedGhl() {
  const { data, isLoading } = useTelemed();
  const [filter, setFilter] = useState("all");
  const feats = data?.ghl_features ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of feats) c[f.scope] = (c[f.scope] ?? 0) + 1;
    return c;
  }, [feats]);

  if (isLoading || !data) return <Loading />;
  const shown = filter === "all" ? feats : feats.filter((f) => f.scope === filter);

  return (
    <PageShell
      title="GHL feature map"
      subtitle={`Every GoHighLevel capability mapped to the Virginia Online build — what's core to the 30-day test, what's used, what powers the member portal, and what's deferred. ${feats.length} features.`}
    >
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === "all" ? "border-foreground/40 bg-foreground text-background" : "hover:bg-muted"}`}>
          All {feats.length}
        </button>
        {Object.keys(SCOPE_META).map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${SCOPE_META[s].badge} ${filter === s ? "ring-2 ring-foreground/30" : ""}`}>
            {SCOPE_META[s].label} {counts[s] ?? 0}
          </button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Scope</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">How MWC uses it</th>
            </tr></thead>
            <tbody>
              {shown.map((f) => {
                const m = SCOPE_META[f.scope] ?? SCOPE_META.deferred;
                return (
                  <tr key={f.feature} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium align-top">{f.feature}</td>
                    <td className="px-3 py-2 align-top"><span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.badge}`}>{m.label}</span></td>
                    <td className="px-3 py-2 align-top text-foreground/90">{f.use}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </PageShell>
  );
}
