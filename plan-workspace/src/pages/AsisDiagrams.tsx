import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading, useTheme } from "../components/ui";

interface Diagram { key: string; title: string; caption: string; src: string; }

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

  return (
    <PageShell
      title="As-is workflow diagrams — live re-map (2026-07-22)"
      subtitle={`${diagrams.length} diagrams of the account as it runs today, refreshed against the 2026-07-22 live re-extraction — grounded strictly in the extracted GHL data. Green = live/published, gray = draft-only, red = confirmed multi-writer race or duplicated/broken logic. This is current reality, not the target design.`}
    >
      <div className="space-y-8">
        {diagrams.map((d) => (
          <section key={d.key}>
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="red">As-Is · today</Badge>
              <h2 className="text-base font-semibold">{d.title.replace(/^AS-IS:\s*/, "")}</h2>
            </div>
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
