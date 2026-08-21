import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { ArrowLeft, ShieldCheck, Ban, Webhook, Lock, Zap } from "lucide-react";

interface WriteRow { field: string; on: "opportunity" | "opportunity.line_item" | "contact"; purpose: string; gated_by?: string; }
interface NoWriteRow { field: string; owner: string; reason: string; }
interface FireRow { target: "WF-05"; when: ("SOLD" | "AD" | "MUT")[]; method: "POST"; url_env?: string; notes?: string; }
interface ForceContract {
  id: "force";
  name: string;
  job: string;
  role?: string;
  canonical_slugs?: string[];
  writes: WriteRow[];
  does_not_write: NoWriteRow[];
  enums: {
    sale_outcome: string[];
    sale_type: string[];
    appt_status: string[];
    pay_type: string[];
    sales_pipeline_stages: string[];
    ad_reason?: string[];
  };
  fires: FireRow[];
  native_ghl_rule: { statement: string; must_not: string[] };
  status?: { live_with_canonical_slugs?: boolean; publishes?: boolean; notes?: string };
  notes?: string[];
}

function toneForObject(on: WriteRow["on"]) {
  if (on === "contact") return "blue" as const;
  return "good" as const;
}

function shortObject(on: WriteRow["on"]) {
  if (on === "opportunity.line_item") return "Opp · line item";
  if (on === "opportunity") return "Opportunity";
  return "Contact";
}

function EnumChips({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} tone="good">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function ForcePage() {
  const [contract, setContract] = useState<ForceContract | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/force.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c: ForceContract) => setContract(c))
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  if (err) {
    return (
      <PageShell title="Force (consult writer)" subtitle="Failed to load /force.json">
        <Card><CardContent className="p-4 text-sm text-destructive">{err}</CardContent></Card>
      </PageShell>
    );
  }
  if (!contract) return <Loading />;

  const c = contract;
  const writesOnOpp = c.writes.filter((w) => w.on !== "contact");
  const writesOnContact = c.writes.filter((w) => w.on === "contact");

  return (
    <PageShell
      title={`Force · ${c.name}`}
      subtitle={c.job}
      actions={
        <Link to="/to-be" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" /> To-Be Workflows
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Role + native rule */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">Contract role</div>
              <Badge tone="accent" className="ms-auto">Drafts only · production read-only</Badge>
            </div>
            {c.role && <p className="text-sm leading-relaxed text-foreground/90">{c.role}</p>}
            <div className="rounded-sm border-l-4 border-primary bg-muted/40 p-3 text-sm">
              <div className="font-semibold">Native GHL rule</div>
              <p className="mt-1 text-foreground/90">{c.native_ghl_rule.statement}</p>
              <ul className="mt-2 grid list-disc gap-1 ps-5 text-foreground/85 sm:grid-cols-2">
                {c.native_ghl_rule.must_not.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
            {c.canonical_slugs && c.canonical_slugs.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Canonical clinic slugs (adopted when mwc-force / mwc-admin cut over):{" "}
                {c.canonical_slugs.map((s) => (
                  <code key={s} className="me-1 rounded bg-muted px-1 py-0.5 text-[11px]">{s}</code>
                ))}
                {c.status?.live_with_canonical_slugs === false && (
                  <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    not live with canonical slugs yet
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enums */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <div className="text-sm font-semibold">Enumerations Force writes</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <EnumChips label="sale_outcome" values={c.enums.sale_outcome} />
              <EnumChips label="sale_type" values={c.enums.sale_type} />
              <EnumChips label="appt_status" values={c.enums.appt_status} />
              <EnumChips label="pay_type" values={c.enums.pay_type} />
              <EnumChips label="Sales pipeline stages (Lead to Close)" values={c.enums.sales_pipeline_stages} />
              {c.enums.ad_reason && <EnumChips label="ad_reason (when AD)" values={c.enums.ad_reason} />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Workflows never move stages. Force is the sole stage-mover on Sales Lead to Close. MAR never fires WF-05.
            </p>
          </CardContent>
        </Card>

        {/* Writes */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div className="text-sm font-semibold">Force writes ({c.writes.length})</div>
              <span className="ms-auto text-[11px] text-muted-foreground">Sole writer on each field</span>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">On the Opportunity ({writesOnOpp.length})</div>
              <div className="grid gap-2 md:grid-cols-2">
                {writesOnOpp.map((w) => (
                  <div key={w.field} className="rounded-sm border-2 border-border bg-card p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={toneForObject(w.on)}>{shortObject(w.on)}</Badge>
                      <code className="text-[11px] font-semibold text-foreground">{w.field}</code>
                      {w.gated_by && <Badge tone="warning">{w.gated_by}</Badge>}
                    </div>
                    <p className="text-xs text-foreground/85">{w.purpose}</p>
                  </div>
                ))}
              </div>
            </div>

            {writesOnContact.length > 0 && (
              <div>
                <div className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">On the Contact ({writesOnContact.length})</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {writesOnContact.map((w) => (
                    <div key={w.field} className="rounded-sm border-2 border-border bg-card p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">Contact</Badge>
                        <code className="text-[11px] font-semibold text-foreground">{w.field}</code>
                      </div>
                      <p className="text-xs text-foreground/85">{w.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Does not write */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              <div className="text-sm font-semibold">Force must NOT write ({c.does_not_write.length})</div>
              <span className="ms-auto text-[11px] text-muted-foreground">Single-writer boundary</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {c.does_not_write.map((r, i) => {
                const isCurve = /curve/i.test(r.owner);
                return (
                  <div
                    key={i}
                    className={`rounded-sm border-2 p-3 ${isCurve ? "border-amber-400 bg-amber-50/60 dark:border-amber-500/50 dark:bg-amber-950/30" : "border-border bg-card"}`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="red">no-write</Badge>
                      <code className="text-[11px] font-semibold text-foreground">{r.field}</code>
                      <Badge tone={isCurve ? "warning" : "muted"} className="ms-auto">owner: {r.owner}</Badge>
                    </div>
                    <p className="text-xs text-foreground/85">{r.reason}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-sm border-l-4 border-amber-500 bg-amber-50/60 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <b>Attribution redesign hole.</b> After the MWC acquisition of{" "}
              <a href="https://curvecompliance.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                Curve Compliance (curvecompliance.com)
              </a>
              , the marketing-attribution model on the Opportunity is being reworked.
              Owner and field shape are intentionally left as a hole. Force must not write
              attribution. WF-01 does not (yet) claim ownership either. Do not invent
              Curve field names in this repo.
            </div>
          </CardContent>
        </Card>

        {/* Fires */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">After Force writes: native routing</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {c.fires.map((f, i) => (
                <div key={i} className="rounded-sm border-2 border-border bg-card p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="good">{f.method}</Badge>
                    <span className="text-sm font-semibold">→ {f.target}</span>
                    <span className="ms-auto flex flex-wrap gap-1">
                      {f.when.map((w) => (
                        <Badge key={w} tone="accent">{w}</Badge>
                      ))}
                    </span>
                  </div>
                  {f.url_env && (
                    <div className="mb-1 text-[11px] text-muted-foreground">
                      URL env: <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{f.url_env}</code>{" "}
                      <span className="text-[10px]">(UI-only; paste from the WF-05 draft)</span>
                    </div>
                  )}
                  {f.notes && <p className="text-xs text-foreground/85">{f.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {c.notes && c.notes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 text-sm font-semibold">Notes</div>
              <ul className="grid list-disc gap-1 ps-5 text-sm text-foreground/85">
                {c.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
              {c.status?.notes && (
                <p className="mt-2 text-[11px] text-muted-foreground">Status: {c.status.notes}</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Source of truth: <code className="rounded bg-muted px-1">to-be/force.json</code> validated against{" "}
                <code className="rounded bg-muted px-1">to-be/force.schema.json</code>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
