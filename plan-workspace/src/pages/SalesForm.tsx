import { useState, useEffect } from "react";
import { PageShell } from "../components/Shell";
import { Card } from "../components/ui";
import {
  Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Clock,
  UserCheck, UserX, CalendarX, CalendarClock,
  Users, Package, Calculator, Gift, FileText, CalendarDays, RefreshCw,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const inp  = "w-full rounded-lg border border-gray-400 dark:border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-ring transition-colors";
const lbl  = "block text-xs font-semibold text-muted-foreground mb-1.5";
const mono = "mt-1 text-[11px] font-mono text-muted-foreground/70";
const req  = <span className="text-destructive ml-0.5">*</span>;

// ── Data ──────────────────────────────────────────────────────────────────────
const PCCS      = ["Alex Rivera", "Jamie Chen", "Morgan Lee", "Sam Taylor", "Taylor Brooks"];
const PROVIDERS = ["Dr. Marcus Hale", "Dr. Priya Shah", "NP Dana Cole", "Dr. Evan Brooks"];
const PRODUCTS  = ["TRT", "HRT", "GLP1", "Combo", "ICP", "ED", "B Complex"];
const TERMS     = ["1 mo", "3 mo", "6 mo", "12 mo", "24 mo", "30 mo", "36 mo", "42 mo"];

type Product = { name: string; term: string; price: string };

// Active colors per option — each carries its own brand so the form reads as a real status selector
const APPT_OPTS = [
  { value: "showed",     label: "Showed",     icon: UserCheck,    ring: "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900" },
  { value: "no-show",    label: "No-Show",    icon: UserX,        ring: "bg-rose-600 shadow-rose-200 dark:shadow-rose-900" },
  { value: "cancel",     label: "Cancel",     icon: CalendarX,    ring: "bg-slate-600 shadow-slate-200 dark:shadow-slate-800" },
  { value: "reschedule", label: "Reschedule", icon: CalendarClock,ring: "bg-sky-600 shadow-sky-200 dark:shadow-sky-900" },
];

const OUTCOME_OPTS = [
  { value: "sold", label: "Sold",  icon: CheckCircle2, ring: "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900" },
  { value: "ad",   label: "A&D",   icon: XCircle,      ring: "bg-slate-600 shadow-slate-200 dark:shadow-slate-800" },
  { value: "mut",  label: "MUT",   icon: AlertCircle,  ring: "bg-slate-600 shadow-slate-200 dark:shadow-slate-800" },
  { value: "mar",  label: "MAR",   icon: Clock,        ring: "bg-amber-500 shadow-amber-200 dark:shadow-amber-900" },
];

// ── Primitives ─────────────────────────────────────────────────────────────────

function SegCtrl({ opts, value, onChange }: {
  opts: { value: string; label: string; icon: React.ElementType; ring: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {opts.map(({ value: v, label, icon: Icon, ring }) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all
            ${value === v
              ? `${ring} text-white border-transparent shadow-md`
              : "bg-card border-gray-400 dark:border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-gray-500 dark:hover:border-border/80"}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

// Section panel — gray header strip + content area
function Panel({ icon: Icon, label, iconClass = "text-muted-foreground", children }: {
  icon: React.ElementType;
  label: string;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t first:border-t-0">
      <div className="flex items-center gap-2 px-5 py-2.5 bg-muted/30 border-b">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className={mono}>{children}</p>;
}

// Receipt row — used inside the financial summary box
function ReceiptRow({ label, value, sub, bold, accent }: {
  label: string; value: string; sub?: string; bold?: boolean; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {label}
        {sub && <span className="ml-1 text-xs text-muted-foreground/60">{sub}</span>}
      </span>
      <span className={`tabular-nums text-sm ${bold ? "font-bold text-foreground" : ""} ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SalesForm() {
  const [apptStatus,    setApptStatus]   = useState("showed");
  const [pcc,           setPcc]          = useState("Alex Rivera");
  const [provider,      setProvider]     = useState("Dr. Marcus Hale");
  const [outcome,       setOutcome]      = useState("sold");
  const [adReason,      setAdReason]     = useState("Not Ready");
  const [products,      setProducts]     = useState<Product[]>([{ name: "TRT", term: "3 mo", price: "2999" }]);
  const [totalAmount,   setTotalAmount]  = useState("2999");
  const [totalManual,   setTotalManual]  = useState(false);
  const [discountValue, setDiscountValue]= useState("");
  const [discountType,  setDiscountType] = useState<"pct" | "dollar">("pct");
  const [moneyDown,     setMoneyDown]    = useState("500");
  const [payType,       setPayType]      = useState("PIF");
  const [referredBy,    setReferredBy]   = useState("");
  const [notes,         setNotes]        = useState("");
  const [noShowReason,  setNoShowReason] = useState("No call, no show");

  const showed = apptStatus === "showed";
  const sold   = outcome === "sold";

  // Financials
  const subtotal = products.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
  const dv = parseFloat(discountValue) || 0;
  const discountDollar = discountValue
    ? discountType === "pct" ? Math.round(subtotal * (dv / 100) * 100) / 100 : dv
    : 0;
  const autoTotal = subtotal - discountDollar;

  useEffect(() => {
    if (!totalManual) setTotalAmount(autoTotal > 0 ? autoTotal.toFixed(2) : "");
  }, [autoTotal, totalManual]);

  const total    = parseFloat(totalAmount) || 0;
  const refDisc  = referredBy && total ? Math.round(total * 0.1 * 100) / 100 : 0;
  const netTotal = total - refDisc;
  const balance  = total - (parseFloat(moneyDown) || 0);
  const showSubtotal = products.length > 1 || discountDollar > 0;

  function updateProduct(i: number, field: keyof Product, val: string) {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
    setTotalManual(false);
  }
  function addProduct()    { if (products.length < 3) setProducts(p => [...p, { name: "TRT", term: "3 mo", price: "" }]); }
  function removeProduct(i: number) { setProducts(p => p.filter((_, idx) => idx !== i)); setTotalManual(false); }

  const outcomeLabel = {
    sold: "→ Won", ad: "→ Lost", mut: "→ Lost", mar: "stays open"
  }[outcome];

  const saveHint = !showed
    ? (apptStatus === "reschedule" ? "stays open" : "→ Lost")
    : outcomeLabel;

  return (
    <PageShell
      title="PCC sales form"
      subtitle="Mockup for team review — disposition a deal on the opportunity after every consultation."
    >
      <Card className="overflow-hidden">

        {/* ── Card header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-card">
          <div>
            <p className="font-semibold text-sm text-foreground">Consultation Record</p>
            <p className="text-xs text-muted-foreground mt-0.5">GHL · Opportunity · PCC Sales Data</p>
          </div>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Mockup
          </span>
        </div>

        {/* ══ PANEL 1 · APPOINTMENT ══════════════════════════════════════════ */}
        <Panel icon={CalendarDays} label="Appointment">
          <div>
            <label className={lbl}>Status {req}</label>
            <SegCtrl opts={APPT_OPTS} value={apptStatus} onChange={setApptStatus} />
            <Hint>op_appt_status</Hint>
          </div>
        </Panel>

        {/* ══ Showed path ════════════════════════════════════════════════════ */}
        {showed && <>

          {/* ── PANEL 2 · CONSULTATION ── */}
          <Panel icon={Users} label="Consultation">
            <Row>
              <div>
                <label className={lbl}>PCC {req}</label>
                <select className={inp} value={pcc} onChange={e => setPcc(e.target.value)}>
                  {PCCS.map(n => <option key={n}>{n}</option>)}
                </select>
                <Hint>op_pcc · placeholder names</Hint>
              </div>
              <div>
                <label className={lbl}>Provider {req}</label>
                <select className={inp} value={provider} onChange={e => setProvider(e.target.value)}>
                  {PROVIDERS.map(n => <option key={n}>{n}</option>)}
                </select>
                <Hint>op_provider · placeholder names</Hint>
              </div>
            </Row>
          </Panel>

          {/* ── PANEL 3 · OUTCOME ── */}
          <Panel icon={CheckCircle2} label="Sale outcome" iconClass="text-emerald-600">
            <div>
              <label className={lbl}>Result {req}</label>
              <SegCtrl opts={OUTCOME_OPTS} value={outcome} onChange={setOutcome} />
              {outcome !== "sold" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {outcome === "ad"  && "Advised and Declined"}
                  {outcome === "mut" && "Medically Untreatable"}
                  {outcome === "mar" && "Medical Approval Required"}
                </p>
              )}
              <Hint>op_sale_outcome</Hint>
            </div>

            {/* A&D / MUT / MAR reason */}
            {!sold && (
              <div className="max-w-sm pt-1">
                <label className={lbl}>
                  {outcome === "ad" ? "A&D reason" : outcome === "mut" ? "MUT reason" : "MAR reason"} {req}
                </label>
                <select className={inp} value={adReason} onChange={e => setAdReason(e.target.value)}>
                  <option>Not Ready</option>
                  <option>Think it Over / Sleep On It</option>
                  <option>Cost / Price Objection</option>
                  <option>Not Interested</option>
                  <option>Not Qualified / MU</option>
                  <option>Others</option>
                </select>
              </div>
            )}
          </Panel>

          {/* ── PANEL 4 · PROGRAM (sold only) ── */}
          {sold && (
            <Panel icon={Package} label="Program" iconClass="text-emerald-600">
              {/* Column headers — desktop only */}
              <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_2.5rem] gap-3 text-xs font-semibold text-muted-foreground px-0.5">
                <span>Product {req}</span>
                <span>Term {req}</span>
                <span>Price {req}</span>
                <span />
              </div>

              <div className="space-y-3">
                {products.map((p, i) => (
                  <div key={i} className="flex flex-col gap-3 sm:grid sm:grid-cols-[2fr_1fr_1fr_2.5rem] sm:items-center">
                    {/* Product */}
                    <div>
                      {i === 0 && <label className={`${lbl} sm:hidden`}>Product {req}</label>}
                      <select className={inp} value={p.name} onChange={e => updateProduct(i, "name", e.target.value)}>
                        {PRODUCTS.map(pr => <option key={pr}>{pr}</option>)}
                      </select>
                    </div>

                    {/* Term + Price — 2-col on mobile */}
                    <div className="grid grid-cols-2 gap-3 sm:contents">
                      <div>
                        {i === 0 && <label className={`${lbl} sm:hidden`}>Term {req}</label>}
                        <select className={inp} value={p.term} onChange={e => updateProduct(i, "term", e.target.value)}>
                          {TERMS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        {i === 0 && <label className={`${lbl} sm:hidden`}>Price {req}</label>}
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">$</span>
                          <input className={`${inp} pl-6`} placeholder="0.00" inputMode="numeric"
                            value={p.price} onChange={e => updateProduct(i, "price", e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Remove */}
                    {i > 0
                      ? <button type="button" onClick={() => removeProduct(i)}
                          className="cursor-pointer self-end sm:self-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      : <div className="hidden sm:block" />
                    }
                  </div>
                ))}

                {products.length < 3 && (
                  <button type="button" onClick={addProduct}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-dashed hover:border-solid hover:bg-muted/40 transition-all">
                    <Plus className="h-3.5 w-3.5" /> Add product {products.length + 1}
                  </button>
                )}
              </div>
            </Panel>
          )}

          {/* ── PANEL 5 · FINANCIALS (sold only) ── */}
          {sold && (
            <Panel icon={Calculator} label="Financials" iconClass="text-sky-600">

              {/* Discount + Pay type side by side */}
              <Row>
                <div>
                  <label className={lbl}>Discount <span className="font-normal text-muted-foreground/60">(optional)</span></label>
                  <div className="flex gap-2">
                    {/* % / $ toggle */}
                    <div className="flex rounded-lg border border-gray-400 dark:border-border bg-background overflow-hidden shrink-0 h-[42px]">
                      {(["pct", "dollar"] as const).map((t, idx) => (
                        <button key={t} type="button" onClick={() => setDiscountType(t)}
                          className={`cursor-pointer px-3.5 text-sm font-bold transition-colors ${idx > 0 ? "border-l border-l-gray-400 dark:border-l-border" : ""} ${discountType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                          {t === "pct" ? "%" : "$"}
                        </button>
                      ))}
                    </div>
                    <input className={inp} placeholder={discountType === "pct" ? "0" : "0.00"}
                      inputMode="numeric" value={discountValue}
                      onChange={e => { setDiscountValue(e.target.value); setTotalManual(false); }} />
                  </div>
                  <Hint>op_discount_value · op_discount_type</Hint>
                </div>

                <div>
                  <label className={lbl}>Pay type {req}</label>
                  <select className={inp} value={payType} onChange={e => setPayType(e.target.value)}>
                    <option>PIF</option><option>SF</option><option>CARE</option><option>MAG</option><option>Cash</option><option>Credit card</option>
                  </select>
                  <Hint>op_pay_type</Hint>
                </div>
              </Row>

              {/* Financial receipt */}
              <div className="rounded-xl border border-gray-400 dark:border-border overflow-hidden divide-y divide-gray-400 dark:divide-border">
                {showSubtotal && (
                  <ReceiptRow
                    label="Subtotal"
                    sub={`(${products.length} product${products.length > 1 ? "s" : ""})`}
                    value={`$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  />
                )}
                {discountDollar > 0 && (
                  <ReceiptRow
                    label="Discount"
                    sub={discountType === "pct" ? `(${discountValue}%)` : undefined}
                    value={`− $${discountDollar.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    accent="text-rose-600 dark:text-rose-400"
                  />
                )}

                {/* Total — editable inline */}
                <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Program total {req}</p>
                    <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5">
                      sets deal Value · {totalManual ? "manual override" : "auto-calc"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalManual && (
                      <button type="button" onClick={() => setTotalManual(false)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors" title="Reset to auto">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
                      <input
                        className="w-32 rounded-lg border border-gray-400 dark:border-border bg-background pl-6 pr-2 py-2 text-sm font-bold tabular-nums text-right outline-none focus:ring-2 focus:ring-ring transition-colors"
                        inputMode="numeric" value={totalAmount}
                        onChange={e => { setTotalAmount(e.target.value); setTotalManual(true); }}
                      />
                    </div>
                  </div>
                </div>

                {/* Money down — editable inline */}
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-muted-foreground">Money down {req}</p>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
                    <input
                      className="w-28 rounded-lg border border-gray-400 dark:border-border bg-background pl-6 pr-2 py-2 text-sm tabular-nums text-right outline-none focus:ring-2 focus:ring-ring transition-colors"
                      inputMode="numeric" placeholder="0.00" value={moneyDown}
                      onChange={e => setMoneyDown(e.target.value)}
                    />
                  </div>
                </div>

                {/* Balance */}
                {total > 0 && (
                  <ReceiptRow
                    label="Remaining balance"
                    value={`$${Math.max(balance, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    bold
                  />
                )}
              </div>
            </Panel>
          )}

          {/* ── PANEL 6 · ATTRIBUTION (showed only) ── */}
          <Panel icon={Gift} label="Attribution">
            <div>
              <label className={lbl}>Referred by <span className="font-normal text-muted-foreground/60">(optional — existing member)</span></label>
              <input className={inp} placeholder="Member name or ID…" value={referredBy} onChange={e => setReferredBy(e.target.value)} />
              <Hint>op_referred_by · leave blank if not a referral · auto-triggers reward workflow</Hint>
            </div>

            {referredBy && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 overflow-hidden divide-y divide-emerald-100 dark:divide-emerald-900">
                <div className="grid grid-cols-3 divide-x divide-emerald-100 dark:divide-emerald-900">
                  {[
                    { label: "Their discount (10%)", value: `− $${refDisc.toFixed(2)}` },
                    { label: "New member pays",       value: `$${netTotal.toFixed(2)}` },
                    { label: "Referrer reward",        value: "+3 mo free" },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{label}</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* ── PANEL 7 · NOTES ── */}
          <Panel icon={FileText} label="Notes">
            <div>
              <label className={lbl}>Consultation notes <span className="font-normal text-muted-foreground/60">(optional)</span></label>
              <textarea className={`${inp} min-h-[100px] resize-y`}
                placeholder="Objections, patient concerns, next steps, anything relevant to this consult…"
                value={notes} onChange={e => setNotes(e.target.value)} />
              <Hint>op_consult_notes</Hint>
            </div>
          </Panel>
        </>}

        {/* ══ No-Show / Cancel / Reschedule path ════════════════════════════ */}
        {!showed && (
          <>
            <Panel
              icon={apptStatus === "no-show" ? UserX : apptStatus === "cancel" ? CalendarX : CalendarClock}
              label={apptStatus === "no-show" ? "No-Show Details" : apptStatus === "cancel" ? "Cancellation" : "Reschedule"}
              iconClass={apptStatus === "no-show" ? "text-rose-600" : apptStatus === "reschedule" ? "text-sky-600" : "text-muted-foreground"}
            >
              {apptStatus === "no-show" && (
                <div className="max-w-sm">
                  <label className={lbl}>Reason</label>
                  <select className={inp} value={noShowReason} onChange={e => setNoShowReason(e.target.value)}>
                    <option>No call, no show</option>
                    <option>Called to cancel, no reschedule</option>
                    <option>Left voicemail — no response</option>
                    <option>Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className={lbl}>Notes <span className="font-normal text-muted-foreground/60">(optional)</span></label>
                <textarea className={`${inp} min-h-[100px] resize-y`}
                  placeholder={
                    apptStatus === "no-show"    ? "Any context — tried to reach, left message, etc." :
                    apptStatus === "cancel"     ? "Why did they cancel? Follow-up plan?" :
                    "New date/time if known, reason for reschedule…"
                  }
                  value={notes} onChange={e => setNotes(e.target.value)} />
                <Hint>op_consult_notes</Hint>
              </div>
            </Panel>
          </>
        )}

        {/* ── Footer / Save ── */}
        <div className="border-t px-5 py-4 flex items-center gap-4 bg-muted/20">
          <button className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm">
            Update opportunity
          </button>
          <span className="text-xs text-muted-foreground">{saveHint}</span>
        </div>

      </Card>
    </PageShell>
  );
}
