import { useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";

export default function TelemedWorkflows() {
  const { data, isLoading } = useTelemed();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");
  const wfs = data?.workflows ?? [];

  if (isLoading || !data) return <Loading />;
  const shown = filter === "all" ? wfs : wfs.filter((w) => w.source === filter);
  const docCount = wfs.filter((w) => w.source === "doc").length;
  const addedCount = wfs.filter((w) => w.source === "added").length;

  return (
    <PageShell
      title="Workflows"
      subtitle={`${wfs.length} [ONLINE] workflows. Every workflow's first action is a guard (tag check) so a rebuild-team change can't fire it on in-person-only contacts. ${docCount} from the build doc, ${addedCount} added to cover the full member lifecycle.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === "all" ? "border-foreground/40 bg-foreground text-background" : "hover:bg-muted"}`}>All {wfs.length}</button>
        <button onClick={() => setFilter("doc")} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === "doc" ? "border-foreground/40 bg-foreground text-background" : "hover:bg-muted"}`}>From doc {docCount}</button>
        <button onClick={() => setFilter("added")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200 ${filter === "added" ? "ring-2 ring-violet-500" : ""}`}><Zap className="h-3 w-3" /> Added {addedCount}</button>
        <button onClick={() => setOpen(Object.fromEntries(wfs.map((w) => [w.code, true])))} className="ml-auto rounded border px-2 py-1 text-xs hover:bg-muted">Expand all</button>
        <button onClick={() => setOpen({})} className="rounded border px-2 py-1 text-xs hover:bg-muted">Collapse all</button>
      </div>

      <div className="space-y-2">
        {shown.map((w) => {
          const isOpen = open[w.code];
          return (
            <Card key={w.code}>
              <button onClick={() => setOpen((o) => ({ ...o, [w.code]: !o[w.code] }))}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30">
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="font-mono text-xs font-bold text-primary w-10 shrink-0">{w.code}</span>
                <span className="font-medium">{w.name}</span>
                {w.source === "added" && <Badge tone="blue" className="ml-1">added</Badge>}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{w.steps.length} steps</span>
              </button>
              {isOpen && (
                <CardContent className="border-t p-4 pt-3">
                  <div className="mb-3 rounded-md bg-muted/40 p-2 text-xs"><span className="font-semibold">Trigger: </span>{w.trigger}</div>
                  <ol className="space-y-1.5">
                    {w.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                        <span className="text-foreground/90">{s}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
