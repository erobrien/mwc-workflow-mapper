import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Loading, useTheme } from "../components/ui";

interface Diagram { key: string; title: string; caption: string; src: string; }

export default function Diagrams() {
  const { dark } = useTheme();
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => { fetch("/diagrams.json").then((r) => r.json()).then(setDiagrams).catch(() => setDiagrams([])); }, []);

  // Render every diagram sequentially — Mermaid shares a mount, so concurrent
  // render() calls race and only one wins. A serial loop is reliable.
  useEffect(() => {
    if (!diagrams) return;
    let alive = true;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "loose",
        er: { useMaxWidth: true },
        flowchart: { useMaxWidth: true },
      });
      const next: Record<string, string> = {};
      for (const d of diagrams) {
        try {
          const { svg } = await mermaid.render(`mm-${d.key}-${dark ? "d" : "l"}`, d.src);
          next[d.key] = svg;
        } catch (e: any) {
          next[d.key] = `<pre class="text-xs text-red-600">${String(e?.message ?? e)}</pre>`;
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
      title="Architecture diagrams"
      subtitle="Current state and target architecture, rendered from Mermaid. The target model uses no custom objects."
    >
      <div className="space-y-6">
        {diagrams.map((d) => (
          <section key={d.key}>
            <h2 className="text-base font-semibold">{d.title}</h2>
            <p className="mb-2 max-w-3xl text-sm text-muted-foreground">{d.caption}</p>
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
