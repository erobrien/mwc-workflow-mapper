import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading, cn, useTheme } from "../components/ui";

interface Diagram { key: string; title: string; caption: string; src: string; }
type Mode = "compare" | "asis" | "tobe";

const MODES: { value: Mode; label: string }[] = [
  { value: "compare", label: "Side by side" },
  { value: "asis", label: "As-Is (today)" },
  { value: "tobe", label: "To-Be (target)" },
];

function DiagramPanel({ svg }: { svg: string | undefined }) {
  return (
    <Card><CardContent className="p-4">
      {svg
        ? <div className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        : <div className="py-8 text-center text-sm text-muted-foreground">Rendering…</div>}
    </CardContent></Card>
  );
}

export default function WFDiagrams() {
  const { dark } = useTheme();
  const [tobe, setTobe] = useState<Diagram[] | null>(null);
  const [asis, setAsis] = useState<Diagram[] | null>(null);
  const [mode, setMode] = useState<Mode>("compare");
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/wf-diagrams.json").then((r) => r.json()).then(setTobe).catch(() => setTobe([]));
    fetch("/wf-diagrams-asis.json").then((r) => r.json()).then(setAsis).catch(() => setAsis([]));
  }, []);

  // Pair as-is + to-be by shared key, ordered by the to-be (canonical) list.
  const pairs = useMemo(() => {
    if (!tobe) return null;
    const byKey = new Map((asis ?? []).map((d) => [d.key, d]));
    return tobe.map((t) => ({ key: t.key, tobe: t, asis: byKey.get(t.key) }));
  }, [tobe, asis]);

  // Render every diagram variant sequentially — Mermaid shares a mount, so
  // concurrent render() calls race and only one wins. A serial loop is reliable.
  useEffect(() => {
    if (!pairs) return;
    let alive = true;
    (async () => {
      const jobs: { id: string; src: string }[] = [];
      for (const p of pairs) {
        if (p.asis) jobs.push({ id: `asis-${p.key}`, src: p.asis.src });
        jobs.push({ id: `tobe-${p.key}`, src: p.tobe.src });
      }
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "loose",
        flowchart: { useMaxWidth: true, htmlLabels: true },
      });
      const next: Record<string, string> = {};
      for (const job of jobs) {
        try {
          const { svg } = await mermaid.render(`wf-${job.id}-${dark ? "d" : "l"}`, job.src);
          next[job.id] = svg;
        } catch (e: any) {
          next[job.id] = `<pre class="text-xs text-red-600 whitespace-pre-wrap">${String(e?.message ?? e)}</pre>`;
        }
        if (!alive) return;
        setSvgs({ ...next });
      }
    })();
    return () => { alive = false; };
  }, [pairs, dark]);

  if (!pairs) return <Loading />;

  return (
    <PageShell
      title="Workflow diagrams — As-Is vs To-Be"
      subtitle={`${pairs.length} workflow areas, each with the current fragmented state (grounded in the extracted GHL data) beside the target design. Triggers, timing, branches, and exits.`}
    >
      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {MODES.map((m) => (
          <button key={m.value} onClick={() => setMode(m.value)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {pairs.map((p) => (
          <section key={p.key}>
            <h2 className="mb-0.5 text-base font-semibold">{p.tobe.title}</h2>

            {mode === "compare" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="red">As-Is · today</Badge>
                    {p.asis && <span className="text-sm font-medium">{p.asis.title.replace(/^AS-IS:\s*/, "")}</span>}
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{p.asis?.caption ?? "No as-is diagram."}</p>
                  <DiagramPanel svg={p.asis ? svgs[`asis-${p.key}`] : "<pre class='text-xs text-muted-foreground'>No as-is diagram for this area.</pre>"} />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="good">To-Be · target</Badge>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{p.tobe.caption}</p>
                  <DiagramPanel svg={svgs[`tobe-${p.key}`]} />
                </div>
              </div>
            )}

            {mode === "asis" && (
              <div>
                <div className="mb-1"><Badge tone="red">As-Is · today</Badge></div>
                <p className="mb-2 max-w-3xl text-sm text-muted-foreground">{p.asis?.caption ?? "No as-is diagram for this area."}</p>
                <DiagramPanel svg={p.asis ? svgs[`asis-${p.key}`] : "<pre class='text-xs text-muted-foreground'>No as-is diagram for this area.</pre>"} />
              </div>
            )}

            {mode === "tobe" && (
              <div>
                <div className="mb-1"><Badge tone="good">To-Be · target</Badge></div>
                <p className="mb-2 max-w-3xl text-sm text-muted-foreground">{p.tobe.caption}</p>
                <DiagramPanel svg={svgs[`tobe-${p.key}`]} />
              </div>
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
