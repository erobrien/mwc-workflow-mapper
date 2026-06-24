import { useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent } from "../components/ui";
import { ClipboardCheck, Banknote, X, Info, FolderOpen, Plus, Users, TrendingUp } from "lucide-react";

const sel = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const auto = "mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm";
const lbl = "text-xs text-muted-foreground";
const hint = "mt-1 font-mono text-[11px] text-muted-foreground";

function Help({ children }: { children: React.ReactNode }) { return <div className={hint}>{children}</div>; }

export default function SalesForm() {
  const [outcome, setOutcome] = useState("sold");
  const [product1, setProduct1] = useState("TRT");
  const [term1, setTerm1] = useState("3 mo");
  const [price1, setPrice1] = useState("2999");
  const [totalAmount, setTotalAmount] = useState("2999");
  const [moneyDown, setMoneyDown] = useState("500");
  const [payType, setPayType] = useState("PIF");
  const [provider, setProvider] = useState("Dr. Marcus Hale");
  const [referredBy, setReferredBy] = useState("");
  const [adReason, setAdReason] = useState("Not Ready");
  const [adNotes, setAdNotes] = useState("");
  const [stage, setStage] = useState("Showed");
  const sold = outcome === "sold";
  const discountAmount = totalAmount ? Math.round(parseFloat(totalAmount) * 0.1 * 100) / 100 : 0;
  const discountedTotal = totalAmount ? parseFloat(totalAmount) - discountAmount : 0;

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
                    <div><label className={lbl}>Product sold 1</label><select className={sel} value={product1} onChange={(e) => setProduct1(e.target.value)}><option>TRT</option><option>HRT</option><option>GLP1</option><option>Combo</option><option>ICP</option><option>ED</option><option>B Complex</option></select></div>
                    <div><label className={lbl}>Term 1</label><select className={sel} value={term1} onChange={(e) => setTerm1(e.target.value)}><option>1 mo</option><option>3 mo</option><option>6 mo</option><option>12 mo</option><option>24 mo</option><option>30 mo</option><option>36 mo</option><option>42 mo</option></select></div>
                    <div><label className={lbl}>Price 1</label><input className={sel} placeholder="$" value={price1} onChange={(e) => setPrice1(e.target.value)} /></div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground"><Plus className="h-3 w-3" /> add product 2 (TRT / HRT / GLP1 / Combo / ICP / ED / B Complex)</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={lbl}>Total program amount</label><input className={`${sel} border-sky-400`} placeholder="$" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /><div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">money · sets the deal's Value — revenue shows per deal</div></div>
                    <div><label className={lbl}>Money down</label><input className={sel} placeholder="$" value={moneyDown} onChange={(e) => setMoneyDown(e.target.value)} /><Help>money · collected at signing</Help></div>
                    <div><label className={lbl}>Pay type</label><select className={sel} value={payType} onChange={(e) => setPayType(e.target.value)}><option>PIF</option><option>SF</option><option>CARE</option><option>MAG</option><option>Cash</option><option>Credit card</option></select><Help>dropdown · PIF / SF / CARE / MAG / Cash / Card</Help></div>
                    <div><label className={lbl}>Provider</label><select className={sel} value={provider} onChange={(e) => setProvider(e.target.value)}><option>Dr. Marcus Hale</option><option>Dr. Priya Shah</option><option>NP Dana Cole</option><option>Dr. Evan Brooks</option></select><Help>dropdown · placeholder names</Help></div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 border-l-4 border-l-border pl-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><X className="h-3.5 w-3.5" /> A&D reason</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={lbl}>A&D reason</label><select className={sel} value={adReason} onChange={(e) => setAdReason(e.target.value)}><option>Not Ready</option><option>Think it Over / Sleep On It</option><option>Cost / Price Objection</option><option>Not Interested</option><option>Not Qualified / MU</option><option>Others</option></select><Help>dropdown · your live options</Help></div>
                    <div><label className={lbl}>A&D notes</label><input className={sel} placeholder="objection detail…" value={adNotes} onChange={(e) => setAdNotes(e.target.value)} /><Help>long text</Help></div>
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
                  <select className={sel} value={stage} onChange={(e) => setStage(e.target.value)}><option>Showed</option><option>No-Show</option><option>Booked</option><option>Confirmed</option><option>Won</option><option>Lost</option></select>
                  <Help>discuss: auto-set from outcome vs. editable pipeline stage</Help>
                </div>
                <div><label className={lbl}>Lead source</label><div className={auto}>Google paid · demo campaign</div><div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">auto · carried from contact → ties win/loss to the campaign</div></div>
                <div><label className={lbl}>Location</label><div className={auto}>Virginia Beach</div><Help>auto · from pipeline</Help></div>
                <div><label className={lbl}>PCC (owner)</label><div className={auto}>Alex Rivera</div><Help>auto</Help></div>
                <div><label className={lbl}>Appointment</label><div className={auto}>Demo date · 11:00 AM</div><Help>auto · stamped at booking</Help></div>
                <div><label className={lbl}>Patient</label><div className={auto}>Sample Patient (demo)</div><Help>auto</Help></div>
              </div>

              {sold && (
                <>
                  <div className="my-4 h-px bg-border" />
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Users className="h-3.5 w-3.5" /> Referral program (optional)</div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={lbl}>Referred by (existing member)</label>
                        <input className={sel} placeholder="member name or ID…" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
                        <Help>lookup · auto-triggers reward workflow for the referrer</Help>
                      </div>
                      {referredBy && (
                        <>
                          <div>
                            <label className={lbl}>New member discount (10%)</label>
                            <div className={`${auto} border-emerald-300 font-medium text-emerald-700 dark:text-emerald-400`}>
                              -${discountAmount.toFixed(2)}
                            </div>
                            <Help>auto · 10% off the program amount</Help>
                          </div>
                          <div>
                            <label className={lbl}>New member total after discount</label>
                            <div className={`${auto} border-emerald-300 font-medium text-emerald-700 dark:text-emerald-400`}>
                              ${discountedTotal.toFixed(2)}
                            </div>
                            <Help>money · what the new member pays</Help>
                          </div>
                          <div>
                            <label className={lbl}>Referrer reward</label>
                            <div className={`${auto} border-emerald-300 font-medium text-emerald-700 dark:text-emerald-400`}>
                              +3 months free service
                            </div>
                            <Help>auto · added to the referrer's subscription</Help>
                          </div>
                        </>
                      )}
                      {!referredBy && <div className="text-xs text-muted-foreground italic">Leave blank if this sale is not a referral</div>}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-4 flex items-center gap-3 border-t pt-3">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Update</button>
                <span className="text-xs text-muted-foreground">Sold → Won + Value · A&D → Lost + reason · MAR → stays open{referredBy && " · Referral → auto-apply discount & reward"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
