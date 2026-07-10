import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Loading, toneFor } from "../components/ui";
import { RoutedTabs, RoutedTabPanel } from "../components/RoutedTabs";
import { useData } from "../lib/data";
import { ShieldCheck, Terminal, ArrowRight } from "lucide-react";

// Test matrix — preserved from the original plan page.
const TESTS: [string, string, string][] = [
  ["Lead capture", "Form submit → contact created, location_* + source_* set, opp lands in Sales · New Lead", "auto"],
  ["Booking", "Appointment booked → opp advances to Booked, reminder cascade enrolls", "auto"],
  ["Won outcome", "Outcome = Sold → opp Won, monetaryValue = Total Program Amount > 0", "auto"],
  ["No-sale outcome", "Outcome = A&D → opp Lost + lostReason (never Won), objection nurture enrolls", "auto"],
  ["No-show / cancel", "Status change → correct exit status (not pipeline move), recovery enrolls", "auto"],
  ["Revenue reconciliation", "Σ won monetaryValue before backfill = after; every changed opp diffed against approved CSV", "auto"],
  ["Idempotency", "Backfill script run twice → second run reports 0 changes", "auto"],
  ["STOP / DND", "Reply STOP → DND tag set → all workflow sends halt (TCPA)", "auto"],
  ["Reminder cadence", "T-3d email · T-1d SMS · morning-of SMS · T-2h intake nudge fires correctly", "auto"],
  ["Conversion exclusion", "Outcome = A&D / No-Sale / Lost fires zero Meta or Google conversions", "auto"],
  ["Bot creates lead", "Deferred — engine not live", "deferred"],
  ["Canary + parallel run", "48h canary then 7 clean business days: error rate < 0.1%, won-with-$0 = 0, no quiet-hours violations, no non-form outcome writes", "auto"],
  ["Quiet hours", "Every SMS/voicemail send falls inside 8 AM–9 PM Contact Timezone and filters on sms_consent_status + native DND", "auto"],
];

// Scope manifest — preserved, with the rejected custom objects removed.
const SCOPE: string[] = [
  "<b>Stop the bleed</b> — fix workflow 05 auto-Won so new data is clean from day one (P0)",
  "<b>Restate revenue</b> — evidence-split + backfill ~6,775 opportunities, reconciled to the opportunity value",
  "<b>Consolidate workflows</b> — 38 active → 16 single-purpose owners",
  "<b>Consolidate pipelines</b> — 18 → 4 (Sales + Retention + Referrals + Instagram DM exception)",
  "<b>Re-home fields</b> — 135 contact fields → Contact / Opportunity / external EMR / retire (no custom objects)",
  "<b>Disambiguate</b> — rename <code>ad_*</code> → <code>nosale_*</code>; <code>patient_advisor</code> → <code>patient_care_consultant</code>",
  "<b>Clean registries</b> — tags 305 → ~120, forms 26 → ~9, one DND/STOP authority",
  "<b>Govern</b> — this workspace + risk register <i>are</i> the scope-control mechanism",
];

export default function Plan() {
  const { data, isLoading } = useData();
  if (isLoading || !data) return <Loading />;
  const steps = data.migration_steps;
  const done = steps.filter((s) => s.status === "Done").length;
  const blocked = steps.filter((s) => s.status === "Blocked").length;

  return (
    <PageShell
      title="Migration plan"
      subtitle={`${steps.length} steps · ${blocked} blocked · ${done} done. Sequenced execution with dry-run gates.`}
      actions={
        <Link to="/prompts" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Terminal className="h-3.5 w-3.5" /> Execution prompts <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <RoutedTabs base="/plan" tabs={[
        { value: "timeline", label: "Timeline" },
        { value: "guardrails", label: "Guardrails" },
        { value: "tests", label: "Test matrix" },
        { value: "scope", label: "Scope manifest" },
      ]}>
        <RoutedTabPanel value="timeline" className="space-y-3">
          {steps.map((s) => (
            <Card key={s.n} className={s.status === "Blocked" ? "border-amber-300 dark:border-amber-900" : ""}>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">Step {s.n}</span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="ms-auto"><Badge tone={toneFor(s.status)}>{s.status}</Badge></span>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3">
                  <Field label="Owner" value={s.owner} />
                  <Field label="Gate" value={s.gate} />
                  <Field label="Blocked by" value={s.blocked_by || "—"} highlight={!!s.blocked_by} />
                </div>
              </CardContent>
            </Card>
          ))}
        </RoutedTabPanel>

        <RoutedTabPanel value="guardrails" className="space-y-2">
          {data.guardrails.map((g, i) => (
            <Card key={i}><CardContent className="flex items-baseline gap-3 p-4">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-mono text-xs font-semibold text-muted-foreground">G{i + 1}</span>
              <span className="font-medium">{g}</span>
            </CardContent></Card>
          ))}
        </RoutedTabPanel>

        <RoutedTabPanel value="tests">
          <Card><CardContent className="p-0">
            <Table>
              <thead><tr><TH>Scenario</TH><TH>Assertion</TH><TH className="w-20">Mode</TH></tr></thead>
              <tbody>
                {TESTS.map(([s, a, m]) => (
                  <tr key={s} className="hover:bg-muted/40">
                    <TD className="font-medium">{s}</TD>
                    <TD className="text-sm">{a}</TD>
                    <TD><code className="text-[11px]">{m}</code></TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent></Card>
        </RoutedTabPanel>

        <RoutedTabPanel value="scope">
          <Card><CardContent className="p-6">
            <ol className="list-decimal space-y-2 ps-6 text-sm leading-relaxed">
              {SCOPE.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}
            </ol>
          </CardContent></Card>
        </RoutedTabPanel>
      </RoutedTabs>
    </PageShell>
  );
}

function Field({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={highlight ? "mt-0.5 font-medium text-amber-700 dark:text-amber-300" : "mt-0.5"}>{value}</div>
    </div>
  );
}
