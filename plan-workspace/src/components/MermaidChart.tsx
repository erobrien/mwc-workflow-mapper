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
export function MermaidChart({ src, active }: { src: string; active: boolean }) {
  const { dark } = useTheme();
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");
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
  return (
    <div
      className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
