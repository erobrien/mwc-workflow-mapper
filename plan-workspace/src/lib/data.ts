import { useEffect, useState } from "react";

// Shapes mirror public/data.json (cleaned from the captured GHL dataset).
export interface KPIs {
  workflows_total: number; workflows_published: number; workflows_drafts: number;
  target_workflows: number; pipelines_now: number; pipelines_target: number;
  fields_total: number; fields_on_contact: number;
  fields_on_opportunity_now: number; fields_on_opportunity_target: number;
  fields_never_populated: number; fields_rare: number;
  contacts_scanned: number; opportunities_scanned: number; opportunities: number;
  ad_false_wins: number; wins_with_zero_value_pct: number;
  ghl_payment_transactions: number; click_ids_captured: number; tcpa_consent_stored: number;
  steps_published_total: number; branches_total: number;
  sms_sends_defined: number; email_sends_defined: number;
}
export interface Trigger { name: string; type: string; active?: boolean; }
export interface AsIsWorkflow {
  id: string; name: string; status: string; updated_at?: string;
  steps?: number; sms?: number; email?: number; wait?: number; branch?: number;
  tag?: number; opp?: number; triggers?: Trigger[];
}
export interface Field {
  id: string; name: string; key: string; type?: string; model?: string;
  count?: number; pct?: number; usage?: string;
}
export interface ToBeWorkflow { n: string; name: string; absorbs?: string; copy?: string; }
export interface Pipeline { name: string; stages?: string[]; exits?: string[]; role?: string; }
export interface FieldDestRow { key: string; label: string; to?: string; from?: string; note?: string; }
export interface FieldDestination { target: string; card: string; role: string; examples: string; removing?: FieldDestRow[]; adding?: FieldDestRow[]; }
export interface Defect { id: string; title: string; severity: string; evidence?: string; impact?: string; }
export interface MigrationStep { n: string; name: string; status: string; owner?: string; gate?: string; blocked_by?: string; }
export interface Decision { n: string; decision: string; choice: string; status: string; date?: string; }
export interface Risk { id: string; sev: string; area: string; mitigation: string; }
export interface MsgToBe { id_name: string; workflow_step?: string; timing?: string; type: string; message: string; }
export interface MsgAsIs { workflow: string; workflow_id?: string; step?: string; channel: string; delay?: string; subject?: string; message: string; status?: string; }
export interface TriggersSummary {
  captured_at: string; active_workflows_with_triggers: number; total_trigger_records: number;
  type_breakdown: [string, number][];
}

export interface PlanData {
  generated_at: string; location_id: string; kpis: KPIs;
  as_is_workflows: AsIsWorkflow[]; fields: Field[];
  triggers_summary: TriggersSummary;
  tobe_workflows: ToBeWorkflow[]; pipelines: Pipeline[];
  field_destinations: FieldDestination[]; defects: Defect[];
  migration_steps: MigrationStep[]; decisions: Decision[]; risks: Risk[];
  guardrails: string[]; messages_tobe: MsgToBe[]; messages_asis: MsgAsIs[];
}

let cache: PlanData | null = null;

export function useData() {
  const [data, setData] = useState<PlanData | null>(cache);
  const [isLoading, setLoading] = useState(!cache);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (cache) return;
    fetch("/data.json")
      .then((r) => { if (!r.ok) throw new Error(`data.json: ${r.status}`); return r.json(); })
      .then((d: PlanData) => { cache = d; setData(d); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading, error };
}
