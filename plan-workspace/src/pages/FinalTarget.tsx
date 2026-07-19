import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { useJson } from "../lib/asis";
import { Link } from "react-router-dom";
import { Compass, ShieldCheck, Database, Workflow as WorkflowIcon, ClipboardList, Milestone, ListX } from "lucide-react";

interface FT {
  version: string; date: string; basis: string; principles: string[];
  limitation_rules: { rule: string; response: string }[];
  field_model: {
    opportunity_final: { key: string; type: string; options?: string; writer: string; status: string }[];
    opportunity_deprecate: { key: string; why: string }[];
    contact_keeps: { key: string; why: string }[];
    contact_deprecates: string;
  };
  form_tweak_r1: { summary: string; changes: { item: string; from: string; to: string; why: string }[]; verification: string };
  workflow_registry_notes: { n: string; note: string }[];
  roadmap: { release: string; name: string; items: string[]; exit: string }[];
  backlog: string[];
}

export default function FinalTarget() {
  const { data, isLoading } = useJson<FT>("/finaltarget.json");
  if (isLoading || !data) return <Loading />;

  return (
    <PageShell
      title="Final Target (To-Be v2)"
      subtitle={`The definitive end-state, ${data.date}. Prod is the basis, the original Target architecture stands, and every confirmed GHL opportunity limitation is baked in as a design rule. Supersedes all vendor builds.`}
    >
      <div className="rounded-md border border-l-4 border-l-indigo-500 bg-card p-4 text-sm text-muted-foreground">
        <b className="text-foreground">Basis.</b> {data.basis}
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Compass className="h-4 w-4 text-indigo-600" /> Principles</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {data.principles.map((p, i) => (
            <div key={i} className="rounded-md border bg-card p-3 text-sm text-muted-foreground"><span className="me-2 font-mono text-xs text-indigo-600">P{i + 1}</span>{p}</div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Milestone className="h-4 w-4 text-emerald-600" /> Roadmap</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.roadmap.map((r) => (
            <Card key={r.release}><CardContent className="p-4">
              <div className="flex items-center gap-2"><Badge tone="good">{r.release}</Badge><span className="text-sm font-semibold">{r.name}</span></div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {r.items.map((it, i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground/60">•</span>{it}</li>)}
              </ul>
              <div className="mt-2 border-t pt-2 text-xs text-muted-foreground"><b className="text-foreground">Exit:</b> {r.exit}</div>
            </CardContent></Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-amber-600" /> GHL limitation design rules</h2>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {data.limitation_rules.map((r, i) => (
                <tr key={i} className="border-b align-top last:border-0">
                  <td className="w-1/2 px-3 py-2"><b>{r.rule}</b></td>
                  <td className="px-3 py-2 text-muted-foreground">{r.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Database className="h-4 w-4 text-sky-600" /> Field model (reconciled against prod)</h2>
        <Card><CardContent className="p-0">
          <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Opportunity — the deal ledger ({data.field_model.opportunity_final.length} entries)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Field</th><th className="px-3 py-2">Type / options</th><th className="px-3 py-2">Single writer</th><th className="px-3 py-2">Status vs prod</th>
              </tr></thead>
              <tbody>
                {data.field_model.opportunity_final.map((f) => (
                  <tr key={f.key} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="break-all px-3 py-1.5 font-mono text-xs">{f.key}</td>
                    <td className="px-3 py-1.5 text-xs">{f.type}{f.options ? <span className="text-muted-foreground"> · {f.options}</span> : null}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{f.writer}</td>
                    <td className="px-3 py-1.5 text-xs">{f.status.startsWith("add") ? <Badge tone="good">{f.status}</Badge> : <Badge tone="muted">{f.status}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold"><ListX className="h-4 w-4 text-red-500" /> Opportunity fields to deprecate</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {data.field_model.opportunity_deprecate.map((f) => (
                <li key={f.key}><span className="break-all font-mono text-xs">{f.key}</span> — {f.why}</li>
              ))}
            </ul>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Contact keeps (current state only)</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {data.field_model.contact_keeps.map((f) => (
                <li key={f.key}><span className="break-all font-mono text-xs">{f.key}</span> — {f.why}</li>
              ))}
            </ul>
            <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{data.field_model.contact_deprecates}</p>
          </CardContent></Card>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-violet-600" /> PCC form — R1 minimal tweak</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{data.form_tweak_r1.summary}</p>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Item</th><th className="px-3 py-2">Today</th><th className="px-3 py-2">Change to</th><th className="px-3 py-2">Why</th>
            </tr></thead>
            <tbody>
              {data.form_tweak_r1.changes.map((c) => (
                <tr key={c.item} className="border-b align-top last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5 font-medium">{c.item}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.from}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-emerald-700 dark:text-emerald-400">{c.to}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
        <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground"><b className="text-foreground">Verification:</b> {data.form_tweak_r1.verification}</div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><WorkflowIcon className="h-4 w-4 text-emerald-600" /> Workflow registry — v2 mechanics notes</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">The 17-workflow registry from the original Target stands (see <Link className="underline" to="/to-be">To-Be Workflows</Link> and <Link className="underline" to="/wf-diagrams">WF Flow Diagrams</Link> for full designs). v2 adds these mechanics:</p>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {data.workflow_registry_notes.map((w) => (
                <tr key={w.n} className="border-b align-top last:border-0">
                  <td className="w-16 px-3 py-2 font-mono text-xs">WF-{w.n}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{w.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Backlog</h2>
        <div className="rounded-md border bg-card p-3">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {data.backlog.map((b, i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground/60">•</span>{b}</li>)}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
