import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Loading } from "../components/ui";
import { useJson } from "../lib/asis";
import { ArrowRight, Plus, RefreshCw, Archive, User, Target, BarChart3, Check, X, ExternalLink, ListTodo } from "lucide-react";

interface AddedField { key: string; name: string; dataType: string; options: string[]; reason: string; }
interface RetypedField { key: string; name: string; before_type: string; after_type: string; before_options: string[]; after_options: string[]; note: string; }
interface OptField { key: string; name: string; dataType: string; before_options: string[]; after_options: string[]; }
interface DepField { key: string; name: string; dataType: string; superseded_by: string; }
interface FieldDiff {
  cody_location: string; neo_location: string; captured: string;
  counts: { cody_contact: number; cody_opportunity: number; neo_contact: number; neo_opportunity: number };
  added: AddedField[]; retyped: RetypedField[]; options_changed: OptField[]; deprecated: DepField[]; removed: { key: string; name: string }[];
}

const Chip = ({ v, tone }: { v: string; tone?: "old" | "new" }) => (
  <span className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${tone === "old" ? "bg-red-500/10 text-red-700 line-through decoration-red-400 dark:text-red-400" : tone === "new" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted/40"}`}>{v}</span>
);

// Plain-language reasons for the 5 new opportunity fields.
const SIMPLE_REASON: Record<string, string> = {
  "opportunity.provider": "So we always know which provider handled each sale — even when the renewal is seen by someone else.",
  "opportunity.appt_status": "Records whether the member actually showed for the visit behind this deal.",
  "opportunity.lead_source": "Saves where this specific deal came from, at the moment it's created.",
  "opportunity.outcome_processed_at": "A timestamp that stops the same sale from being counted twice.",
  "opportunity.referred_by": "Who referred this deal — so referral rewards go to the right person, every time.",
};

export default function CodyNeoFieldDiff() {
  const { data, isLoading } = useJson<FieldDiff>("/codyneo-fielddiff.json");
  if (isLoading || !data) return <Loading />;
  const movedTargets = new Set(data.deprecated.map((d) => d.superseded_by).filter(Boolean)).size;

  return (
    <PageShell
      title="What changed with custom fields, and why"
      subtitle={`A plain-language guide to the field changes in the Cody Neo copy (${data.neo_location}), for both teams. Captured live on ${data.captured}. Nothing was deleted.`}
    >
      {/* TL;DR */}
      <div className="rounded-md border border-l-4 border-l-emerald-500 bg-card p-4">
        <div className="text-lg font-bold">TL;DR — deal data now lives on the deal.</div>
        <div className="mt-1 text-sm text-muted-foreground">
          <b className="text-foreground">{data.deprecated.length} fields about the sale moved off the member's contact record</b> and are now owned by {movedTargets} fields on the opportunity (the deal record). <b className="text-foreground">{data.added.length} new opportunity fields</b> were added (including Provider). <b className="text-foreground">All dropdowns now store short codes</b> like <Chip v="sold" tone="new" /> instead of display text. The old contact fields still exist — they're parked in a folder called <span className="font-mono text-xs">zz Deprecated</span>, so today's PCC form keeps working.
        </div>
      </div>

      {/* The one rule */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">The one rule behind every change</h2>
        <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
          <b className="text-foreground">If a fact describes the sale, it goes on the opportunity. If it describes the member, it stays on the contact.</b> A member has one contact record forever, but every sale — including each renewal — is its own opportunity. A contact field can only hold one value, so writing this year's renewal on the contact <b className="text-foreground">erases last year's sale</b>. That single mistake is why revenue in the live account can't be reported per deal, per clinic, or per rep today.
        </div>
        <Card><CardContent className="p-0">
          <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Example: the same member buys twice. Watch what the contact-field approach destroys.</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Fact about the sale</th><th className="px-3 py-2">2025 — first sale</th><th className="px-3 py-2">2026 — renewal</th><th className="px-3 py-2">If it lived on the contact…</th>
            </tr></thead>
            <tbody>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">Who sold it (PCC)</td><td className="px-3 py-1.5">Morgan</td><td className="px-3 py-1.5">Ashley</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">Morgan's 2025 sale credit is erased</td></tr>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">Provider</td><td className="px-3 py-1.5">Papariello, MD</td><td className="px-3 py-1.5">Kash, NP</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">Can't tell which provider produced which revenue</td></tr>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">Term</td><td className="px-3 py-1.5">12 months</td><td className="px-3 py-1.5">6 months</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">History of what they bought is gone</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">The ad that drove it</td><td className="px-3 py-1.5">Google search ad</td><td className="px-3 py-1.5">Renewal email</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">The 2025 ad loses its sale — ad spend looks worse than it is</td></tr>
            </tbody>
          </table>
        </CardContent></Card>
        {/* Before / After picture */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><X className="h-4 w-4 text-red-500" /> Before</div>
            <p className="mt-1 text-sm text-muted-foreground">Every sale writes onto the <b className="text-foreground">contact</b>. Each new deal overwrites the last one. One member = one blob of "latest deal" data.</p>
            <div className="mt-2 rounded-md border bg-muted/30 p-2 text-center font-mono text-xs text-muted-foreground">sale #1 → CONTACT ← sale #2 (overwrites #1)</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-emerald-600" /> After</div>
            <p className="mt-1 text-sm text-muted-foreground">Each sale writes onto its own <b className="text-foreground">opportunity</b>. The contact keeps only member-level facts (consent, membership status, renewal date).</p>
            <div className="mt-2 rounded-md border bg-muted/30 p-2 text-center font-mono text-xs text-muted-foreground">sale #1 → OPP #1&nbsp;&nbsp;·&nbsp;&nbsp;sale #2 → OPP #2&nbsp;&nbsp;·&nbsp;&nbsp;member → CONTACT</div>
          </CardContent></Card>
        </div>
      </section>

      {/* What this means for you */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">What this means for you</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-sky-600" /> PCCs and clinic staff</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>• Your form works exactly as it does today — nothing to relearn yet.</li>
              <li>• Behind the scenes, each disposition now saves to that visit's deal, so your sale credit can't be overwritten by a later visit.</li>
              <li>• Next iteration: the form will save straight to the deal.</li>
            </ul>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-amber-600" /> Cody's build team</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>• Never write sale data to contact fields — the opportunity owns it now.</li>
              <li>• Only write opportunity fields right after a create/update/find-opportunity step.</li>
              <li>• Dropdown writes use the exact codes (e.g. <Chip v="sold" />), never display text.</li>
              <li>• Never set dollar fields from a workflow — the form is their only writer.</li>
              <li>• Don't build triggers off opportunity field changes — GHL can't do it.</li>
            </ul>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-emerald-600" /> Reporting and leadership</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>• Revenue can finally be sliced per deal, per clinic, per PCC, per provider, per product, and new vs renewal.</li>
              <li>• Renewals stop erasing first-sale history, so LTV and renewal math get honest.</li>
              <li>• Each deal keeps a frozen record of the ad that created it — spend-to-revenue reporting works.</li>
            </ul>
          </CardContent></Card>
        </div>
      </section>

      {/* Change list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">The changes, field by field</h2>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-emerald-600" /> Added to the opportunity ({data.added.length})</div>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {data.added.map((f) => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="w-56 py-1.5 pe-3"><div className="font-medium">{f.name}</div><div className="break-all font-mono text-[10px] text-muted-foreground">{f.key}</div></td>
                  <td className="py-1.5 text-sm text-muted-foreground">{SIMPLE_REASON[f.key] || f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="h-4 w-4 text-sky-600" /> Dropdowns now store codes ({data.retyped.length + data.options_changed.length})</div>
          <p className="mt-1 text-sm text-muted-foreground">Automations branch on these values, so they must never change with wording. Old label on the left, new code on the right. Sale Outcome also went from multi-select to single-select — a sale has exactly one outcome — and "A&D" is now <Chip v="nosale" tone="new" /> (avoids confusion with "ad" as in advertising).</p>
          <div className="mt-2 space-y-2">
            {[...data.retyped.map((f) => ({ key: f.key, name: f.name, before: f.before_options, after: f.after_options })),
              ...data.options_changed.map((f) => ({ key: f.key, name: f.name, before: f.before_options, after: f.after_options }))].map((f) => (
              <div key={f.key} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0 last:pb-0">
                <div className="w-44 shrink-0 text-sm font-medium">{f.name}</div>
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {f.before.map((o) => <Chip key={"b" + o} v={o} tone="old" />)}
                  <ArrowRight className="mx-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {f.after.map((o) => <Chip key={"a" + o} v={o} tone="new" />)}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Archive className="h-4 w-4 text-violet-600" /> Moved off the contact ({data.deprecated.length})</div>
          <p className="mt-1 text-sm text-muted-foreground">These contact fields are parked in the <span className="font-mono text-xs">zz Deprecated</span> folder — not deleted — so the current PCC form keeps working. The workflows copy their values onto the deal at disposition time. Once the form writes the opportunity directly, these retire.</p>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pe-3">Old contact field</th><th className="py-2 pe-3">Now lives at</th>
            </tr></thead>
            <tbody>
              {data.deprecated.map((f) => (
                <tr key={f.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-1.5 pe-3"><div>{f.name}</div><div className="break-all font-mono text-[10px] text-muted-foreground">{f.key}</div></td>
                  <td className="break-all py-1.5 pe-3 font-mono text-xs text-emerald-700 dark:text-emerald-400">{f.superseded_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      {/* GHL rules */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">GHL's rules for opportunity fields (why the build is wired this way)</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">GHL treats opportunity fields differently from contact fields. These are platform facts, confirmed against HighLevel's documentation — the design above follows them rather than fighting them.</p>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {[
                { rule: "An opportunity field can only be read or written when the workflow knows WHICH deal it's working on.", how: "Every write happens right after a step that creates, updates, or finds the deal.", link: "https://help.gohighlevel.com/support/solutions/articles/155000004751-workflow-action-find-opportunity", label: "GHL docs" },
                { rule: "You can't start an automation from \"this opportunity field changed\".", how: "All automations start from member-level events (form submitted, tag added). Renewal reminders key off the contact's renewal date, which GHL CAN trigger on.", link: "https://ideas.gohighlevel.com/automations/p/trigger-on-custom-field-update-in-opportunities", label: "feature request" },
                { rule: "Workflows can't copy dollar amounts into opportunity money fields.", how: "Dollar fields are only ever written by the PCC form. The built-in Opportunity Value carries revenue for reporting.", link: "https://ideas.gohighlevel.com/automations/p/use-merge-tags-to-update-monetary-and-numeric-custom-fields-within-workflow-acti", label: "ideas board" },
                { rule: "A dropdown write must exactly match one of its options.", how: "Workflows write fixed codes per branch (the sold branch writes \"sold\"). Nothing is copied between fields whose option lists don't match.", link: null, label: null },
                { rule: "Zapier and Make barely support opportunity fields.", how: "The parked contact fields stay available as a bridge for outside tools; serious integrations use GHL's API, which supports them fully.", link: "https://ideas.gohighlevel.com/opportunities/p/opportunity-custom-fields-available-to-update-via-zapier", label: "ideas board" },
              ].map((r, i) => (
                <tr key={i} className="border-b align-top last:border-0">
                  <td className="w-1/2 px-3 py-2 text-sm"><b>{r.rule}</b>{r.link && <a className="ms-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href={r.link} target="_blank" rel="noopener noreferrer">{r.label}<ExternalLink className="h-3 w-3" /></a>}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{r.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      {/* Next steps */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><ListTodo className="h-4 w-4" /> Next steps</h2>
        <Card><CardContent className="p-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Badge tone="warning">Cody</Badge> Update the PCC form to write the opportunity fields directly — especially Sale Type, Product, and the dollar amounts (workflows can't write those). Then the parked contact fields can retire.</li>
            <li className="flex gap-2"><Badge tone="warning">Cody</Badge> Add a visit-status check before the outcome branches in the three disposition routers, so a no-show can't be dispositioned as a sale.</li>
            <li className="flex gap-2"><Badge tone="muted">MWC</Badge> Spot-check one "Opp: stamp" step in the Richmond router builder and run one test contact through to confirm the attribution values populate.</li>
            <li className="flex gap-2"><Badge tone="muted">MWC</Badge> After cutover proves clean, delete the parked contact fields and the "ZZ API Write Probe" workflow.</li>
          </ul>
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
