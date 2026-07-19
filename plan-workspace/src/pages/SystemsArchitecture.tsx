import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { Database, AppWindow, AlertTriangle } from "lucide-react";

// Wide-canvas architecture: five columns of intent read left-to-right
// (surfaces → core CRM → event/attribution + ops → stores → activation),
// with EMR anchored as a reserved seam. Designed for a 2K display.
const FLOW = `%%{init: {"theme":"base","flowchart":{"nodeSpacing":45,"rankSpacing":90,"padding":18,"htmlLabels":true,"curve":"basis"},"themeVariables":{"fontSize":"15px","fontFamily":"ui-sans-serif, system-ui, -apple-system","primaryColor":"#eef2ff","primaryBorderColor":"#4f46e5","primaryTextColor":"#0f172a","lineColor":"#475569","clusterBkg":"#f8fafc","clusterBorder":"#cbd5e1"}}}%%
flowchart LR
  %% ---------- Column 1: acquisition surfaces ----------
  subgraph SURF["◉  ACQUISITION SURFACES"]
    direction TB
    WP["<b>WordPress</b><br/><span style='font-size:12px;color:#64748b'>menswellnesscenters.com<br/>organic · SEO</span>"]
    BK["<b>mwc-next booking</b><br/><span style='font-size:12px;color:#64748b'>book.menswellnesscenters.com<br/>paid funnel</span>"]
    CALL["<b>Inbound calls</b><br/><span style='font-size:12px;color:#64748b'>RingCentral</span>"]
  end

  %% ---------- Column 2: CRM spine ----------
  subgraph GHL["◉  GHL PROD  ·  Ghstz8eIsHWLeXek47dk"]
    direction TB
    CRM[("<b>Contacts · Opportunities</b><br/><span style='font-size:12px;color:#64748b'>Calendars · Pipelines</span>")]
    WFS["<b>Workflows WF-01..17</b><br/><span style='font-size:12px;color:#64748b'>Target Release drafts</span>"]
    CRM --- WFS
  end

  %% ---------- Column 3: MWC applications ----------
  subgraph APPS["◉  MWC APPLICATIONS"]
    direction TB
    subgraph ADMIN["MWC Admin  ·  includes SAC"]
      direction TB
      SAC["<b>SAC</b><br/><span style='font-size:12px;color:#64748b'>ingest · outbox · dedupe<br/>server-side only</span>"]
      DASH["<b>Ops dashboards</b><br/><span style='font-size:12px;color:#64748b'>attribution · deploys · webhooks</span>"]
    end
    subgraph FORCE["Force  ·  formerly Pulse"]
      GRID["<b>Daily consult grid</b><br/><span style='font-size:12px;color:#64748b'>PCC disposition entry</span>"]
    end
  end

  %% ---------- Column 4: data stores ----------
  subgraph STORES["◉  DATA STORES"]
    direction TB
    subgraph SB["Supabase  ·  Booking Admin"]
      direction TB
      FE[("funnel_events")]
      AR[("attribution_records")]
    end
    subgraph NEON["Neon  ·  MWC Sales Pulse  ·  PG18"]
      direction TB
      NAPP[("appointments<br/>dispositions<br/>sync_events")]
      NAUTH[("neon_auth<br/>sessions · orgs")]
    end
  end

  %% ---------- Column 5: activation ----------
  subgraph ADS["◉  AD PLATFORMS"]
    direction TB
    G["<b>Google Ads</b><br/><span style='font-size:12px;color:#64748b'>offline conversions<br/>Enhanced Conversions</span>"]
    M["<b>Meta CAPI</b><br/><span style='font-size:12px;color:#64748b'>server events</span>"]
  end

  %% ---------- reserved seam ----------
  LB["<b>Lobbie EMR</b><br/><span style='font-size:12px;color:#64748b'>reserved seam</span>"]

  %% ---------- edges ----------
  WP ==> BK
  BK == "contact + appt" ==> CRM
  BK == "server events" ==> FE
  CALL ==> CRM
  WFS == "webhooks<br/>lead · outcome · won" ==> SAC
  FE ==> SAC
  SAC == write ==> AR
  AR ==> DASH
  CRM -. sync .-> NAPP
  GRID ==> NAPP
  NAPP -. writeback .-> CRM
  NAUTH -.- GRID
  SAC ==> G
  SAC ==> M
  LB -. future .-> SAC
  LB -. future .-> CRM

  %% ---------- styling ----------
  classDef surf fill:#fff7ed,stroke:#f97316,stroke-width:1.5px,color:#7c2d12
  classDef ghl  fill:#eff6ff,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a
  classDef apps fill:#eef2ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
  classDef store fill:#ecfdf5,stroke:#059669,stroke-width:1.5px,color:#064e3b
  classDef ads  fill:#fef2f2,stroke:#dc2626,stroke-width:1.5px,color:#7f1d1d
  classDef seam fill:#f5f5f4,stroke:#78716c,stroke-width:1.5px,color:#44403c,stroke-dasharray:4 3

  class WP,BK,CALL surf
  class CRM,WFS ghl
  class SAC,DASH,GRID apps
  class FE,AR,NAPP,NAUTH store
  class G,M ads
  class LB seam`;

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
      <Card><CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500" /> Surfaces</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> GHL CRM</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-indigo-500" /> Apps (SAC · Force)</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Stores</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500" /> Ad platforms</span>
          <span className="ms-auto text-muted-foreground/70">Designed at 2K · use zoom controls to inspect</span>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 1800 }}>
            <MermaidChart src={FLOW} active zoomable />
          </div>
        </div>
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
