import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, useTheme } from "../components/ui";
import { useData } from "../lib/data";
import { ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, Variable } from "lucide-react";

interface Branch { label: string; condition: string; path: string; }
interface Step { order: number; action: string; name: string; config: string; branches?: Branch[]; }
interface Message { step: string; channel: string; body: string; }
interface TriggerSetup { type: string; filters: string[]; target: string; }
interface Settings { quiet_hours: string; allow_reentry: string; stop_on_response: string; reentry_caveat: string; status: string; }
interface Variables { principle: string; location_variable: string; custom_values: string[]; }
interface WFDetail {
  purpose: string; diagram_key: string; trigger: TriggerSetup;
  prerequisites: string[]; steps: Step[]; messages: Message[];
  settings: Settings; test: string[]; depends_on: string[]; variables?: Variables;
}
interface Diagram { key: string; title: string; caption: string; src: string; }

const DIAGRAM_SHARED: Record<string, string> = {
  preappt: "This diagram covers WF-03 and WF-04 together (the pre-appointment sequence).",
  "wf07-08": "This diagram covers WF-07 (A&D Nurture) and WF-08 (No-Show and Cancel Recovery).",
  retention: "This diagram covers WF-09 (Long-Term Nurture and Renewal sub-flow) and WF-10 (Feedback Survey).",
  support: "This diagram covers the support cluster: WF-11, WF-13, WF-14, WF-15, WF-16.",
};

function BuildDecision({ text }: { text: string }) {
  const parts = text.split(/(BUILD DECISION NEEDED[^.]*\.?)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("BUILD DECISION NEEDED") ? (
          <span key={i} className="mx-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}{count != null && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export default function ToBeWorkflow() {
  const { n } = useParams<{ n: string }>();
  const { data, isLoading } = useData();
  const { dark } = useTheme();
  const [detail, setDetail] = useState<Record<string, WFDetail> | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    fetch("/tobe-detail.json").then((r) => r.json()).then((d) => setDetail(d.workflows)).catch(() => setDetail({}));
    fetch("/wf-diagrams.json").then((r) => r.json()).then(setDiagrams).catch(() => setDiagrams([]));
  }, []);

  const d = detail && n ? detail[n] : undefined;

  useEffect(() => {
    if (!d || !diagrams) return;
    const dia = diagrams.find((x) => x.key === d.diagram_key);
    if (!dia) return;
    let alive = true;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "loose", flowchart: { useMaxWidth: true, htmlLabels: true }, maxTextSize: 90000, maxEdges: 2000 } as any);
      try {
        const { svg } = await mermaid.render(`tobewf-${d.diagram_key}-${dark ? "d" : "l"}`, dia.src);
        if (alive) setSvg(svg);
      } catch (e: any) {
        if (alive) setSvg(`<pre class="text-xs text-red-600 whitespace-pre-wrap">${String(e?.message ?? e)}</pre>`);
      }
    })();
    return () => { alive = false; };
  }, [d, diagrams, dark]);

  if (isLoading || !data || !detail) return <Loading />;

  const wf = data.tobe_workflows.find((w) => w.n === n);
  if (!wf || !d) {
    return (
      <PageShell title="Workflow not found" subtitle="No such to-be workflow.">
        <Link to="/to-be" className="text-sm text-primary hover:underline">Back to Target</Link>
      </PageShell>
    );
  }

  const nums = data.tobe_workflows.map((w) => w.n);
  const idx = nums.indexOf(n!);
  const prev = idx > 0 ? data.tobe_workflows[idx - 1] : null;
  const next = idx < nums.length - 1 ? data.tobe_workflows[idx + 1] : null;
  const dia = diagrams?.find((x) => x.key === d.diagram_key);
  const writeTone = (s: string) => (s.toLowerCase().includes("opportunity") || s.toLowerCase().startsWith("opp") ? "good" : "blue");

  return (
    <PageShell
      title={`WF-${wf.n} ${wf.name}`}
      subtitle={d.purpose}
      actions={
        <Link to="/to-be" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" /> All workflows
        </Link>
      }
    >
      <div className="space-y-6">
        {wf.copy && (
          <Card><CardContent className="p-4">
            <p className="text-sm text-foreground/90">{wf.copy}</p>
          </CardContent></Card>
        )}

        <Section title="Prerequisites" count={d.prerequisites.length}>
          <Card><CardContent className="p-4">
            <ul className="space-y-1.5 text-sm">
              {d.prerequisites.map((p, i) => (
                <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span><BuildDecision text={p} /></span></li>
              ))}
            </ul>
            {d.depends_on?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Depends on</span>
                {d.depends_on.map((x, i) => <span key={i} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{x}</span>)}
              </div>
            )}
          </CardContent></Card>
        </Section>

        {d.variables && (
          <Section title="Custom values and variables">
            <Card><CardContent className="p-4 space-y-3">
              <div className="rounded-md border-s-2 border-accent bg-accent/5 py-2 ps-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <Variable className="h-3.5 w-3.5" /> Location is a static variable
                </div>
                <p className="text-sm text-foreground/90">{d.variables.principle}</p>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location variable</div>
                <p className="text-sm"><code className="rounded bg-muted px-1 py-0.5 text-[12px]">opportunity.location</code> {d.variables.location_variable.replace('opportunity.location ', '')}</p>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Using custom values</div>
                <ul className="space-y-1.5 text-sm">
                  {d.variables.custom_values.map((c, i) => (
                    <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{c}</span></li>
                  ))}
                </ul>
              </div>
            </CardContent></Card>
          </Section>
        )}

        <Section title="Trigger setup">
          <Card><CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">GHL trigger</span>
              <span className="text-sm font-medium">{d.trigger.type}</span>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filters / conditions</div>
              <ul className="space-y-1 text-sm">
                {d.trigger.filters.map((f, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{f}</span></li>)}
              </ul>
            </div>
            <div className="border-t pt-2 text-sm"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Point at: </span><BuildDecision text={d.trigger.target} /></div>
          </CardContent></Card>
        </Section>

        <Section title="Build steps" count={d.steps.length}>
          <div className="space-y-2">
            {d.steps.map((s) => (
              <Card key={s.order}><CardContent className="p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{s.order}</span>
                  <Badge tone="muted">{s.action}</Badge>
                  <span className="font-mono text-xs font-medium">{s.name}</span>
                </div>
                <p className="ms-8 text-sm text-foreground/90"><BuildDecision text={s.config} /></p>
                {s.branches && (
                  <div className="ms-8 mt-2 space-y-1.5">
                    {s.branches.map((b, i) => (
                      <div key={i} className="rounded border-s-2 border-primary/40 bg-muted/40 py-1.5 ps-3 text-sm">
                        <span className="font-medium">{b.label}</span>
                        <span className="text-muted-foreground"> — if {b.condition} → {b.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            ))}
          </div>
        </Section>

        {d.messages && d.messages.length > 0 && d.messages[0].channel !== "n/a" && (
          <Section title="Message content" count={d.messages.length}>
            <div className="space-y-2">
              {d.messages.map((m, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={m.channel === "SMS" ? "good" : "blue"}>{m.channel}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">{m.step}</span>
                  </div>
                  <p className="whitespace-pre-wrap rounded bg-muted/50 p-2 text-sm"><BuildDecision text={m.body} /></p>
                </CardContent></Card>
              ))}
            </div>
          </Section>
        )}
        {d.messages && d.messages.length > 0 && d.messages[0].channel === "n/a" && (
          <Section title="Messaging">
            <Card><CardContent className="p-4 text-sm text-muted-foreground">{d.messages[0].body}</CardContent></Card>
          </Section>
        )}

        <Section title="Writes and reads">
          <Card><CardContent className="p-4 text-sm text-muted-foreground">
            See the step configs above for exact field writes. WF-05 is the only outcome router and the PCC Sales Form is the sole writer of sale_outcome, sale_type, and value (single-writer guardrail).
          </CardContent></Card>
        </Section>

        <Section title="Settings">
          <Card><CardContent className="p-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quiet hours</dt><dd>{d.settings.quiet_hours}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Allow re-entry</dt><dd>{d.settings.allow_reentry}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stop on response</dt><dd>{d.settings.stop_on_response}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Re-entry caveat</dt><dd>{d.settings.reentry_caveat}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</dt><dd className="font-medium text-amber-700 dark:text-amber-400">{d.settings.status}</dd></div>
            </dl>
          </CardContent></Card>
        </Section>

        <Section title="Test / acceptance" count={d.test.length}>
          <Card><CardContent className="p-4">
            <ul className="space-y-1.5 text-sm">
              {d.test.map((t, i) => (
                <li key={i} className="flex gap-2"><input type="checkbox" className="mt-1 shrink-0" readOnly /><span>{t}</span></li>
              ))}
            </ul>
          </CardContent></Card>
        </Section>

        {wf.absorbs && (
          <Section title="Absorbs (from as-is)">
            <Card><CardContent className="p-4 text-sm text-muted-foreground">{wf.absorbs}</CardContent></Card>
          </Section>
        )}

        {dia && (
          <Section title="Diagram">
            {DIAGRAM_SHARED[d.diagram_key] && (
              <p className="mb-2 text-xs text-muted-foreground">{DIAGRAM_SHARED[d.diagram_key]}</p>
            )}
            <Card><CardContent className="p-4">
              {svg
                ? <div className="mermaid-host overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
                : <div className="py-8 text-center text-sm text-muted-foreground">Rendering…</div>}
            </CardContent></Card>
          </Section>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          {prev ? (
            <Link to={`/to-be/wf/${prev.n}`} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <ChevronLeft className="h-3.5 w-3.5" /> WF-{prev.n} {prev.name}
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/to-be/wf/${next.n}`} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              WF-{next.n} {next.name} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : <span />}
        </div>
      </div>
    </PageShell>
  );
}
