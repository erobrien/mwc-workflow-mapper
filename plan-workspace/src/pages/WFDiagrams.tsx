import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Loading, useTheme } from "../components/ui";

interface Diagram { key: string; title: string; caption: string; src: string; }

export default function WFDiagrams() {
  const { dark } = useTheme();
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => { fetch("/wf-diagrams.json").then((r) => r.json()).then(setDiagrams).catch(() => setDiagrams([])); }, []);

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
          const { svg } = await mermaid.render(`wf-${d.key}-${dark ? "d" : "l"}`, d.src);
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

  return (
    <PageShell
      title="To-be workflow diagrams"
      subtitle={`${diagrams.length} diagrams — master journey map, per-workflow step flows, and support cluster. Each shows triggers, timing, branches, and exits.`}
    >
      <div className="space-y-8">
        {diagrams.map((d) => (
          <section key={d.key}>
            <h2 className="mb-0.5 text-base font-semibold">{d.title}</h2>
            <p className="mb-3 max-w-3xl text-sm text-muted-foreground">{d.caption}</p>
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
