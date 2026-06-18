import { useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent } from "../components/ui";
import { ClipboardCheck, Banknote, X, Info, FolderOpen, Plus } from "lucide-react";

const sel = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const auto = "mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm";
const lbl = "text-xs text-muted-foreground";
const hint = "mt-1 font-mono text-[11px] text-muted-foreground";

function Help({ children }: { children: React.ReactNode }) { return <div className={hint}>{children}</div>; }

export default function SalesForm() {
  const [outcome, setOutcome] = useState("sold");
  const sold = outcome === "sold";

  return (
    <PageShell
      title="PCC sales form"
      subtitle="Mockup for team review — how a Patient Care Consultant will disposition a deal on the opportunity (not the contact). Change the Sale outcome to see each path."
    >
      <Card className="mb-4 border-l-4 border-l-sky-500">
        <CardContent className="p-4 text-sm text-foreground/90">
          <b>What changes for you:</b> after every consult, you record the result <b>here, on the opportunity</b> — pick the outcome, enter the money, save. That's what finally makes revenue and marketing attribution accurate. This is a concept mockup; sample data is fake.
        </CardContent>
      </Card>

      <Card className="mb-4 border-l-4 border-l-emerald-500">
        <CardContent className="p-4 text-sm text-foreground/90">
          <b>Won't overwrite prior records.</b> Each consultation opens its own opportunity. If a patient adds a service, renews, or returns, a <b>new opportunity is created</b> — the prior one stays exactly as it was. Revenue and attribution are permanently tied to the deal that generated them, not to the person.
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/40 p-3 sm:p-4">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <FolderOpen className="h-4 w-4" />
              <span className="font-medium">PCC Sales Data</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Patient Care Consultant</span>
              <span className="ms-auto rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Opportunity tab · GHL</span>
            </div>

            <div className="p-4">
              {/* Disposition */}
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-destructive"><ClipboardCheck className="h-3.5 w-3.5" /> Disposition — fill this first</div>
              <div className="max-w-xs">
                <label className={lbl}>Sale outcome <span className="text-destructive">*</span></label>
                <select className={sel} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="sold">Sold</option>
                  <option value="ad">A&D (Advised and Declined)</option>
                  <option value="mut">MUT (Medically Untreatable)</option>
                  <option value="mar">MAR (Medical Approval Required)</option>
                </select>
                <Help>dropdown · Sold / A&D / MUT / MAR</Help>
              </div>

              {sold ? (
                <div className="mt-3 border-l-4 border-l-emerald-500 pl-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Banknote className="h-3.5 w-3.5" /> The sale</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                    <div><label className={lbl}>Product sold 1</label><select className={sel}><option>TRT</option><option>HRT</option><option>GLP1</option><option>Combo</option><option>ICP</option><option>ED</option><option>B Complex</option></select></div>
                    <div><label className={lbl}>Term 1</label><select className={sel}><option>1 mo</option><option>3 mo</option><option>6 mo</option><option>12 mo</option><option>24 mo</option><option>30 mo</option><option>36 mo</option><option>42 mo</option></select></div>
                    <div><label className={lbl}>Price 1</label><input className={sel} placeholder="$" /></div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground"><Plus className="h-3 w-3" /> add product 2 (TRT / HRT / GLP1 / Combo / ICP / ED / B Complex)</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={lbl}>Total program amount</label><input className={`${sel} border-sky-400`} placeholder="$" /><div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">money · sets the deal's Value — revenue shows per deal</div></div>
                    <div><label className={lbl}>Money down</label><input className={sel} placeholder="$" /><Help>money · collected at signing</Help></div>
                    <div><label className={lbl}>Pay type</label><select className={sel}><option>PIF</option><option>SF</option><option>CARE</option><option>MAG</option><option>Cash</option><option>Credit card</option></select><Help>dropdown · PIF / SF / CARE / MAG / Cash / Card</Help></div>
                    <div><label className={lbl}>Provider</label><select className={sel}><option>Dr. Marcus Hale</option><option>Dr. Priya Shah</option><option>NP Dana Cole</option><option>Dr. Evan Brooks</option></select><Help>dropdown · placeholder names</Help></div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 border-l-4 border-l-border pl-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><X className="h-3.5 w-3.5" /> A&D reason</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={lbl}>A&D reason</label><select className={sel}><option>Not Ready</option><option>Think it Over / Sleep On It</option><option>Cost / Price Objection</option><option>Not Interested</option><option>Not Qualified / MU</option><option>Others</option></select><Help>dropdown · your live options</Help></div>
                    <div><label className={lbl}>A&D notes</label><input className={sel} placeholder="objection detail…" /><Help>long text</Help></div>
                  </div>
                </div>
              )}

              <div className="my-4 h-px bg-border" />

              {/* Deal context */}
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Info className="h-3.5 w-3.5" /> Deal context</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className={lbl}>Stage</label>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">pending discussion</span>
                  </div>
                  <select className={sel}><option>Showed</option><option>No-Show</option><option>Booked</option><option>Confirmed</option><option>Won</option><option>Lost</option></select>
                  <Help>discuss: auto-set from outcome vs. editable pipeline stage</Help>
                </div>
                <div><label className={lbl}>Lead source</label><div className={auto}>Google paid · demo campaign</div><div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">auto · carried from contact → ties win/loss to the campaign</div></div>
                <div><label className={lbl}>Location</label><div className={auto}>Virginia Beach</div><Help>auto · from pipeline</Help></div>
                <div><label className={lbl}>PCC (owner)</label><div className={auto}>Alex Rivera</div><Help>auto</Help></div>
                <div><label className={lbl}>Appointment</label><div className={auto}>Demo date · 11:00 AM</div><Help>auto · stamped at booking</Help></div>
                <div><label className={lbl}>Patient</label><div className={auto}>Sample Patient (demo)</div><Help>auto</Help></div>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t pt-3">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Update</button>
                <span className="text-xs text-muted-foreground">Sold → Won + Value · A&D → Lost + reason · MAR → stays open</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
