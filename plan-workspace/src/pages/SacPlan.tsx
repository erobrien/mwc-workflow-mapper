import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { useJson } from "../lib/asis";
import { Radio, Fingerprint, Database, Filter, Send, Scale, Gauge, RotateCcw } from "lucide-react";

interface FT {
  sac: {
    name: string; stack: string; collection: string; identity: string; storage: string; junk_filter: string;
    event_contract: { event: string; source: string; dedupe: string; sends: string; notes: string }[];
    activation: { google: string; meta: string; values: string };
    hipaa_decision: { question: string; option_a: string; option_b: string; recommendation: string; hard_rules: string };
    measurement: string; delivery: string;
  };
  transition: { step: string; detail: string; gate: string }[];
}

const FLOW = `flowchart LR
  subgraph COLLECT["First-party collection"]
    WP["WordPress site<br/>(organic/SEO)"]
    BK["book.menswellnesscenters.com<br/>(paid funnel)"]
    CALL["Inbound calls<br/>RingCentral / GHL"]
  end
  subgraph GHL["GHL (prod sub-account)"]
    WF01["WF-01 Lead Capture<br/>frozen attribution stamp"]
    WF05["WF-05 Outcome Router<br/>outcome stamps"]
    WF06["WF-06 Won & Onboarding"]
    WF12["WF-12 Call Disposition"]
    OPP[("Opportunity<br/>deal ledger")]
  end
  subgraph SAC["SAC (Supabase + workers)"]
    ING["Ingest endpoints<br/>junk filter · event_id dedupe"]
    EV[("events<br/>anonymized, hashed")]
    OB[("conversions_outbox<br/>retry · dead-letter · replay")]
    REC["Reconciliation<br/>platform vs CRM truth"]
  end
  subgraph ADS["Ad platforms"]
    G["Google Ads<br/>offline conversions + EC"]
    M["Meta CAPI<br/>server events"]
  end
  LB["Lobbie EMR<br/>(reserved seam)"]
  WP --> ING
  BK --> ING
  BK --> WF01
  CALL --> WF12
  WF01 --> OPP
  WF05 --> OPP
  WF06 --> OPP
  WF01 -- webhook --> ING
  WF05 -- webhook --> ING
  WF06 -- webhook --> ING
  WF12 -- webhook --> ING
  LB -.-> ING
  ING --> EV --> OB
  OB --> G
  OB --> M
  EV --> REC`;

export default function SacPlan() {
  const { data, isLoading } = useJson<FT>("/finaltarget.json");
  if (isLoading || !data) return <Loading />;
  const s = data.sac;

  return (
    <PageShell
      title="SAC — server-side attribution & conversions"
      subtitle="First-party collection, server-side transmission. SAC owns every event that leaves for Meta and Google, keyed to the new opportunity field model, HIPAA-safe by contract."
    >
      <Card><CardContent className="p-3">
        <MermaidChart src={FLOW} active />
      </CardContent></Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Radio className="h-4 w-4 text-sky-600" /> Collection</div>
          <p className="mt-1 text-sm text-muted-foreground">{s.collection}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Fingerprint className="h-4 w-4 text-indigo-600" /> Identity</div>
          <p className="mt-1 text-sm text-muted-foreground">{s.identity}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Database className="h-4 w-4 text-emerald-600" /> Storage</div>
          <p className="mt-1 text-sm text-muted-foreground">{s.storage}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Filter className="h-4 w-4 text-amber-600" /> Junk filter</div>
          <p className="mt-1 text-sm text-muted-foreground">{s.junk_filter}</p>
        </CardContent></Card>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Send className="h-4 w-4 text-emerald-600" /> Event contract</h2>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Event</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Dedupe key</th><th className="px-3 py-2">Sends</th><th className="px-3 py-2">Notes</th>
              </tr></thead>
              <tbody>
                {s.event_contract.map((e) => (
                  <tr key={e.event} className="border-b align-top last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-1.5 font-mono text-xs">{e.event}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{e.source}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{e.dedupe}</td>
                    <td className="px-3 py-1.5 text-xs">{e.sends}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{e.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Activation</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Google Ads</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.activation.google}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Meta</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.activation.meta}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Values</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.activation.values}</p>
          </CardContent></Card>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Scale className="h-4 w-4 text-violet-600" /> HIPAA decision (standing)</h2>
        <div className="rounded-md border border-l-4 border-l-violet-500 bg-card p-3 text-sm text-muted-foreground">
          <b className="text-foreground">{s.hipaa_decision.question}</b>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardContent className="p-4">
            <Badge tone="good">Option A</Badge>
            <p className="mt-2 text-sm text-muted-foreground">{s.hipaa_decision.option_a}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Badge tone="blue">Option B</Badge>
            <p className="mt-2 text-sm text-muted-foreground">{s.hipaa_decision.option_b}</p>
          </CardContent></Card>
        </div>
        <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground"><b className="text-foreground">Recommendation:</b> {s.hipaa_decision.recommendation}</div>
        <div className="rounded-md border border-l-4 border-l-red-500 bg-card p-3 text-sm text-muted-foreground"><b className="text-foreground">Hard rules regardless of option:</b> {s.hipaa_decision.hard_rules}</div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><RotateCcw className="h-4 w-4 text-amber-600" /> Transition runbook</h2>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Step</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2">Gate</th>
            </tr></thead>
            <tbody>
              {data.transition.map((t) => (
                <tr key={t.step} className="border-b align-top last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5 font-medium">{t.step}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.detail}</td>
                  <td className="px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">{t.gate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Gauge className="h-4 w-4 text-sky-600" /> Measuring the measurement</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Reconciliation & alerting</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.measurement}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Durable delivery & token custody</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.delivery}</p>
          </CardContent></Card>
        </div>
      </section>
    </PageShell>
  );
}
