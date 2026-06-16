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
      subtitle="A simplification refactor of the MWC GoHighLevel sub-account. As-is captured directly from the GHL API. Target architecture and migration plan locked 2026-06-16."
      actions={
        <>
          <Link to="/plan" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><FileText className="h-3.5 w-3.5" /> View plan</Link>
          <Link to="/prompts" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Execute prompts <ArrowRight className="h-3.5 w-3.5" /></Link>
        </>
      }
    >
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

      {/* RR blockers */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-destructive">Revenue recognition blockers — must change before backfill</h2>
          <Link to="/prompts" className="text-xs text-muted-foreground hover:text-foreground">See P0 prompts →</Link>
        </div>
        <div className="space-y-3">
          <div className="rounded-md border border-l-4 border-l-destructive bg-card p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold"><Badge tone="red">RR-1</Badge> Sales data is stored on the Contact, not the Opportunity</div>
            <p className="text-sm text-foreground/90">Sale Outcome, Product / Term / Price ×3, Total Program Amount, Consultation Fee, Pay Type, and the no-sale reason all sit on the <b>Contact</b> — <b>zero</b> opportunity-level financial fields today (target: 14). When the same person consults again, the prior sale is <b>overwritten and lost</b>. GAAP / ASC 606 requires revenue tied to a specific transaction; a Contact-level aggregate cannot recognize per-deal revenue. <b>Fix:</b> move all sale fields to the Opportunity. Workflow <code>05. Clinic Appt Outcome</code> becomes the single writer of Sale Outcome; real Won requires <code>monetaryValue &gt; 0</code>.</p>
          </div>
          <div className="rounded-md border border-l-4 border-l-destructive bg-card p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold"><Badge tone="red">RR-2</Badge> UTM + click IDs are stored on the Contact (and never captured)</div>
            <p className="text-sm text-foreground/90">UTM Source / Medium / Campaign / Content / Term, Source URL, <code>gclid_value</code>, and <code>fbclid_value</code> live on the Contact, so the latest touch overwrites the previous. Worse — the 90-day scan shows <code>gclid_value</code> and <code>fbclid_value</code> are non-null on <b>0 of {fmt(k.contacts_scanned)} contacts</b>. Attribution is broken at <b>collection</b>, not just storage. <b>Fix:</b> (a) capture click IDs in workflows 01A–E; (b) keep attribution on the Contact and copy the latest UTM + click ID onto the Opportunity when it is created (no custom object needed).</p>
          </div>
        </div>
      </section>

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
