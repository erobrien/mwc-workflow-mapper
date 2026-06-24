import { useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent } from "../components/ui";
import { ClipboardCheck, Banknote, X, FolderOpen, Plus, Trash2 } from "lucide-react";

const sel = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const auto = "mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm";
const lbl = "text-xs text-muted-foreground";
const hint = "mt-1 font-mono text-[11px] text-muted-foreground";

const PRODUCTS = ["TRT", "HRT", "GLP1", "Combo", "ICP", "ED", "B Complex"];
const TERMS = ["1 mo", "3 mo", "6 mo", "12 mo", "24 mo", "30 mo", "36 mo", "42 mo"];

type Product = { name: string; term: string; price: string };
const emptyProduct = (): Product => ({ name: "TRT", term: "3 mo", price: "" });

function Help({ children }: { children: React.ReactNode }) { return <div className={hint}>{children}</div>; }

export default function SalesForm() {
  const [outcome, setOutcome] = useState("sold");
  const [products, setProducts] = useState<Product[]>([{ name: "TRT", term: "3 mo", price: "2999" }]);
  const [totalAmount, setTotalAmount] = useState("2999");
  const [moneyDown, setMoneyDown] = useState("500");
  const [payType, setPayType] = useState("PIF");
  const [provider, setProvider] = useState("Dr. Marcus Hale");
  const [referredBy, setReferredBy] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"pct" | "dollar">("pct");
  const [adReason, setAdReason] = useState("Not Ready");
  const [adNotes, setAdNotes] = useState("");
  const sold = outcome === "sold";

  function updateProduct(i: number, field: keyof Product, val: string) {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }
  function addProduct() { if (products.length < 3) setProducts(prev => [...prev, emptyProduct()]); }
  function removeProduct(i: number) { setProducts(prev => prev.filter((_, idx) => idx !== i)); }

  const total = parseFloat(totalAmount) || 0;
  const dv = parseFloat(discountValue) || 0;
  const discountDollar = discountValue
    ? discountType === "pct" ? Math.round(total * (dv / 100) * 100) / 100 : dv
    : 0;
  const referralDiscount = referredBy && total ? Math.round(total * 0.1 * 100) / 100 : 0;
  const netTotal = total - discountDollar - referralDiscount;

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
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Banknote className="h-3.5 w-3.5" /> The sale</div>

                  {/* Products */}
                  <div className="space-y-2">
                    {products.map((p, i) => (
                      <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
                        <div>
                          {i === 0 && <label className={lbl}>Product sold <span className="text-destructive">*</span></label>}
                          <select className={sel} value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)}>
                            {PRODUCTS.map(pr => <option key={pr}>{pr}</option>)}
                          </select>
                        </div>
                        <div>
                          {i === 0 && <label className={lbl}>Term <span className="text-destructive">*</span></label>}
                          <select className={sel} value={p.term} onChange={(e) => updateProduct(i, "term", e.target.value)}>
                            {TERMS.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          {i === 0 && <label className={lbl}>Price <span className="text-destructive">*</span></label>}
                          <input className={sel} placeholder="$" value={p.price} onChange={(e) => updateProduct(i, "price", e.target.value)} />
                        </div>
                        <div className={i === 0 ? "pt-5" : ""}>
                          {i > 0 ? (
                            <button type="button" onClick={() => removeProduct(i)}
                              className="mt-1 flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:border-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : <div className="h-9 w-9" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {products.length < 3 && (
                    <button type="button" onClick={addProduct}
                      className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                      <Plus className="h-3 w-3" /> Add product {products.length + 1}
                    </button>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={lbl}>Total program amount <span className="text-destructive">*</span></label><input className={`${sel} border-sky-400`} placeholder="$" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /><div className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">money · sets the deal's Value — revenue shows per deal</div></div>
                    <div><label className={lbl}>Money down <span className="text-destructive">*</span></label><input className={sel} placeholder="$" value={moneyDown} onChange={(e) => setMoneyDown(e.target.value)} /><Help>money · collected at signing</Help></div>
                    <div><label className={lbl}>Pay type <span className="text-destructive">*</span></label><select className={sel} value={payType} onChange={(e) => setPayType(e.target.value)}><option>PIF</option><option>SF</option><option>CARE</option><option>MAG</option><option>Cash</option><option>Credit card</option></select><Help>dropdown · PIF / SF / CARE / MAG / Cash / Card</Help></div>
                    <div><label className={lbl}>Provider <span className="text-destructive">*</span></label><select className={sel} value={provider} onChange={(e) => setProvider(e.target.value)}><option>Dr. Marcus Hale</option><option>Dr. Priya Shah</option><option>NP Dana Cole</option><option>Dr. Evan Brooks</option></select><Help>dropdown · placeholder names</Help></div>

                    <div className="sm:col-span-2">
                      <label className={lbl}>Discount <span className="text-[10px] text-muted-foreground">(optional)</span></label>
                      <div className="mt-1 flex gap-2">
                        <div className="flex items-center rounded-md border bg-background">
                          <button type="button" onClick={() => setDiscountType("pct")}
                            className={`rounded-l-md px-3 py-2 text-sm font-medium transition-colors ${discountType === "pct" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>%</button>
                          <button type="button" onClick={() => setDiscountType("dollar")}
                            className={`rounded-r-md px-3 py-2 text-sm font-medium transition-colors ${discountType === "dollar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>$</button>
                        </div>
                        <input className={`${sel} mt-0 max-w-[160px]`}
                          placeholder={discountType === "pct" ? "e.g. 10" : "e.g. 300"}
                          value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                        {discountDollar > 0 && (
                          <div className="flex items-center text-sm font-medium text-emerald-700 dark:text-emerald-400">= −${discountDollar.toFixed(2)}</div>
                        )}
                      </div>
                      <Help>custom field · op_discount_value + op_discount_type</Help>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={lbl}>Referred by <span className="text-[10px] text-muted-foreground">(optional — existing member)</span></label>
                      <input className={sel} placeholder="member name or ID…" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
                      <Help>lookup · leave blank if not a referral · auto-triggers reward workflow for the referrer</Help>
                    </div>

                    {referredBy && (
                      <>
                        <div>
                          <label className={lbl}>Referral discount (10%)</label>
                          <div className={`${auto} font-medium text-emerald-700 dark:text-emerald-400`}>−${referralDiscount.toFixed(2)}</div>
                          <Help>auto · 10% off total program amount</Help>
                        </div>
                        <div>
                          <label className={lbl}>Net total{discountDollar > 0 ? " (referral + discount)" : " after referral"}</label>
                          <div className={`${auto} font-medium text-emerald-700 dark:text-emerald-400`}>${netTotal.toFixed(2)}</div>
                          <Help>money · what the new member pays</Help>
                        </div>
                        <div>
                          <label className={lbl}>Referrer reward</label>
                          <div className={`${auto} font-medium text-emerald-700 dark:text-emerald-400`}>+3 months free service</div>
                          <Help>auto · added to the referrer's subscription</Help>
                        </div>
                      </>
                    )}
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
