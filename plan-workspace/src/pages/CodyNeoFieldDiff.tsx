import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Stat, Loading } from "../components/ui";
import { useJson } from "../lib/asis";
import { ArrowRight, Plus, RefreshCw, ListChecks, Archive, AlertTriangle, ExternalLink } from "lucide-react";

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

export default function CodyNeoFieldDiff() {
  const { data, isLoading } = useJson<FieldDiff>("/codyneo-fielddiff.json");
  if (isLoading || !data) return <Loading />;
  const c = data.counts;

  return (
    <PageShell
      title="Cody Neo — custom field diff"
      subtitle={`Every schema change between the Cody build (${data.cody_location}) and the corrected copy (${data.neo_location}), captured live on ${data.captured}. No fields were deleted; per-deal contact fields were parked, not removed.`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Opportunity fields" value={`${c.cody_opportunity} → ${c.neo_opportunity}`} note={`${data.added.length} added, 1 recreated`} tone="good" />
        <Stat label="Contact fields" value={c.neo_contact} note={`${data.deprecated.length} parked as deprecated`} />
        <Stat label="Enums normalized" value={data.options_changed.length + data.retyped.length} note="prose → lowercase codes" tone="blue" />
        <Stat label="Fields deleted" value={data.removed.length} note="nothing destroyed" />
        <Stat label="Type changes" value={data.retyped.length} note="delete + recreate required" tone="warning" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Why these fields must live on the Opportunity, not the Contact</h2>
        <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
          <b className="text-foreground">The cardinality rule.</b> A Contact is one record per member; an Opportunity is one record per deal. A custom field holds exactly one value — so a contact field can only ever describe the <b className="text-foreground">latest</b> deal. A member holds one membership, but renewals are separate transactions: whoever renews is likely a different deal shape — different term, different PCC, different <b className="text-foreground">provider</b> — and a contact-level field silently overwrites last year's record the moment this year's is written. The deal history is destroyed at the source, which is exactly defect D2 in the live account (outcome data on the Contact → ~939 false wins, 57–99% of won deals carrying $0, revenue unreportable per deal, per clinic, or per rep).
        </div>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Same member, two deals</th><th className="px-3 py-2">Jan 2025 — new sale</th><th className="px-3 py-2">Jan 2026 — renewal</th><th className="px-3 py-2">If stored on the Contact…</th>
            </tr></thead>
            <tbody className="text-sm">
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">sale_type</td><td className="px-3 py-1.5 font-mono text-xs">new</td><td className="px-3 py-1.5 font-mono text-xs">renewal</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">2025 no longer counts as a new sale — new-vs-renewal KPI split breaks</td></tr>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">patient_care_consultant</td><td className="px-3 py-1.5 font-mono text-xs">Morgan</td><td className="px-3 py-1.5 font-mono text-xs">Ashley</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">Morgan loses credit for the 2025 close — PCC bonus attribution corrupts</td></tr>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">provider</td><td className="px-3 py-1.5 font-mono text-xs">Papariello, MD</td><td className="px-3 py-1.5 font-mono text-xs">Kash, NP</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">Which provider produced which revenue is unknowable</td></tr>
              <tr className="border-b"><td className="px-3 py-1.5 font-medium">term_1</td><td className="px-3 py-1.5 font-mono text-xs">12 Month</td><td className="px-3 py-1.5 font-mono text-xs">6 Month</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">Historical contract terms gone; LTV and renewal math skew</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">utm_campaign / gclid</td><td className="px-3 py-1.5 font-mono text-xs">rva_trt_search</td><td className="px-3 py-1.5 font-mono text-xs">renewal_email</td><td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">2025's ad campaign loses its Won conversion — spend-to-revenue loop breaks</td></tr>
            </tbody>
          </table>
        </CardContent></Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Revenue rolls up on deals</div>
            <p className="mt-1 text-sm text-muted-foreground">GHL pipeline reporting (won value, close rate, per-pipeline rollups) reads the Opportunity record. Dimensions you want revenue sliced by — rep, provider, product, location, new vs renewal — only join that report if they sit on the opportunity itself.</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">Frozen vs living attribution</div>
            <p className="mt-1 text-sm text-muted-foreground">The Contact carries living, last-touch attribution that updates on every new session. The Opportunity carries a frozen stamp of what created that specific revenue event — written once at create, never updated — so ad-platform conversions credit the right campaign even years later.</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm font-semibold">What stays on the Contact</div>
            <p className="mt-1 text-sm text-muted-foreground">Current state that is true once per member: identity, consent/DND, membership_status, renewal_date, preferences. These need contact-level superpowers — form writes, specific field-change triggers, custom-date triggers — that opportunity fields do not get in GHL.</p>
          </CardContent></Card>
        </div>
      </section>

      {/* Platform limitations */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" /> GHL limitations on opportunity custom fields — confirmed, and how this design accounts for them</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Opportunity custom fields are second-class citizens in GHL relative to contact fields. Each limitation below is confirmed against HighLevel's docs and ideas board, and the Neo build is shaped around it — this is why some data deliberately stays on the Contact, and why the writers are wired the way they are.</p>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Platform limitation</th><th className="px-3 py-2">How the Neo build accounts for it</th>
            </tr></thead>
            <tbody>
              <tr className="border-b align-top">
                <td className="px-3 py-2"><b>Merge fields and opp writes need a bound opportunity.</b> Reading or writing <span className="font-mono text-xs">{"{{opportunity.*}}"}</span> only works when the workflow has an opportunity in context — an opportunity-based trigger, or a Create/Update/Find Opportunity step earlier in the flow. Without context, merge fields render empty and writes go nowhere. <a className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href="https://help.gohighlevel.com/support/solutions/articles/155000004751-workflow-action-find-opportunity" target="_blank" rel="noopener noreferrer">Find Opportunity docs<ExternalLink className="h-3 w-3" /></a></td>
                <td className="px-3 py-2">Every “Opp: stamp” node is spliced <b>immediately after</b> an opportunity create/update action, which binds the context in the same chain. Workflows that need to touch the opportunity later (per the port pass) get an explicit <span className="font-mono text-xs">find_opportunity</span> guard first. No stamp runs on a bare contact trigger.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="px-3 py-2"><b>No trigger on a specific opp field change.</b> The Opportunity Changed trigger fires on any modification; you cannot trigger on “sale_outcome was set” or run custom-date triggers off an opportunity date field. <a className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href="https://ideas.gohighlevel.com/automations/p/trigger-on-custom-field-update-in-opportunities" target="_blank" rel="noopener noreferrer">open feature request<ExternalLink className="h-3 w-3" /></a></td>
                <td className="px-3 py-2">Nothing in the build triggers off opportunity field changes. Routing triggers stay contact-level (form submission, tags), and the opp fields are written as <b>outputs</b> inside those flows. <span className="font-mono text-xs">renewal_date</span> deliberately stays a <b>Contact</b> field so renewal campaigns can use the native custom-date trigger.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="px-3 py-2"><b>Monetary/numeric opp fields reject merge tags in workflow actions.</b> Update actions can set them to literals only — you cannot copy a dollar amount from a contact field via <span className="font-mono text-xs">{"{{contact.x}}"}</span>. <a className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href="https://ideas.gohighlevel.com/automations/p/use-merge-tags-to-update-monetary-and-numeric-custom-fields-within-workflow-acti" target="_blank" rel="noopener noreferrer">ideas board<ExternalLink className="h-3 w-3" /></a></td>
                <td className="px-3 py-2">The five MONETORY fields (<span className="font-mono text-xs">total_program_amount</span>, <span className="font-mono text-xs">price_1/2</span>, <span className="font-mono text-xs">money_down</span>, <span className="font-mono text-xs">remaining_balance</span>) are <b>never</b> written by workflow stamps. Their single writer is the PCC form (which can write opp fields directly); the native Opportunity Value field carries net revenue for reporting and conversions.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="px-3 py-2"><b>Select-option values must match exactly.</b> A workflow write of a value that is not in the option list (or a merge-copy of prose into a code enum) produces mismatched data that if/else conditions cannot branch on.</td>
                <td className="px-3 py-2">Enum stamps are <b>branch-static codes</b>, never merge copies: the sold branch writes the literal <span className="font-mono text-xs">sold</span>, each objection branch writes its literal reason code. Merge copies are used only where the value spaces match exactly (PCC and provider names) or the target is free TEXT (<span className="font-mono text-xs">term_1</span>, <span className="font-mono text-xs">referred_by</span>). <span className="font-mono text-xs">sale_type</span> and <span className="font-mono text-xs">product_sold_1</span> are deliberately NOT merge-copied (prose contact options vs code enums) — the PCC form writes them directly.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="px-3 py-2"><b>Weak Zapier/Make support.</b> Third-party integrations mostly cannot read or set opportunity custom fields; the common workaround is mirroring through a contact field. <a className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href="https://ideas.gohighlevel.com/opportunities/p/opportunity-custom-fields-available-to-update-via-zapier" target="_blank" rel="noopener noreferrer">ideas board<ExternalLink className="h-3 w-3" /></a></td>
                <td className="px-3 py-2">The deprecated contact fields are parked, not deleted — they remain available as a mirror/staging layer for any external tooling during transition. Server-side integrations use the public API (v2 supports opportunity custom fields), not Zapier.</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2"><b>No field-change automation, form-first writes.</b> Contact fields get form writes, specific field-change triggers, and custom-date triggers; opportunity fields get none of these superpowers by default (forms CAN include opportunity fields when the submission creates/updates an opportunity). <a className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline" href="https://help.gohighlevel.com/support/solutions/articles/48001161579-how-to-use-custom-fields" target="_blank" rel="noopener noreferrer">custom fields docs<ExternalLink className="h-3 w-3" /></a></td>
                <td className="px-3 py-2">The split follows the capability boundary: anything needing triggers or member-facing form capture as <b>input</b> stays on the Contact (consent, <span className="font-mono text-xs">membership_status</span>, <span className="font-mono text-xs">renewal_date</span>, preferences); the Opportunity holds per-deal <b>outputs</b> written by exactly one workflow stamp or the PCC form. Follow-up: move the PCC form to direct opportunity-field writes so the parked contact staging layer can retire.</td>
              </tr>
            </tbody>
          </table>
        </CardContent></Card>
        <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">Also verified during this build, from the write side: the builder-level save API rejects invalid nodes (server-side validation), option-list updates work in place, but a field's <b>type</b> cannot be changed after creation (silently ignored — recreating <span className="font-mono">sale_outcome</span> was required, which changes the field id), and the default fields read hides opportunity fields unless <span className="font-mono">model=all</span> is requested.</div>
      </section>

      {/* Added */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Plus className="h-4 w-4 text-emerald-600" /> Added to the Opportunity ({data.added.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.added.map((f) => (
            <Card key={f.key}><CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{f.name}</span>
                <Badge tone="good">{f.dataType}</Badge>
              </div>
              <div className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{f.key}</div>
              {f.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">{f.options.map((o) => <Chip key={o} v={o} />)}</div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{f.reason}</p>
            </CardContent></Card>
          ))}
        </div>
      </section>

      {/* Recreated */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><RefreshCw className="h-4 w-4 text-amber-600" /> Recreated with a new type ({data.retyped.length})</h2>
        {data.retyped.map((f) => (
          <Card key={f.key}><CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{f.name}</span>
              <span className="break-all font-mono text-[11px] text-muted-foreground">{f.key}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="red">{f.before_type}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge tone="good">{f.after_type}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {f.before_options.map((o) => <Chip key={"b" + o} v={o} tone="old" />)}
              <ArrowRight className="mx-1 h-3.5 w-3.5 text-muted-foreground" />
              {f.after_options.map((o) => <Chip key={"a" + o} v={o} tone="new" />)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">A multi-select outcome cannot drive clean if/else routing — an outcome is exactly one of four codes. {f.note} The legacy <span className="font-mono text-xs">A&amp;D</span> code is retired: <span className="font-mono text-xs">nosale</span> avoids the "ad" collision with advertising terminology.</p>
          </CardContent></Card>
        ))}
      </section>

      {/* Options normalized */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ListChecks className="h-4 w-4 text-sky-600" /> Option lists normalized to codes ({data.options_changed.length})</h2>
        <p className="mb-2 max-w-3xl text-sm text-muted-foreground">Enums store codes, not prose: if/else conditions test stable lowercase values, and display wording can change without breaking automations. The no-sale reasons align to the locked five-objection taxonomy (cost / fear / partner / timing / decision).</p>
        <div className="space-y-2">
          {data.options_changed.map((f) => (
            <Card key={f.key}><CardContent className="flex flex-wrap items-center gap-2 p-3">
              <div className="w-56 shrink-0">
                <div className="text-sm font-medium">{f.name}</div>
                <div className="break-all font-mono text-[10px] text-muted-foreground">{f.key}</div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {f.before_options.map((o) => <Chip key={"b" + o} v={o} tone="old" />)}
                <ArrowRight className="mx-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {f.after_options.map((o) => <Chip key={"a" + o} v={o} tone="new" />)}
              </div>
            </CardContent></Card>
          ))}
        </div>
      </section>

      {/* Deprecated */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Archive className="h-4 w-4 text-violet-600" /> Contact fields parked as deprecated ({data.deprecated.length})</h2>
        <p className="mb-2 max-w-3xl text-sm text-muted-foreground">Moved to the folder <span className="font-mono text-xs">zz Deprecated - moved to Opportunity</span>. Ids and form mappings are untouched, so the existing PCC form keeps working during transition — the disposition routers copy their values onto the opportunity at stamp time. Once the form writes opportunity fields directly, these can be retired.</p>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Contact field</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Data now owned by</th>
            </tr></thead>
            <tbody>
              {data.deprecated.map((f) => (
                <tr key={f.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5"><div>{f.name}</div><div className="break-all font-mono text-[10px] text-muted-foreground">{f.key}</div></td>
                  <td className="px-3 py-1.5 text-xs">{f.dataType}</td>
                  <td className="break-all px-3 py-1.5 font-mono text-xs text-emerald-700 dark:text-emerald-400">{f.superseded_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
        <b className="text-foreground">Known follow-ups:</b> <span className="font-mono text-xs">opportunity.sale_type</span> and <span className="font-mono text-xs">opportunity.product_sold_1</span> cannot be merge-copied from their contact counterparts (prose options vs codes) — the PCC form should write these opportunity fields directly. Monetary fields (<span className="font-mono text-xs">total_program_amount</span>, prices, <span className="font-mono text-xs">money_down</span>) cannot be written via merge tags at all (GHL limitation), so the form is their sole writer.
      </div>
    </PageShell>
  );
}
