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

/* WF-01 to WF-17 canonical numbering. WF-13 (ad-platform CAPI + Google) is
   dropped from v2; WF-14..17 keep their numbers. Left column is the retired
   prior scheme, for traceability only. */
const NUMBERING_CROSSWALK: { old: string; canonical: string; note: string; dropped?: boolean }[] = [
  { old: "01 Lead Capture", canonical: "WF-01 Lead Capture and Attribution", note: "trigger locked to Contact Created + tag next-lander; Method 2 clinic stamps here only" },
  { old: "02 Non-Booked Recovery", canonical: "WF-02 Non-Booked Recovery", note: "burst SMS + template EML | WF-02 | Non-booked 24h; marketing quiet hours apply" },
  { old: "03 Booking Confirmation + 05 Appointment Reminders", canonical: "WF-03 Booking Confirmation and Reminders", note: "reminders merged in; T-3d/T-1d/T-5h/T-2h; transactional" },
  { old: "04 Confirmation Chase", canonical: "WF-04 Medical Intake Chase", note: "SMS at +4h and +20h; uses current_booking_url until a dedicated intake URL exists" },
  { old: "07 Appointment Outcome (auto-Won)", canonical: "WF-05 Clinic Outcome Router", note: "inbound webhook from Force; routes on sale_outcome_v2; workflows never move stages" },
  { old: "07 Post-Visit Sold", canonical: "WF-06 Post-Visit Won and Onboarding", note: "SOLD + new only; sole writer of v2_status_active; hands to WF-10 at T+14 and WF-14 at T+21" },
  { old: "08 A&D (Advised and Declined)", canonical: "WF-07 A&D Post-Visit No-Sale Nurture", note: "sale_outcome_v2 = AD; never fires Meta pixel or CAPI" },
  { old: "06 No-Show Recovery", canonical: "WF-08 No-Show and Cancel Recovery", note: "reschedule never enters; REMOVE-FROM-WF WF-03 on entry" },
  { old: "09 Renewal Reminders + 10 Long-Term Nurture", canonical: "WF-09 Long-Term Nurture (+ Renewal sub-flow)", note: "renewal sub-flow gated until backfill" },
  { old: "z Post-Visit Survey", canonical: "WF-10 Feedback Survey", note: "sole writer of contact.latest_feedback_score; marketing quiet hours" },
  { old: "scattered consent / DND steps", canonical: "WF-11 Compliance and Errors", note: "STOP inbound + MUT front-gate so MUT does not receive STOP-confirm" },
  { old: "z Call Disposition", canonical: "WF-12 Call Disposition Handler", note: "single graph keyed on channel; native update-in-place, no remove+create" },
  { old: "CAPI outbound webhook", canonical: "WF-13 Ad-Platform Conversions", note: "Dropped from v2. Curve owns ad-platform conversions. WF-14 to WF-17 keep their numbers.", dropped: true },
  { old: "12 Review and Referral (referral part)", canonical: "WF-14 Ambassador Program", note: "referred contact created new, never merged; live tag ambassador-referral" },
  { old: "PCC / Ambassador referral clones", canonical: "WF-15 PCC Referral Routing", note: "utm_source=pcc_qr; live tag pcc-referral; re-enters WF-01" },
  { old: "11 Missed Call Text-Back", canonical: "WF-16 Comms Edge", note: "IVR +18663444955 + two chat widgets; no Sales opp created here" },
  { old: "06. Price Calculator", canonical: "WF-17 Price Calculator (PCC Tool)", note: "internal math only; never writes opportunity.monetaryValue" },
];

const DROPPED_FROM_V2 = new Set<string>(["13"]);

function DestCard({ d }: { d: FieldDestination }) {
  const short = d.target.split(" ")[0];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{d.target}</Badge>
          <span className="text-xs text-muted-foreground">{d.card}</span>
        </div>
        <div className="mb-2 text-sm font-medium">{d.role}</div>
        <p className="mb-3 text-xs text-muted-foreground">{d.examples}</p>
        {d.removing && d.removing.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-foreground/70">Removing from Contact ({d.removing.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.removing.map((r) => <span key={r.key} className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-foreground/80">{r.label} → {r.to}</span>)}
            </div>
          </div>
        )}
        {d.adding && d.adding.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-foreground/70">Adding to {short} ({d.adding.length})</div>
            <div className="flex flex-wrap gap-1">
              {d.adding.map((a) => <span key={a.key} className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-foreground/80">{a.label}{a.note ? ` · ${a.note}` : ""}</span>)}
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
          <Lock className="h-4 w-4 text-accent" />
          <div className="text-sm font-bold text-foreground">Locked v2 spec</div>
        </div>
        <ul className="grid gap-1.5 text-xs text-foreground/90 sm:grid-cols-2">
          <li>Native GHL only. No custom code, no new SAC or Supabase backends.</li>
          <li>Clinics: <code className="rounded bg-muted px-1">richmond</code>, <code className="rounded bg-muted px-1">virginia-beach</code>, <code className="rounded bg-muted px-1">newport-news</code>. Method 2 stamps in WF-01 only. Do not invent clinic names.</li>
          <li>WF-01 enroll = Contact Created + tag <code className="rounded bg-muted px-1">next-lander</code>. <code className="rounded bg-muted px-1">wordpress-form</code> is an inner branch. Empty source defaults to next-lander.</li>
          <li>WP CID bridge stays: WPCode snippet 11461, Gravity Form 1, <code className="rounded bg-muted px-1">book.menswellnesscenters.com/api/handoff/wordpress</code>.</li>
          <li>New tags are <code className="rounded bg-muted px-1">v2_*</code>. Do not rename <code className="rounded bg-muted px-1">next-lander</code>, <code className="rounded bg-muted px-1">LOC_TAGS</code>, <code className="rounded bg-muted px-1">sms-consent</code>, <code className="rounded bg-muted px-1">funnel_entry_*</code>, <code className="rounded bg-muted px-1">location_*</code>.</li>
          <li>Force is the sole writer of dollars, <code className="rounded bg-muted px-1">sale_outcome</code> (SOLD, AD, MUT, MAR), <code className="rounded bg-muted px-1">sale_type</code>, and <code className="rounded bg-muted px-1">appt_status</code>.</li>
          <li>Workflows never move Sales stages. WF-05 routes only. MAR never fires WF-05.</li>
          <li>Transactional SMS has no Time Window (WF-01, 03, 04, 06, 07, 08, 11). Recovery and marketing (WF-02, 10) use 8am to 9pm contact TZ. First SMS in each sequence carries Reply STOP.</li>
        </ul>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Drafts on staging <code className="rounded bg-muted px-1">zHKH8aRDdNq47oYmdsN1</code>, folder <code className="rounded bg-muted px-1">6039c39d-f82d-4518-998c-749fb1ae57d1</code>. Production <code className="rounded bg-muted px-1">Ghstz8eIsHWLeXek47dk</code> is read-only. Nothing publishes until Eric says publish.
        </div>
      </CardContent>
    </Card>
  );
}

/* Chip helpers. All chip values come from /tobe-detail.json (built by
   build_tobe_v2_detail.py from /workspace/to-be/wf-*.json). */

function countByAction(steps: WFStep[] | undefined, action: string, namePrefix: string): number {
  if (!steps) return 0;
  return steps.filter((s) => s.action === action || s.name.toUpperCase().startsWith(namePrefix + ":")).length;
}

function shortTrigger(t: string | undefined): string | null {
  if (!t) return null;
  return t.split(" (")[0].trim();
}

function quietHoursChip(q: string | undefined): { label: string; tone: "good" | "warning" | "muted" | "neutral" } | null {
  if (!q) return null;
  const s = q.toLowerCase();
  if (s.startsWith("n/a") || s.includes("no sms")) return { label: "Quiet: n/a", tone: "muted" };
  if (s.startsWith("none")) return { label: "Transactional", tone: "good" };
  if (s.includes("08:00-21:00") || s.includes("8:00-21:00") || s.includes("8am") || s.includes("8am-9pm")) {
    return { label: "8am to 9pm quiet hours", tone: "neutral" };
  }
  return { label: "Quiet hours set", tone: "neutral" };
}

function draftChip(status: string | undefined): string | null {
  if (!status) return null;
  const m = status.match(/^(Draft v\d+)/i);
  return m ? m[1] : null;
}

interface ChipTone { label: string; tone: "good" | "warning" | "red" | "neutral" | "muted" | "accent"; }

function chipsFor(d: WFDetail | undefined): ChipTone[] {
  if (!d) return [];
  const chips: ChipTone[] = [];
  const trig = shortTrigger(d.trigger?.type);
  if (trig) chips.push({ label: trig, tone: "neutral" });
  const steps = d.steps ?? [];
  const sms = countByAction(steps, "Send SMS", "SMS");
  const email = countByAction(steps, "Send Email", "EMAIL");
  chips.push({ label: `${sms} SMS`, tone: sms > 0 ? "good" : "muted" });
  chips.push({ label: `${email} email`, tone: "muted" });
  chips.push({ label: `${steps.length} steps`, tone: "muted" });
  const qh = quietHoursChip(d.settings?.quiet_hours);
  if (qh) chips.push(qh);
  const draft = draftChip(d.settings?.status);
  if (draft) chips.push({ label: draft, tone: "muted" });
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
        const name = d?.name ?? w.name;
        const chips = chipsFor(d);
        return (
          <Link key={w.n} to={`/to-be/wf/${w.n}`} className="group block">
            <Card className="card-lift h-full">
              <CardContent className="p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground/60">WF-{w.n}</span>
                    <span className="text-base font-bold text-foreground">{name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                {w.copy && <p className="mb-3 line-clamp-3 text-sm text-foreground/85">{w.copy}</p>}
                {chips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {chips.map((c, i) => (
                      <Badge key={i} tone={c.tone}>{c.label}</Badge>
                    ))}
                  </div>
                )}
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

  const liveWorkflows = data.tobe_workflows.filter((w) => !DROPPED_FROM_V2.has(w.n));
  const liveCount = liveWorkflows.length;

  return (
    <PageShell
      title="Target · locked v2 spec"
      subtitle={`${liveCount} single-purpose workflows (WF-01 to WF-17; WF-13 dropped). Native GHL. Drafts on staging. Force writes outcomes. Nothing publishes until Eric says publish.`}
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
                <div className="text-sm font-bold text-foreground">Canonical numbering</div>
                <p className="text-xs text-muted-foreground">WF-01 to WF-17. WF-13 dropped. Left column is the retired prior scheme, for traceability only.</p>
              </div>
              <Link to="/wf-diagrams" className="inline-flex items-center gap-1 rounded-sm border-2 border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                Flow diagrams
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pe-3 font-semibold">Prior (retired)</th>
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
                        {row.dropped && <Badge tone="red" className="ms-2">Dropped</Badge>}
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
                  title="Open pipelines in GHL" className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-muted hover:text-foreground">
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
            <b>Four destinations, each owning its own data.</b> Contact holds identity, durable profile, and GHL-native consent. Opportunity owns sale outcome and money. Medical records stay in the external EMR (GHL keeps only <code className="rounded bg-muted px-1">emr_patient_id</code> on Contact and <code className="rounded bg-muted px-1">emr_visit_id</code> on Opportunity). Never-used fields retire. No custom objects. <b>Attribution owner is Curve.</b> WF-01 does not copy gclid, fbc, fbp, wbraid, gbraid, or UTM onto the Opportunity. GHL keeps only coarse ops source (<code className="rounded bg-muted px-1">next-lander</code> vs <code className="rounded bg-muted px-1">wordpress-form</code>) plus clinic slug. Force is the sole writer of <code className="rounded bg-muted px-1">sale_outcome</code>, <code className="rounded bg-muted px-1">sale_type</code>, <code className="rounded bg-muted px-1">appt_status</code>, and dollars.
          </CardContent></Card>
          <div className="grid gap-3 md:grid-cols-2">
            {data.field_destinations.map((d, i) => <DestCard key={i} d={d} />)}
          </div>
        </RoutedTabPanel>
      </RoutedTabs>
    </PageShell>
  );
}
