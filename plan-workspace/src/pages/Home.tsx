import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Loading, cn, toneFor } from "../components/ui";
import { useData } from "../lib/data";
import { FileText, ArrowRight, ShieldCheck, AlertTriangle, ListChecks } from "lucide-react";

function Mini({ label, value, delta, note, problem }: { label: string; value: React.ReactNode; delta?: string; note?: string; problem?: boolean }) {
  return (
    <div className={cn("rounded-md border bg-card px-3.5 py-3", problem && "border-l-[3px] border-l-destructive")}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold tabular-nums", problem && "text-destructive")}>
        {value}{delta && <span className="ms-1.5 text-sm font-medium text-emerald-600">{delta}</span>}
      </div>
      {note && <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
function Tile({ icon: Icon, label, value, note, tone }: { icon: any; label: string; value: string; note: string; tone: "good" | "warning" | "neutral" }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3.5">
      <Icon className={cn("h-5 w-5 shrink-0", tone === "good" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-muted-foreground")} />
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, error } = useData();
  if (isLoading) return <Loading />;
  if (error || !data) return <div className="p-8 text-destructive">Failed to load data.json</div>;
  const k = data.kpis;
  const fmt = (n: number) => n.toLocaleString();
  const open = data.decisions.filter((d) => d.status === "Open").length;
  const locked = data.decisions.filter((d) => d.status === "Locked").length;
  const crit = data.defects.filter((d) => d.severity === "Critical").slice(0, 4);
  const ready = data.migration_steps.filter((s) => s.status === "Ready").length;
  const blocked = data.migration_steps.filter((s) => s.status === "Blocked").length;

  return (
    <PageShell
      title="Project workspace"
      subtitle="A complete tear-down and rebuild of the MWC GoHighLevel sub-account — workflows and pipelines especially. As-is captured live from the GHL API; every workflow deep-links into its builder. Search anything with ⌘K."
      actions={
        <>
          <Link to="/plan" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><FileText className="h-3.5 w-3.5" /> View plan</Link>
          <Link to="/prompts" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Execute prompts <ArrowRight className="h-3.5 w-3.5" /></Link>
        </>
      }
    >
      {/* The two problems */}
      <section>
        <h2 className="mb-3 text-base font-semibold">The two problems this fixes</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-l-4 border-l-destructive bg-card p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive text-sm font-semibold text-destructive-foreground">1</span>
              <h3 className="font-semibold leading-tight">Deals are dispositioned on the contact, not the opportunity</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              PCCs record the sale outcome and amount on the <b>contact</b> (or a workflow does), so every new consultation <b>overwrites the last</b> and the <b>opportunity</b> — the only record GHL recognizes revenue on — stays empty. Revenue can't be reported per deal, per location, or per rep.
            </p>
            <div className="mt-3 inline-flex rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Only ~9% of opportunities carry a dollar value</div>
          </div>
          <div className="rounded-md border border-l-4 border-l-destructive bg-card p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive text-sm font-semibold text-destructive-foreground">2</span>
              <h3 className="font-semibold leading-tight">Marketing attribution isn't carried through to win/loss</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              The lead source, UTM, and click IDs that drove each deal are never <b>carried onto the opportunity at win or loss</b> — so you can't connect <b>ad spend to Won revenue</b>, or see which campaigns produce sales versus no-shows and no-sales. What attribution exists sits on the contact and overwrites with each new touch.
            </p>
            <div className="mt-3 inline-flex rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Click IDs captured on 0 of 11,000+ contacts</div>
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="rounded-md border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Problem statement</h2>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">How we got here · What's broken · Recovery model</span>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-red-700 dark:text-red-400">How we got here</div>
            <p className="text-sm leading-relaxed text-foreground/90">
              <b>Multiple vendors have worked on this GHL sub-account over time</b>, each adding workflows, forms, and custom fields to whatever object was convenient. There was no central data model, no naming convention, no ownership boundary between marketing, sales, and clinical data. The result: <b>135 custom fields, all on the Contact</b>, including UTM/click-IDs that overwrite per touch and sale outcome + price + product data that overwrites per deal. The structural mistake was treating the Contact as a dumping ground for everything attached to a person, instead of attaching marketing data to its touch and sales data to its deal.
            </p>
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-red-700 dark:text-red-400">What's broken</div>
            <p className="text-sm leading-relaxed text-foreground/90">
              Revenue reporting requires each sale to be tied to a specific deal record, not to a person. Right now sale data lives on the Contact, so every new consultation overwrites the last. Workflow 05 creates a fake Won opportunity in the A&D pipeline every time someone attends a consultation, producing <b>939 false wins, ~50% of all recorded wins account-wide</b>. Click IDs are missing on <b>0 of {fmt(k.contacts_scanned)} contacts</b>; TCPA consent is stored on <b>0 of {fmt(k.contacts_scanned)}</b>. The data we'd use to fix reporting is wrong at the source.
            </p>
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recovery model</div>
            <p className="text-sm leading-relaxed text-foreground/90">
              This plan runs <b>mostly with AI and a human approving each step</b>. Every migration step is a scripted prompt (see <Link to="/prompts" className="text-primary hover:underline">Prompts</Link>) that runs against the GHL API with a dry-run preview before any data changes. Humans approve each gate; AI does the mechanical work. <b>AI and human testing can wrap up in a single day</b>: the test checklist is automated, the initial test group is one tag (<code>src:bf-web</code>), and the won-with-$0 counter shows pass or fail within hours. Cutover is one publish and one pause; cleanup waits two clean weeks.
            </p>
          </div>
        </div>
      </section>

      {/* Status tiles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Tile icon={ShieldCheck} label="Plan status" value={`${locked} of ${locked + open} decisions locked`} note={open === 0 ? "All decisions resolved" : `${open} open (blocks dependent steps)`} tone={open === 0 ? "good" : "warning"} />
        <Tile icon={AlertTriangle} label="Critical findings" value={`${crit.length} Critical / ${data.defects.length} total`} note="All evidence-backed by API capture" tone="warning" />
        <Tile icon={ListChecks} label="Execution" value={`${ready} ready · ${blocked} blocked`} note="2 P0 prompts — go first" tone="neutral" />
      </div>

      {/* Scope */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Scope of refactor</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <Mini label="Workflows" value={k.workflows_published} delta={`→ ${k.target_workflows}`} note="Active workflows (drafts archived)" />
          <Mini label="Pipelines" value={k.pipelines_now} delta={`→ ${k.pipelines_target}`} note="Sales + Retention + Referrals + Instagram" />
          <Mini label="Custom fields" value={k.fields_total} note={`${k.fields_on_contact} contact · ${k.fields_on_opportunity_now} opp`} />
          <Mini label="Total steps" value={fmt(k.steps_published_total)} note="across 38 published workflows" />
        </div>
      </section>

      {/* Problems quantified */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Problems quantified</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Mini label="False wins" value={k.ad_false_wins} note="A&D auto-Won — ~50% of all wins" problem />
          <Mini label="Wins w/ $0 value" value={`${k.wins_with_zero_value_pct}%`} note="across sampled won deals" problem />
          <Mini label="GHL payment txns" value={k.ghl_payment_transactions} note="revenue recorded on the Opportunity" problem />
          <Mini label="Click IDs captured" value={`${k.click_ids_captured} / ${fmt(k.contacts_scanned)}`} note="attribution broken at collection" problem />
          <Mini label="TCPA consent stored" value={`${k.tcpa_consent_stored} / ${fmt(k.contacts_scanned)}`} note="no proof of opt-in" problem />
        </div>
      </section>

      {/* Critical findings */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-baseline justify-between">
            <div><div className="font-semibold">Critical findings</div><div className="text-xs text-muted-foreground">Confirmed by API capture</div></div>
            <Link to="/as-is" className="text-xs text-muted-foreground hover:text-foreground">All defects →</Link>
          </div>
          <div className="space-y-2">
            {crit.map((d) => (
              <div key={d.id} className="rounded-md border bg-card p-3.5">
                <div className="mb-1.5 flex flex-wrap items-baseline gap-2.5">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{d.id}</span>
                  <span className="font-semibold">{d.title}</span>
                  <span className="ms-auto"><Badge tone={toneFor(d.severity)}>{d.severity}</Badge></span>
                </div>
                <p className="text-sm leading-relaxed">{d.impact}</p>
                <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Evidence:</span> {d.evidence}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decisions */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-baseline justify-between">
            <div><div className="font-semibold">Decisions</div><div className="text-xs text-muted-foreground">Locked 2026-06-16 · {open} still open</div></div>
            <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground">Decision log →</Link>
          </div>
          <Table>
            <thead><tr><TH className="w-12">#</TH><TH>Decision</TH><TH>Choice</TH><TH className="w-24">Status</TH></tr></thead>
            <tbody>
              {data.decisions.map((d) => (
                <tr key={d.n} className={d.status === "Open" ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}>
                  <TD className="font-mono text-xs font-semibold">{d.n}</TD>
                  <TD className="font-medium">{d.decision}</TD>
                  <TD className="text-sm">{d.choice}</TD>
                  <TD><Badge tone={toneFor(d.status)}>{d.status}</Badge></TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
