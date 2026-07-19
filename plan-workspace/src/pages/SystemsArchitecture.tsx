import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { Database, AppWindow, AlertTriangle } from "lucide-react";

const FLOW = `flowchart LR
  subgraph SURF["Acquisition surfaces"]
    WP["WordPress<br/>menswellnesscenters.com<br/>(organic / SEO)"]
    BK["mwc-next booking funnel<br/>book.menswellnesscenters.com<br/>(paid)"]
    CALL["Inbound calls<br/>RingCentral"]
  end
  subgraph GHL["GoHighLevel (prod Ghstz8eIsHWLeXek47dk)"]
    CRM[("Contacts · Opportunities<br/>Calendars · Pipelines")]
    WFS["Workflows WF-01..17<br/>(Target Release drafts)"]
  end
  subgraph ADMIN["MWC Admin (Vercel) — includes SAC"]
    SAC["SAC ingest + outbox<br/>server-side conversions"]
    DASH["Ops dashboards<br/>attribution stats · deploys · webhooks"]
  end
  subgraph SB1["Supabase · Booking Admin"]
    FE[("funnel_events")]
    AR[("attribution_records")]
  end
  subgraph FORCE["Force (formerly Pulse, Vercel)"]
    GRID["Daily consultation grid<br/>PCC disposition entry"]
  end
  subgraph NEON["Neon · MWC Sales Pulse (Postgres 18)"]
    NAPP[("appointments · dispositions<br/>sync_events · users · audit_log")]
    NAUTH[("neon_auth schema<br/>sessions · orgs · members")]
  end
  subgraph ADS["Ad platforms"]
    G["Google Ads<br/>offline conversions + EC"]
    M["Meta CAPI"]
  end
  LB["Lobbie EMR<br/>(reserved seam)"]
  WP --> BK
  BK -- "create contact + appt" --> CRM
  BK -- "server events" --> FE
  CALL --> CRM
  CRM --> WFS
  WFS -- "webhooks (lead/outcome/won)" --> SAC
  FE --> SAC
  SAC --> AR
  SAC --> G
  SAC --> M
  AR --> DASH
  CRM -- "appointment sync" --> NAPP
  GRID --> NAPP
  NAPP -- "disposition writeback" --> CRM
  NAUTH --- GRID
  LB -.-> SAC
  LB -.-> CRM`;

const SB_ADMIN = [
  { t: "public.funnel_events", d: "Append-only funnel event spine written by the booking app (mwc-next) and GHL webhooks. SAC's ingest source of truth.", rows: 26 },
  { t: "public.attribution_records", d: "Resolved attribution per lead/deal: click IDs, UTMs, source resolution, join keys to GHL contact/opportunity ids.", rows: 19 },
];
const NEON_TABLES = [
  { t: "public.appointments", d: "Daily consultation grid rows synced from GHL calendars" },
  { t: "public.dispositions", d: "PCC outcome entries (the Force disposition flow)" },
  { t: "public.sync_events", d: "GHL sync bookkeeping (what was pulled/pushed when)" },
  { t: "public.users / settings / filter_presets / audit_log", d: "App users, config, saved views, change audit" },
  { t: "neon_auth.*", d: "Better Auth: users, sessions, organizations, members, JWKS" },
];

export default function SystemsArchitecture() {
  return (
    <PageShell
      title="Systems architecture"
      subtitle="How the pieces fit: GHL as CRM spine, Admin (with SAC) as the attribution and conversion layer, Force as the clinic operations console, and the databases behind each. Structures below were read live from Supabase and Neon on 2026-07-19."
    >
      <Card><CardContent className="p-3">
        <MermaidChart src={FLOW} active zoomable />
      </CardContent></Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><AppWindow className="h-4 w-4 text-indigo-600" /> MWC Admin — includes SAC</div>
          <p className="mt-1 text-sm text-muted-foreground">Internal admin on Vercel. Reads attribution stats, Vercel deployments, and GHL appointment-status webhooks. SAC (Server-side Attribution & Conversions) lives here: ingest endpoints, junk filter, anonymized event store, and the outbox that sends Google offline conversions and Meta CAPI events. Nothing browser-side sends to ad platforms.</p>
          <div className="mt-3 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Database className="h-3.5 w-3.5" /> Supabase · Booking Admin <span className="font-mono">(xlttgyayktqbpckbyvcf)</span></div>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {SB_ADMIN.map((x) => (
                  <tr key={x.t} className="border-b align-top last:border-0">
                    <td className="w-56 py-1.5 pe-2 font-mono text-xs">{x.t}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">{x.d} <Badge tone="muted">{x.rows} rows</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[11px] text-muted-foreground">RLS enabled on both tables. SAC additions land here: conversions_outbox, reconciliation_daily (R2).</div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><AppWindow className="h-4 w-4 text-emerald-600" /> Force — formerly Pulse</div>
          <p className="mt-1 text-sm text-muted-foreground">The clinic operations console on Vercel: live daily consultation grid per clinic and PCC disposition entry. Syncs appointments from GHL, records outcomes, and writes dispositions back to the CRM. Auth via Neon Auth (Better Auth).</p>
          <div className="mt-3 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Database className="h-3.5 w-3.5" /> Neon · MWC Sales Pulse <span className="font-mono">(morning-mud-33436920, PG 18)</span></div>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {NEON_TABLES.map((x) => (
                  <tr key={x.t} className="border-b align-top last:border-0">
                    <td className="w-56 py-1.5 pe-2 font-mono text-xs">{x.t}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">{x.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </div>

      <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
        <span className="me-1 inline-flex items-center gap-1 font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-600" /> Duplication to resolve:</span>
        a second Supabase project <span className="font-mono text-xs">MWC-Pulse (urwgqwvrfmnttzebpxxz)</span> holds the same seven tables Force now keeps in Neon (appointments 67, dispositions 50, sync_events 52 rows). Neon is the selected home (created after, carries neon_auth, actively used). Confirm nothing still writes to the Supabase copy, then archive it — two writable homes for disposition data would recreate the single-writer defect at the database layer.
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold">Data ownership</div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• <b className="text-foreground">GHL</b>: members, deals, calendars, messaging — the CRM system of record</li>
            <li>• <b className="text-foreground">Supabase (Booking Admin)</b>: funnel events + attribution — SAC's anonymized measurement store</li>
            <li>• <b className="text-foreground">Neon (Sales Pulse)</b>: operational grid state + dispositions — Force's working store</li>
            <li>• <b className="text-foreground">Lobbie</b> (future): clinical/EMR system of record; feeds show/renewal truth via the reserved seam</li>
          </ul>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold">Write paths (single writer each)</div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• Booking app writes GHL contacts/appointments and funnel_events</li>
            <li>• GHL workflows write opportunity stamps and emit webhooks</li>
            <li>• Force writes dispositions to Neon, then back to GHL (one writeback path)</li>
            <li>• SAC alone writes to Meta/Google — no pixels, no GHL-direct sends after cutover</li>
          </ul>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold">Compliance posture</div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• PHI stays in GHL (HIPAA-enabled) and later Lobbie</li>
            <li>• Supabase stores anonymized events: opaque GHL ids, hashed identifiers, no condition data</li>
            <li>• RLS enabled on all Supabase tables; Neon Auth gates Force</li>
            <li>• BAA verification for Supabase tier is an R2 gate</li>
          </ul>
        </CardContent></Card>
      </div>
    </PageShell>
  );
}
