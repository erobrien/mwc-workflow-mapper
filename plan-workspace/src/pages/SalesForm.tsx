import { useState, useEffect } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent } from "../components/ui";
import { ClipboardCheck, Banknote, X, FolderOpen, Plus, Trash2 } from "lucide-react";

const sel = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const auto = "rounded-md border bg-muted/40 px-3 py-2 text-sm";
const lbl = "block text-xs font-medium text-muted-foreground mb-1";
const hint = "mt-1 font-mono text-[11px] text-muted-foreground";
const req = <span className="text-destructive ml-0.5">*</span>;

const PRODUCTS = ["TRT", "HRT", "GLP1", "Combo", "ICP", "ED", "B Complex"];
const TERMS = ["1 mo", "3 mo", "6 mo", "12 mo", "24 mo", "30 mo", "36 mo", "42 mo"];

type Product = { name: string; term: string; price: string };

function Help({ children }: { children: React.ReactNode }) { return <p className={hint}>{children}</p>; }
function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      {label && <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>}
      <div className="h-px flex-1 bg-emerald-200/60 dark:bg-emerald-900/40" />
    </div>
  );
}

export default function SalesForm() {
  const [outcome, setOutcome] = useState("sold");
  const [products, setProducts] = useState<Product[]>([{ name: "TRT", term: "3 mo", price: "2999" }]);
  const [totalAmount, setTotalAmount] = useState("2999");
  const [totalManual, setTotalManual] = useState(false);
  const [moneyDown, setMoneyDown] = useState("500");
  const [payType, setPayType] = useState("PIF");
  const [provider, setProvider] = useState("Dr. Marcus Hale");
  const [referredBy, setReferredBy] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"pct" | "dollar">("pct");
  const [adReason, setAdReason] = useState("Not Ready");
  const [notes, setNotes] = useState("");
  const sold = outcome === "sold";

  // Auto-calculate total from product prices minus discount when not manually overridden
  const subtotal = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const dv = parseFloat(discountValue) || 0;
  const discountDollar = discountValue
    ? discountType === "pct" ? Math.round(subtotal * (dv / 100) * 100) / 100 : dv
    : 0;
  const autoTotal = subtotal - discountDollar;

  useEffect(() => {
    if (!totalManual) setTotalAmount(autoTotal > 0 ? autoTotal.toFixed(2) : "");
  }, [autoTotal, totalManual]);

  const total = parseFloat(totalAmount) || 0;
  const referralDiscount = referredBy && total ? Math.round(total * 0.1 * 100) / 100 : 0;
  const netTotal = total - referralDiscount;

  function updateProduct(i: number, field: keyof Product, val: string) {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
    setTotalManual(false);
  }
  function addProduct() { if (products.length < 3) setProducts(prev => [...prev, { name: "TRT", term: "3 mo", price: "" }]); }
  function removeProduct(i: number) { setProducts(prev => prev.filter((_, idx) => idx !== i)); setTotalManual(false); }

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

            <div className="p-4 space-y-4">

              {/* ── Outcome ── */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Disposition — fill this first
                </div>
                <div className="max-w-xs">
                  <label className={lbl}>Sale outcome {req}</label>
                  <select className={sel} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                    <option value="sold">Sold</option>
                    <option value="ad">A&D (Advised and Declined)</option>
                    <option value="mut">MUT (Medically Untreatable)</option>
                    <option value="mar">MAR (Medical Approval Required)</option>
                  </select>
                  <Help>dropdown · Sold / A&D / MUT / MAR</Help>
                </div>
              </div>

              {/* ── Sold path ── */}
              {sold && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                    <Banknote className="h-3.5 w-3.5" /> The sale
                  </div>

                  {/* 1 – Products */}
                  <Divider label="Products sold" />
                  <div className="space-y-2">
                    {/* Column headers */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_2rem] gap-2 px-0.5">
                      <span className={lbl.replace("mb-1","")}>Product {req}</span>
                      <span className={lbl.replace("mb-1","")}>Term {req}</span>
                      <span className={lbl.replace("mb-1","")}>Price {req}</span>
                      <span />
                    </div>
                    {products.map((p, i) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_2rem] gap-2 items-center">
                        <select className={sel} value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)}>
                          {PRODUCTS.map(pr => <option key={pr}>{pr}</option>)}
                        </select>
                        <select className={sel} value={p.term} onChange={(e) => updateProduct(i, "term", e.target.value)}>
                          {TERMS.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <input className={`${sel} pl-6`} placeholder="0" value={p.price} onChange={(e) => updateProduct(i, "price", e.target.value)} />
                        </div>
                        {i > 0
                          ? <button type="button" onClick={() => removeProduct(i)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          : <div />
                        }
                      </div>
                    ))}
                    {products.length < 3 && (
                      <button type="button" onClick={addProduct}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 px-1 py-0.5 rounded hover:bg-muted/60">
                        <Plus className="h-3 w-3" /> Add product {products.length + 1}
                      </button>
                    )}
                  </div>

                  {/* 2 – Financials */}
                  <Divider label="Financials" />
                  <div className="space-y-3">

                    {/* Subtotal row (shown when >1 product or discount entered) */}
                    {(products.length > 1 || discountDollar > 0) && (
                      <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <span className="text-muted-foreground text-xs">Subtotal ({products.length} product{products.length > 1 ? "s" : ""})</span>
                        <span className="font-medium">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Discount */}
                    <div>
                      <label className={lbl}>Discount <span className="text-[10px] font-normal text-muted-foreground">(optional)</span></label>
                      <div className="flex gap-2 items-center">
                        <div className="flex rounded-md border bg-background overflow-hidden shrink-0">
                          <button type="button" onClick={() => setDiscountType("pct")}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${discountType === "pct" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>%</button>
                          <button type="button" onClick={() => setDiscountType("dollar")}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${discountType === "dollar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>$</button>
                        </div>
                        <input className={`${sel} max-w-[120px]`}
                          placeholder={discountType === "pct" ? "e.g. 10" : "e.g. 300"}
                          value={discountValue} onChange={(e) => { setDiscountValue(e.target.value); setTotalManual(false); }} />
                        {discountDollar > 0 && (
                          <span className="text-sm font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            − ${discountDollar.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <Help>op_discount_value · op_discount_type</Help>
                    </div>

                    {/* Total — highlighted, auto-filled */}
                    <div className="rounded-md border-2 border-sky-400 bg-sky-50/40 dark:bg-sky-950/20 px-3 py-2.5">
                      <label className={lbl + " text-sky-700 dark:text-sky-400"}>Total program amount {req}</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <input
                            className="w-full rounded-md border bg-background pl-6 pr-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-400 text-sky-800 dark:text-sky-300"
                            value={totalAmount}
                            onChange={(e) => { setTotalAmount(e.target.value); setTotalManual(true); }}
                          />
                        </div>
                        {totalManual && (
                          <button type="button" onClick={() => setTotalManual(false)}
                            className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap">reset</button>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-sky-700 dark:text-sky-400">
                        sets the deal's Value · auto-calculates from prices{discountDollar > 0 ? " − discount" : ""} · override if needed
                      </p>
                    </div>

                    {/* Money down + Pay type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Money down {req}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <input className={`${sel} pl-6`} placeholder="0" value={moneyDown} onChange={(e) => setMoneyDown(e.target.value)} />
                        </div>
                        <Help>collected at signing</Help>
                      </div>
                      <div>
                        <label className={lbl}>Pay type {req}</label>
                        <select className={sel} value={payType} onChange={(e) => setPayType(e.target.value)}>
                          <option>PIF</option><option>SF</option><option>CARE</option><option>MAG</option><option>Cash</option><option>Credit card</option>
                        </select>
                        <Help>PIF / SF / CARE / MAG / Cash / Card</Help>
                      </div>
                    </div>
                  </div>

                  {/* 3 – Closing */}
                  <Divider label="Closing" />
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>Provider {req}</label>
                      <select className={sel} value={provider} onChange={(e) => setProvider(e.target.value)}>
                        <option>Dr. Marcus Hale</option><option>Dr. Priya Shah</option><option>NP Dana Cole</option><option>Dr. Evan Brooks</option>
                      </select>
                      <Help>dropdown · placeholder names</Help>
                    </div>

                    <div>
                      <label className={lbl}>Referred by <span className="text-[10px] font-normal">(optional — existing member)</span></label>
                      <input className={sel} placeholder="member name or ID…" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
                      <Help>lookup · leave blank if not a referral · auto-triggers reward workflow</Help>
                    </div>

                    {referredBy && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5">
                        <div>
                          <p className={lbl}>Referral discount (10%)</p>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">− ${referralDiscount.toFixed(2)}</p>
                          <Help>auto · 10% off total</Help>
                        </div>
                        <div>
                          <p className={lbl}>New member pays</p>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">${netTotal.toFixed(2)}</p>
                          <Help>after referral discount</Help>
                        </div>
                        <div>
                          <p className={lbl}>Referrer reward</p>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">+3 months free</p>
                          <Help>auto · added to subscription</Help>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={lbl}>Consultation notes <span className="text-[10px] font-normal">(optional)</span></label>
                      <textarea
                        className={`${sel} min-h-[80px] resize-y`}
                        placeholder="Anything relevant to this consult — objections, next steps, patient concerns…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <Help>long text · op_consult_notes</Help>
                    </div>
                  </div>
                </div>
              )}

              {/* ── A&D path ── */}
              {!sold && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <X className="h-3.5 w-3.5" /> Reason for not closing
                  </div>
                  <div className="max-w-xs">
                    <label className={lbl}>A&D reason</label>
                    <select className={sel} value={adReason} onChange={(e) => setAdReason(e.target.value)}>
                      <option>Not Ready</option><option>Think it Over / Sleep On It</option><option>Cost / Price Objection</option><option>Not Interested</option><option>Not Qualified / MU</option><option>Others</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Consultation notes <span className="text-[10px] font-normal">(optional)</span></label>
                    <textarea
                      className={`${sel} min-h-[80px] resize-y`}
                      placeholder="Anything relevant to this consult — objections, next steps, patient concerns…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <Help>long text · op_consult_notes</Help>
                  </div>
                </div>
              )}

              {/* ── Save ── */}
              <div className="flex items-center gap-3 border-t pt-3">
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Update opportunity</button>
                <span className="text-xs text-muted-foreground">
                  Sold → Won · A&D / MUT → Lost · MAR → stays open{referredBy && " · Referral → auto-apply reward"}
                </span>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
