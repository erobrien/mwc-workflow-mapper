import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ui";

// Shared, lazily-initialised mermaid instance. Large as-is graphs (the 202-step
// lead-capture flows) need a raised maxTextSize / maxEdges, and htmlLabels off is
// not required — securityLevel "loose" keeps <br/> in trigger labels working.
let mermaidMod: any = null;
let initedTheme: string | null = null;

async function getMermaid(dark: boolean) {
  if (!mermaidMod) mermaidMod = (await import("mermaid")).default;
  const theme = dark ? "dark" : "default";
  if (initedTheme !== theme) {
    mermaidMod.initialize({
      startOnLoad: false,
      theme,
      securityLevel: "loose",
      maxTextSize: 500000,
      maxEdges: 6000,
      flowchart: { useMaxWidth: true, htmlLabels: true },
    });
    initedTheme = theme;
  }
  return mermaidMod;
}

let uid = 0;

/**
 * Renders one mermaid source lazily: nothing is rendered until `active` is true
 * (e.g. the accordion is open). Re-renders on theme change. Errors fall back to a
 * readable <pre> instead of blanking the page.
 */
export function MermaidChart({ src, active, zoomable = false }: { src: string; active: boolean; zoomable?: boolean }) {
  const { dark } = useTheme();
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const idRef = useRef(`mmc-${++uid}`);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const m = await getMermaid(dark);
        const { svg } = await m.render(`${idRef.current}-${dark ? "d" : "l"}`, src);
        if (alive) { setSvg(svg); setErr(""); }
      } catch (e: any) {
        if (alive) { setErr(String(e?.message ?? e)); setSvg(""); }
      }
    })();
    return () => { alive = false; };
  }, [src, active, dark]);

  if (!active) return null;
  if (err) return <pre className="whitespace-pre-wrap text-xs text-red-600">{err}</pre>;
  if (!svg) return <div className="py-10 text-center text-sm text-muted-foreground">Rendering diagram…</div>;

  if (!zoomable) {
    return (
      <div
        className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  const step = (d: number) => setZoom((z) => Math.min(4, Math.max(1, Math.round((z + d) * 4) / 4)));
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
        <button onClick={() => step(-0.5)} aria-label="Zoom out"
          className="h-7 w-7 rounded text-sm font-bold leading-none hover:bg-muted" title="Zoom out">−</button>
        <span className="w-12 text-center font-mono text-[11px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button onClick={() => step(0.5)} aria-label="Zoom in"
          className="h-7 w-7 rounded text-sm font-bold leading-none hover:bg-muted" title="Zoom in">+</button>
        <button onClick={() => setZoom(1)} aria-label="Reset zoom"
          className="h-7 rounded px-1.5 text-[11px] hover:bg-muted" title="Fit">Fit</button>
      </div>
      <div className="mermaid-host overflow-auto rounded-md" style={{ maxHeight: "75vh" }}>
        <div style={{ width: `${zoom * 100}%` }}
          className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
