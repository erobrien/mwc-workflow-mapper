import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { RoutedTabs, RoutedTabPanel } from "../components/RoutedTabs";
import { useData, type FieldDestination } from "../lib/data";
import { ghlPipelines } from "../lib/ghl";
import { ExternalLink, ChevronRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";

interface WFStep { action: string; name: string; }
interface WFSettings { quiet_hours?: string; status?: string; allow_reentry?: string; }
interface WFDetail {
  name?: string;
  trigger?: { type: string };
  steps?: WFStep[];
  settings?: WFSettings;
  dropped_from_v2?: boolean;
}

// WF-01 to WF-17 canonical numbering. WF-13 (ad-platform CAPI + Google) was
// dropped from the v2 spec; we do not renumber 14-17. The prior scheme
// (message-library + per-clinic clones) is retired for traceability only.
const NUMBERING_CROSSWALK: { old: string; canonical: string; note: string; dropped?: boolean }[] = [
  { old: "01 Lead Capture", canonical: "WF-01 Lead Capture and Attribution", note: "trigger locked to Contact Created + tag next-lander; Method 2 clinic stamps here only" },
  { old: "02 Non-Booked Recovery", canonical: "WF-02 Non-Booked Recovery", note: "burst SMS + native template EML | WF-02 | Non-booked 24h; marketing quiet hours apply" },
  { old: "03 Booking Confirmation + 05 Appointment Reminders", canonical: "WF-03 Booking Confirmation and Reminders", note: "reminders merged in; appointment-relative T-3d/T-1d/T-5h/T-2h; transactional" },
  { old: "04 Confirmation Chase", canonical: "WF-04 Medical Intake Chase", note: "SMS at +4h and +20h; uses current_booking_url until a dedicated intake URL field exists" },
  { old: "07 Appointment Outcome (auto-Won)", canonical: "WF-05 Clinic Outcome Router", note: "inbound webhook from Force; routes on sale_outcome_v2; workflows never move stages" },
  { old: "07 Post-Visit Sold", canonical: "WF-06 Post-Visit Won and Onboarding", note: "SOLD + new only; sole writer of v2_status_active; hands to WF-10 at T+14 and WF-14 at T+21" },
  { old: "08 A&D (Advised and Declined)", canonical: "WF-07 A&D Post-Visit No-Sale Nurture", note: "sale_outcome_v2 = AD; never fires Meta pixel or CAPI" },
  { old: "06 No-Show Recovery", canonical: "WF-08 No-Show and Cancel Recovery", note: "reschedule never enters; REMOVE-FROM-WF WF-03 on entry" },
  { old: "09 Renewal Reminders + 10 Long-Term Nurture", canonical: "WF-09 Long-Term Nurture (+ Renewal sub-flow)", note: "renewal sub-flow gated until backfill" },
  { old: "z Post-Visit Survey", canonical: "WF-10 Feedback Survey", note: "sole writer of contact.latest_feedback_score; marketing quiet hours" },
  { old: "scattered consent / DND steps", canonical: "WF-11 Compliance and Errors", note: "STOP inbound + MUT front-gate so MUT does not receive STOP-confirm" },
  { old: "z Call Disposition", canonical: "WF-12 Call Disposition Handler", note: "single graph keyed on channel; native update-in-place, no remove+create" },
  { old: "CAPI outbound webhook", canonical: "WF-13 Ad-Platform Conversions", note: "Dropped from v2. Ad-platform CAPI + Google conversions are not part of the v2 shipping scope. WF-14 through WF-17 keep their numbers.", dropped: true },
  { old: "12 Review and Referral (referral part)", canonical: "WF-14 Ambassador Program", note: "referred contact created new, never merged; live tag ambassador-referral" },
  { old: "PCC / Ambassador referral clones", canonical: "WF-15 PCC Referral Routing", note: "utm_source=pcc_qr; live tag pcc-referral; re-enters WF-01" },
  { old: "11 Missed Call Text-Back", canonical: "WF-16 Comms Edge", note: "IVR +18663444955 + two chat widgets; no Sales opp created here" },
  { old: "06. Price Calculator", canonical: "WF-17 Price Calculator (PCC Tool)", note: "internal math only; never writes opportunity.monetaryValue" },
];

// Workflow numbers hidden from the /to-be card grid. Kept in tobe-detail.json
// so the generator does not break, but never surfaced as a live workflow.
const DROPPED_FROM_V2 = new Set<string>(["13"]);

const OBJECT_TONE: Record<string, "good" | "blue" | "warning" | "muted"> = {
  Contact: "blue",
  Opportunity: "good",
  "External EMR": "warning",
  Retire: "muted",
};

function DestCard({ d }: { d: FieldDestination }) {
  const short = d.target.split(" ")[0];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge tone={OBJECT_TONE[d.target] ?? "muted"}>{d.target}</Badge>
          <span className="text-xs text-muted-foreground">{d.card}</span>
        </div>
        <div className="mb-2 text-sm font-medium">{d.role}</div>
        <p className="mb-3 text-xs text-muted-foreground">{d.examples}</p>
        {d.removing && d.removing.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">Removing from Contact ({d.removing.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.removing.map((r) => <span key={r.key} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{r.label} → {r.to}</span>)}
            </div>
          </div>
        )}
        {d.adding && d.adding.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Adding to {short} ({d.adding.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.adding.map((a) => <span key={a.key} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{a.label}{a.note ? ` · ${a.note}` : ""}</span>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LockedRulesCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Locked v2 spec (do not contradict)</div>
        </div>
        <ul className="grid gap-1.5 text-xs text-foreground/90 sm:grid-cols-2">
          <li>Native GHL only. No <code className="rounded bg-muted px-1">custom_code</code>, no new SAC / Supabase backends.</li>
          <li>Clinics: <code className="rounded bg-muted px-1">richmond</code> · <code className="rounded bg-muted px-1">virginia-beach</code> · <code className="rounded bg-muted px-1">newport-news</code>. Method 2 stamps in WF-01 only. Scales to 5+ later; do not invent clinic names.</li>
          <li>WF-01 enroll = Contact Created + tag <code className="rounded bg-muted px-1">next-lander</code> only. <code className="rounded bg-muted px-1">wordpress-form</code> is an inner branch; empty source defaults to next-lander.</li>
          <li>WP CID bridge stays: WPCode snippet 11461, Gravity Form 1, <code className="rounded bg-muted px-1">book.menswellnesscenters.com/api/handoff/wordpress</code>. Do not change.</li>
          <li>New tags are <code className="rounded bg-muted px-1">v2_*</code>. Do not rename live tags <code className="rounded bg-muted px-1">next-lander</code>, <code className="rounded bg-muted px-1">LOC_TAGS</code>, <code className="rounded bg-muted px-1">sms-consent</code>, <code className="rounded bg-muted px-1">funnel_entry_*</code>, <code className="rounded bg-muted px-1">location_*</code>.</li>
          <li>Force is the sole writer of dollars, <code className="rounded bg-muted px-1">sale_outcome</code> (SOLD | AD | MUT | MAR), <code className="rounded bg-muted px-1">sale_type</code>, and <code className="rounded bg-muted px-1">appt_status</code>.</li>
          <li>Workflows <b>never move Sales stages</b> (New Lead → Booked → Showed → Won). WF-05 routes only. MAR does not fire WF-05.</li>
          <li>Transactional SMS has <b>no</b> Time Window (WF-01, WF-03, WF-04, WF-06, WF-07, WF-08, WF-11). Recovery / marketing (WF-02, WF-10) uses 8:00-21:00 contact TZ, 7 days. First SMS in each sequence carries Reply STOP to opt out.</li>
        </ul>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Drafts live on staging <code className="rounded bg-muted px-1">zHKH8aRDdNq47oYmdsN1</code>, folder
          {" "}<code className="rounded bg-muted px-1">6039c39d-f82d-4518-998c-749fb1ae57d1</code>. Production
          {" "}<code className="rounded bg-muted px-1">Ghstz8eIsHWLeXek47dk</code> is read-only. Nothing publishes until Eric says publish.
        </div>
      </CardContent>
    </Card>
  );
}

/* ---- Chip helpers -----------------------------------------------------------
   All chip values come from /tobe-detail.json (built by build_tobe_v2_detail.py
   from /workspace/to-be/wf-*.json). Nothing here invents a workflow count. */

function countByAction(steps: WFStep[] | undefined, action: string, namePrefix: string): number {
  if (!steps) return 0;
  return steps.filter((s) => s.action === action || s.name.toUpperCase().startsWith(namePrefix + ":")).length;
}

function shortTrigger(t: string | undefined): string | null {
  if (!t) return null;
  return t.split(" (")[0].trim();
}

// Boil the long quiet_hours copy down to a scannable chip.
function quietHoursChip(q: string | undefined): { label: string; tone: "good" | "warning" | "muted" | "blue" } | null {
  if (!q) return null;
  const s = q.toLowerCase();
  if (s.startsWith("n/a") || s.includes("no sms")) return { label: "Quiet: n/a", tone: "muted" };
  if (s.startsWith("none")) return { label: "No quiet hours (transactional)", tone: "good" };
  if (s.includes("08:00-21:00") || s.includes("8:00-21:00") || s.includes("8am") || s.includes("8am-9pm")) {
    return { label: "8am–9pm quiet hours", tone: "warning" };
  }
  return { label: "Quiet hours set", tone: "blue" };
}

// settings.status looks like "Draft v10 on staging shell abc123. Unpublished."
// or "Draft v4 unpublished." — pull out the short "Draft vN" prefix.
function draftChip(status: string | undefined): string | null {
  if (!status) return null;
  const m = status.match(/^(Draft v\d+)/i);
  return m ? m[1] : null;
}

interface ChipTone { label: string; tone: "good" | "warning" | "red" | "blue" | "muted" | "purple" | "accent"; }

function chipsFor(d: WFDetail | undefined): ChipTone[] {
  if (!d) return [];
  const chips: ChipTone[] = [];
  const trig = shortTrigger(d.trigger?.type);
  if (trig) chips.push({ label: trig, tone: "blue" });
  const steps = d.steps ?? [];
  const sms = countByAction(steps, "Send SMS", "SMS");
  const email = countByAction(steps, "Send Email", "EMAIL");
  chips.push({ label: `${sms} SMS`, tone: sms > 0 ? "good" : "muted" });
  chips.push({ label: `${email} email`, tone: email > 0 ? "purple" : "muted" });
  chips.push({ label: `${steps.length} steps`, tone: "muted" });
  const qh = quietHoursChip(d.settings?.quiet_hours);
  if (qh) chips.push(qh);
  const draft = draftChip(d.settings?.status);
  if (draft) chips.push({ label: draft, tone: "accent" });
  return chips;
}

function WorkflowTiles({
  workflows,
  detail,
}: {
  workflows: { n: string; name: string; absorbs?: string; copy?: string }[];
  detail: Record<string, WFDetail>;
}) {
  const visible = workflows.filter((w) => !DROPPED_FROM_V2.has(w.n));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {visible.map((w) => {
        const d = detail[w.n];
        // Prefer the source-of-truth name from tobe-detail.json (which the
        // generator reads from to-be/wf-NN.json) so we never diverge from spec.
        const name = d?.name ?? w.name;
        const chips = chipsFor(d);
        return (
          <Link key={w.n} to={`/to-be/wf/${w.n}`} className="group block">
            <Card className="h-full transition-colors group-hover:border-accent group-hover:bg-muted/40">
              <CardContent className="p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">WF-{w.n}</span>
                    <span className="text-base font-bold text-foreground">{name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                {w.copy && <p className="mb-3 line-clamp-3 text-sm text-foreground/85">{w.copy}</p>}
                {chips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {chips.map((c, i) => (
                      <Badge key={i} tone={c.tone}>{c.label}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Open build guide →
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function ToBe() {
  const { data, isLoading } = useData();
  const [detail, setDetail] = useState<Record<string, WFDetail>>({});
  useEffect(() => {
    fetch("/tobe-detail.json").then((r) => r.json()).then((d) => setDetail(d.workflows ?? {})).catch(() => setDetail({}));
  }, []);
  if (isLoading || !data) return <Loading />;

  // Cards / counts are driven by data.json tobe_workflows (regenerated from
  // to-be/wf-*.json by build_tobe_v2_detail.py), filtered against the same
  // DROPPED_FROM_V2 set. Do not maintain a third hand-authored list.
  const liveWorkflows = data.tobe_workflows.filter((w) => !DROPPED_FROM_V2.has(w.n));
  const liveCount = liveWorkflows.length;

  return (
    <PageShell
      title="To-be: the locked v2 spec"
      subtitle={`MWC GHL v2 rebuild. ${liveCount} single-purpose workflows (WF-01 to WF-12, WF-14 to WF-17; WF-13 dropped), authored as staged drafts in staging location zHKH8aRDdNq47oYmdsN1, folder 6039c39d-f82d-4518-998c-749fb1ae57d1. Native GHL only. Force writes outcomes. Nothing publishes until Eric says publish.`}
    >
      <RoutedTabs base="/to-be" tabs={[
        { value: "workflows", label: `Workflows (${liveCount})` },
        { value: "pipelines", label: `Pipelines (${data.pipelines.length})` },
        { value: "data-model", label: "Data model" },
      ]}>
        <RoutedTabPanel value="workflows" className="space-y-3">
          <LockedRulesCard />
          <Card><CardContent className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Canonical numbering (WF-01 to WF-17, WF-13 dropped)</div>
                <p className="text-xs text-muted-foreground">The workflow list is the canonical scheme. The left column records the retired prior numbering (old message-library and location-clone scheme) for traceability only. WF-13 (ad-platform CAPI + Google) is dropped from v2; WF-14–17 keep their numbers. Historical clinic codes va_beach and npn are dropped; slugs are richmond | virginia-beach | newport-news.</p>
              </div>
              <Link to="/wf-diagrams" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
                See to-be workflow diagrams
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pe-3 font-semibold">Prior numbering (retired)</th>
                    <th className="py-1.5 pe-3 font-semibold">Canonical</th>
                    <th className="py-1.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {NUMBERING_CROSSWALK.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 last:border-0 ${row.dropped ? "opacity-70" : ""}`}>
                      <td className="py-1.5 pe-3 font-mono text-muted-foreground">{row.old}</td>
                      <td className="py-1.5 pe-3 font-mono">
                        {row.dropped ? <span className="line-through">{row.canonical}</span> : row.canonical}
                        {row.dropped && <Badge tone="red" className="ms-2">Dropped from v2</Badge>}
                      </td>
                      <td className="py-1.5 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
          <WorkflowTiles workflows={data.tobe_workflows} detail={detail} />
        </RoutedTabPanel>

        <RoutedTabPanel value="pipelines" className="space-y-3">
          {data.pipelines.map((p, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <a href={ghlPipelines(data.location_id)} target="_blank" rel="noopener noreferrer"
                  title="Open pipelines in GHL" className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> GHL
                </a>
              </div>
              {p.role && <p className="mb-2 text-xs text-muted-foreground">{p.role}</p>}
              {p.stages && (
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  {p.stages.map((s, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <Badge tone="good">{s}</Badge>{j < p.stages!.length - 1 && <span className="text-muted-foreground">→</span>}
                    </span>
                  ))}
                </div>
              )}
              {p.exits && p.exits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exits:</span>
                  {p.exits.map((e, j) => <Badge key={j} tone="muted">{e}</Badge>)}
                </div>
              )}
            </CardContent></Card>
          ))}
        </RoutedTabPanel>

        <RoutedTabPanel value="data-model" className="space-y-4">
          <Card><CardContent className="p-4 text-sm leading-relaxed text-foreground/90">
            <b>Four destinations, each owning its own data.</b> The Contact holds identity and durable profile, including attribution and consent state. The Opportunity owns the sale outcome and money, and carries a copy of the attribution that WF-01 writes at create so both wins and losses roll up per sale. Medical records stay in the external EMR (GHL keeps only <code>emr_patient_id</code> on the Contact and <code>emr_visit_id</code> on the Opportunity; the appointment date lives on the appointment, not an opp field). Never-used fields retire. <b>No custom objects</b>. Attribution is fields plus <code>source_*</code> tags, and consent is GHL-native DND/STOP plus the Compliance workflow (WF-11). Force is the sole writer of <code>sale_outcome</code>, <code>sale_type</code>, <code>appt_status</code>, and dollars.
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {data.field_destinations.map((d, i) => <DestCard key={i} d={d} />)}
          </div>
        </RoutedTabPanel>
      </RoutedTabs>
    </PageShell>
  );
}
