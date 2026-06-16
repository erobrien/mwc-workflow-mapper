import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, toneFor } from "../components/ui";
import { Copy, Check, ChevronDown } from "lucide-react";

interface Prompt {
  id: string; step: string; title: string; status: string;
  goal?: string; inputs?: string[]; prompt: string; validates?: string[]; outputs?: string[];
}

function PromptCard({ p }: { p: Prompt }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(p.prompt).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Card className={p.status.startsWith("P0") ? "border-l-4 border-l-destructive" : ""}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">{p.step}</span>
          <Badge tone={p.status.startsWith("P0") ? "red" : toneFor(p.status)}>{p.status}</Badge>
          <button onClick={copy} className="ms-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
            {copied ? <><Check className="h-3 w-3 text-emerald-600" /> Copied</> : <><Copy className="h-3 w-3" /> Copy prompt</>}
          </button>
        </div>
        <div className="mt-1.5 font-semibold">{p.title}</div>
        {p.goal && <p className="mt-1 text-sm text-muted-foreground">{p.goal}</p>}

        {p.inputs && p.inputs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.inputs.map((x, i) => <span key={i} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{x}</span>)}
          </div>
        )}

        <button onClick={() => setOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /> {open ? "Hide" : "Show"} prompt
        </button>
        {open && (
          <pre className="mt-2 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-[12px] leading-relaxed">{p.prompt}</pre>
        )}

        {(p.validates?.length || p.outputs?.length) && open && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {p.validates && p.validates.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Validates</div>
                <ul className="list-disc space-y-0.5 ps-4 text-xs text-foreground/90">{p.validates.map((v, i) => <li key={i}>{v}</li>)}</ul>
              </div>
            )}
            {p.outputs && p.outputs.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outputs</div>
                <ul className="list-disc space-y-0.5 ps-4 text-xs text-foreground/90">{p.outputs.map((v, i) => <li key={i}>{v}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  useEffect(() => { fetch("/prompts.json").then((r) => r.json()).then(setPrompts).catch(() => setPrompts([])); }, []);
  if (!prompts) return <Loading />;
  const p0 = prompts.filter((p) => p.status.startsWith("P0"));

  return (
    <PageShell
      title="Execution prompts"
      subtitle={`${prompts.length} sequenced prompts. Each runs against the GHL API with a dry-run preview; a human approves every gate. ${p0.length} are P0 — run first.`}
    >
      <div className="space-y-3">
        {prompts.map((p) => <PromptCard key={p.id} p={p} />)}
      </div>
    </PageShell>
  );
}
