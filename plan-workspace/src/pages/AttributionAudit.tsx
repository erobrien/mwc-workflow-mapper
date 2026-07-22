import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Alert, Loading, cn } from "../components/ui";
import {
  Target, AlertTriangle, Database, GitCompareArrows, ArrowRightLeft,
  ShieldAlert, Layers, FileWarning,
} from "lucide-react";

interface PopRow { field: string; count: number; pct: number; layer: string }
interface AttributionData {
  generated_at: string;
  method: string;
  headline: string;
  custom_fields: { total_on_contact: number; total_on_opportunity: number; attribution_related_on_contact: number; note: string };
  click_id_schema_gap: { designed: string[]; implemented_as_custom_field: string[]; missing_entirely: string[]; note: string };
  population_rates: PopRow[];
  mapping_failure_proof: {
    title: string;
    rows: { cohort: string; n: number; custom_field_also_populated: number; custom_field_missing: number; pct_missing: number }[];
    interpretation: string;
  };
  contact_to_opportunity_handoff: {
    title: string; opportunities_sampled: number; opportunities_with_any_attributions_entry: number;
    pct_with_any_attributions_entry: number; opportunities_with_real_utm_in_attributions: number;
    pct_with_real_utm_in_attributions: number; interpretation: string;
    zero_dollar_opportunities: { count: number; of_sample: number; pct: number };
  };
  overwrite_risk: {
    title: string; multi_touch_contacts_in_sample: number; pct_of_sample_multi_touch: number;
    diverging_first_vs_current_fields_measured: number; why_zero_is_not_good_news: string;
  };
  custom_objects: { found: string[]; lead_source_object_status: string };
}

function pctBar(pct: number, tone: string) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(pct, 1.2)}%` }} />
    </div>
  );
}

function layerBadge(layer: string) {
  if (layer.startsWith("native_ghl")) return <Badge tone="blue">native GHL</Badge>;
  if (layer.includes("unwired")) return <Badge tone="red">designed, unwired</Badge>;
  return <Badge tone="muted">custom field</Badge>;
}

export default function AttributionAudit() {
  const [data, setData] = useState<AttributionData | null>(null);

  useEffect(() => {
    fetch("/attribution-audit.json").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <Loading />;

  const nativeRows = data.population_rates.filter((r) => r.layer.startsWith("native_ghl"));
  const customRows = data.population_rates.filter((r) => !r.layer.startsWith("native_ghl"));

  return (
    <PageShell
      title="Attribution audit — live production data (2026-07-22)"
      subtitle={data.method}
    >
      <Alert tone="red">
        <p className="text-sm">{data.headline}</p>
      </Alert>

      {/* top stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Opportunity custom fields</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{data.custom_fields.total_on_opportunity}</div>
          <div className="mt-1 text-xs text-muted-foreground">of {data.custom_fields.total_on_contact} total fields — all live on Contact</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">fbclid_value population</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">0.0%</div>
          <div className="mt-1 text-xs text-muted-foreground">vs. 11.1% real fbclid in native GHL data</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Opportunities with real UTM</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">0.0%</div>
          <div className="mt-1 text-xs text-muted-foreground">of 500 sampled, despite 95.4% having an attributions[] stub</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">$0 opportunities</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{data.contact_to_opportunity_handoff.zero_dollar_opportunities.pct}%</div>
          <div className="mt-1 text-xs text-muted-foreground">{data.contact_to_opportunity_handoff.zero_dollar_opportunities.count} of {data.contact_to_opportunity_handoff.zero_dollar_opportunities.of_sample} sampled</div>
        </CardContent></Card>
      </div>

      {/* mapping failure proof */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <FileWarning className="h-4 w-4 text-red-600 dark:text-red-400" /> {data.mapping_failure_proof.title}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.mapping_failure_proof.rows.map((r) => (
            <Card key={r.cohort} className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <p className="text-sm font-medium">{r.cohort}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-red-600 dark:text-red-400">{r.pct_missing}%</span>
                  <span className="text-xs text-muted-foreground">missing the custom field ({r.custom_field_missing} of {r.n})</span>
                </div>
                {pctBar(r.pct_missing, "bg-red-600 dark:bg-red-500")}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-3">
          <Alert tone="neutral">
            <p className="text-sm">{data.mapping_failure_proof.interpretation}</p>
          </Alert>
        </div>
      </section>

      {/* population rates: two tables */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Database className="h-4 w-4" /> Field population — custom-field layer (n=1,500 contact sample)
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {customRows.map((r) => (
              <div key={r.field} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-56 shrink-0 font-mono text-xs">{r.field}</span>
                <div className="flex-1">{pctBar(r.pct, r.pct === 0 ? "bg-red-600 dark:bg-red-500" : r.pct < 10 ? "bg-amber-500" : "bg-emerald-500")}</div>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{r.pct}%</span>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{r.count}</span>
                <div className="w-40 shrink-0 text-right">{layerBadge(r.layer)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Field population — native GHL attributions[] array (same 1,500-contact sample)
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {nativeRows.map((r) => (
              <div key={r.field} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-72 shrink-0 font-mono text-xs">{r.field}</span>
                <div className="flex-1">{pctBar(r.pct, "bg-sky-500")}</div>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{r.pct}%</span>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{r.count}</span>
                <div className="w-56 shrink-0 text-right">{layerBadge(r.layer)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* click id schema gap */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Target className="h-4 w-4" /> Click-ID schema — designed vs. implemented
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Designed (target spec)</div>
            <div className="flex flex-wrap gap-1.5">{data.click_id_schema_gap.designed.map((x) => <Badge key={x} tone="muted">{x}</Badge>)}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Implemented as a custom field</div>
            <div className="flex flex-wrap gap-1.5">{data.click_id_schema_gap.implemented_as_custom_field.map((x) => <Badge key={x} tone="good">{x}</Badge>)}</div>
          </CardContent></Card>
          <Card className="border-l-4 border-l-destructive"><CardContent className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing entirely</div>
            <div className="flex flex-wrap gap-1.5">{data.click_id_schema_gap.missing_entirely.map((x) => <Badge key={x} tone="red">{x}</Badge>)}</div>
          </CardContent></Card>
        </div>
        <div className="mt-3">
          <Alert tone="warning"><p className="text-sm">{data.click_id_schema_gap.note}</p></Alert>
        </div>
      </section>

      {/* handoff */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" /> {data.contact_to_opportunity_handoff.title}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Opportunities sampled</div>
            <div className="mt-1 text-2xl font-bold">{data.contact_to_opportunity_handoff.opportunities_sampled}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Have an attributions[] stub</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.contact_to_opportunity_handoff.pct_with_any_attributions_entry}%</div>
          </CardContent></Card>
          <Card className="border-l-4 border-l-destructive"><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">...with REAL UTM data in it</div>
            <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{data.contact_to_opportunity_handoff.pct_with_real_utm_in_attributions}%</div>
          </CardContent></Card>
        </div>
        <div className="mt-3">
          <Alert tone="neutral"><p className="text-sm">{data.contact_to_opportunity_handoff.interpretation}</p></Alert>
        </div>
      </section>

      {/* overwrite risk */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <GitCompareArrows className="h-4 w-4 text-purple-600 dark:text-purple-400" /> {data.overwrite_risk.title}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Multi-touch contacts in sample</div>
            <div className="mt-1 text-2xl font-bold">{data.overwrite_risk.pct_of_sample_multi_touch}%</div>
            <div className="mt-1 text-xs text-muted-foreground">{data.overwrite_risk.multi_touch_contacts_in_sample} of 1,500 have 2+ attribution touches recorded</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Divergence measured on first_* vs current fields</div>
            <div className="mt-1 text-2xl font-bold">{data.overwrite_risk.diverging_first_vs_current_fields_measured}</div>
            <div className="mt-1 text-xs text-muted-foreground">not because it's safe — see below</div>
          </CardContent></Card>
        </div>
        <div className="mt-3">
          <Alert tone="warning"><p className="text-sm">{data.overwrite_risk.why_zero_is_not_good_news}</p></Alert>
        </div>
      </section>

      {/* custom objects */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" /> Custom objects registry
        </h2>
        <Card><CardContent className="p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {data.custom_objects.found.map((x) => <Badge key={x} tone="muted">{x}</Badge>)}
          </div>
          <p className="text-sm text-muted-foreground">{data.custom_objects.lead_source_object_status}</p>
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
