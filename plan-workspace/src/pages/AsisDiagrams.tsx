import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading, useTheme, cn } from "../components/ui";
import { ShieldAlert, Gauge, EyeOff, ListTree } from "lucide-react";

interface Issue { type: "defect" | "bottleneck" | "data_loss"; node_ids: string[]; note: string; }
interface Diagram { key: string; title: string; caption: string; src: string; issues?: Issue[]; }

const ISSUE_META: Record<string, { label: string; icon: any; badgeTone: "red" | "warning" | "muted"; dot: string }> = {
  defect: { label: "Defect", icon: ShieldAlert, badgeTone: "red", dot: "bg-red-600" },
  bottleneck: { label: "Bottleneck", icon: Gauge, badgeTone: "warning", dot: "bg-amber-600" },
  data_loss: { label: "Data loss", icon: EyeOff, badgeTone: "muted", dot: "bg-slate-500" },
};

function IssuePanel({ issues }: { issues: Issue[] }) {
  const counts = { defect: 0, bottleneck: 0, data_loss: 0 };
  for (const i of issues) counts[i.type]++;
  return (
    <div className="mb-3 rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problems flagged in this diagram</span>
        <div className="ms-auto flex gap-1.5">
          {counts.defect > 0 && <Badge tone="red">{counts.defect} defect{counts.defect > 1 ? "s" : ""}</Badge>}
          {counts.bottleneck > 0 && <Badge tone="warning">{counts.bottleneck} bottleneck{counts.bottleneck > 1 ? "s" : ""}</Badge>}
          {counts.data_loss > 0 && <Badge tone="muted">{counts.data_loss} data loss</Badge>}
        </div>
      </div>
      <ul className="space-y-1.5">
        {issues.map((issue, i) => {
          const meta = ISSUE_META[issue.type];
          const Icon = meta.icon;
          return (
            <li key={i} className="flex gap-2 text-sm">
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0",
                issue.type === "defect" ? "text-red-600 dark:text-red-400" :
                issue.type === "bottleneck" ? "text-amber-600 dark:text-amber-400" :
                "text-slate-500 dark:text-slate-400")} />
              <span>
                <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">[{issue.node_ids.join(", ")}]</span>
                <span className="text-foreground/90">{issue.note}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AsisDiagrams() {
  const { dark } = useTheme();
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => { fetch("/wf-diagrams-asis.json").then((r) => r.json()).then(setDiagrams).catch(() => setDiagrams([])); }, []);

  useEffect(() => {
    if (!diagrams) return;
    let alive = true;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "loose",
        flowchart: { useMaxWidth: true, htmlLabels: true },
      });
      const next: Record<string, string> = {};
      for (const d of diagrams) {
        try {
          const { svg } = await mermaid.render(`asis-${d.key}-${dark ? "d" : "l"}`, d.src);
          next[d.key] = svg;
        } catch (e: any) {
          next[d.key] = `<pre class="text-xs text-red-600 whitespace-pre-wrap">${String(e?.message ?? e)}</pre>`;
        }
        if (!alive) return;
        setSvgs({ ...next });
      }
    })();
    return () => { alive = false; };
  }, [diagrams, dark]);

  if (!diagrams) return <Loading />;

  const totalIssues = diagrams.reduce((s, d) => s + (d.issues?.length ?? 0), 0);
  const totalDefects = diagrams.reduce((s, d) => s + (d.issues?.filter((i) => i.type === "defect").length ?? 0), 0);
  const totalBottlenecks = diagrams.reduce((s, d) => s + (d.issues?.filter((i) => i.type === "bottleneck").length ?? 0), 0);
  const totalDataLoss = diagrams.reduce((s, d) => s + (d.issues?.filter((i) => i.type === "data_loss").length ?? 0), 0);

  return (
    <PageShell
      title="As-is workflow diagrams — live re-map (2026-07-22)"
      subtitle={`${diagrams.length} diagrams of the account as it runs today, refreshed against the 2026-07-22 live re-extraction and the attribution audit — grounded strictly in the extracted GHL data. Every diagram below has an explicit "Problems flagged" panel calling out exactly where defects, bottlenecks, and data loss occur, with the affected node IDs highlighted directly in the graph. This is current reality, not the target design.`}
    >
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-destructive"><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Defects flagged</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{totalDefects}</div>
          <div className="mt-1 text-xs text-muted-foreground">confirmed multi-writer races, wrong writes</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bottlenecks flagged</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{totalBottlenecks}</div>
          <div className="mt-1 text-xs text-muted-foreground">oversized branches, per-location clones</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-slate-400"><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data loss points flagged</div>
          <div className="mt-1 text-2xl font-bold text-slate-500 dark:text-slate-400">{totalDataLoss}</div>
          <div className="mt-1 text-xs text-muted-foreground">orphaned triggers, dropped attribution</div>
        </CardContent></Card>
      </div>

      <div className="space-y-8">
        {diagrams.map((d) => (
          <section key={d.key}>
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="red">As-Is · today</Badge>
              <h2 className="text-base font-semibold">{d.title.replace(/^AS-IS:\s*/, "")}</h2>
            </div>
            <p className="mb-3 max-w-3xl text-sm text-muted-foreground">{d.caption}</p>
            {d.issues && d.issues.length > 0 && <IssuePanel issues={d.issues} />}
            <Card><CardContent className="p-4">
              {svgs[d.key]
                ? <div className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svgs[d.key] }} />
                : <div className="py-8 text-center text-sm text-muted-foreground">Rendering…</div>}
            </CardContent></Card>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
