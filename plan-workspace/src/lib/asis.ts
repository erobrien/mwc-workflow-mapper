import { useEffect, useState } from "react";

// Shapes mirror public/asis-detail.json (built by build_asis_detail.py from the
// live GHL "Active Workflows" extraction — 28 workflows, each with its full
// verbatim step graph resolved into an ordered, branch-aware tree).

export type StepKind =
  | "message" | "wait" | "decision" | "goto" | "tag" | "opportunity"
  | "field" | "appointment" | "sheets" | "webhook" | "ivr" | "note"
  | "dnd" | "exit" | "workflow" | "action";

export interface StepDetail {
  channel?: string; body?: string; subject?: string; from_name?: string;
  from_email?: string; preheader?: string; body_text?: string; attachments?: number;
  summary?: string; description?: string;
  target_id?: string; target_name?: string;
  op?: string; tags?: string[];
  pipeline_id?: string; stage_id?: string; status?: string; name?: string;
  value?: string; scope?: string;
  action?: string; fields?: string[];
  spreadsheet?: string; sheet?: string;
  method?: string; url?: string;
  message?: string; num_digits?: number; widget?: string;
  direction?: string; mode?: string; channels?: string[];
}

export interface AsisStep {
  id: string; type: string; kind: StepKind; name: string;
  detail?: StepDetail;
  condition_name?: string; none_branch?: string;
  branches?: AsisBranch[];
}
export interface AsisBranch {
  label: string; conditions: string[]; is_else?: boolean; steps: AsisStep[];
}

export interface AsisTrigger {
  id: string; name: string; type: string; active: boolean; conditions: string[];
}

export interface AsisWorkflow {
  id: string; name: string; folder: string; status: string;
  updated_at: string; version?: number; location: string;
  triggers: AsisTrigger[];
  steps: AsisStep[];
  step_counts: Record<string, number>;
  n_steps: number; n_nodes: number;
  sms: number; email: number;
}

export interface AsisDetail {
  scope: string; extraction_method: string; location_id: string;
  coverage: {
    total: number; published: number; draft: number;
    total_steps: number; total_triggers: number;
    total_sms: number; total_email: number; with_steps: number;
  };
  out_of_scope_count: number; roster_total: number;
  folders: { name: string; count: number }[];
  workflows: AsisWorkflow[];
}

// Per-workflow full-fidelity Mermaid flow diagrams (public/asis-flows.json,
// built by build_asis_flows.py — one diagram per active workflow).
export interface AsisFlow {
  key: string; id: string; name: string; folder: string; status: string;
  n_steps: number; n_sms: number; n_email: number; n_triggers: number;
  n_branches: number; n_waits: number; n_gotos: number; n_opps: number;
  title: string; desc: string; src: string;
}
export interface AsisFlows {
  location_id: string;
  folders: { name: string; count: number }[];
  flows: AsisFlow[];
}

// Generic cached JSON hooks — one cache entry per URL so the as-is and Cody
// datasets (identical schemas) share all rendering code.
const jsonCache: Record<string, unknown> = {};

export function useJson<T>(url: string) {
  const [data, setData] = useState<T | null>((jsonCache[url] as T) ?? null);
  const [isLoading, setLoading] = useState(!jsonCache[url]);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (jsonCache[url]) { setData(jsonCache[url] as T); setLoading(false); return; }
    setLoading(true);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); })
      .then((d: T) => { jsonCache[url] = d; setData(d); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);
  return { data, isLoading, error };
}

export const useAsisFlows = () => useJson<AsisFlows>("/asis-flows.json");
export const useAsisDetail = () => useJson<AsisDetail>("/asis-detail.json");

// Cody (Cavenaugh Media) build sub-account — same schemas, different capture.
export const useCodyFlows = () => useJson<AsisFlows>("/cody-flows.json");
export const useCodyDetail = () => useJson<AsisDetail>("/cody-detail.json");

// Cody Neo — corrected copy of the Cody build (opportunity-owned outcome fields).
export const useCodyNeoFlows = () => useJson<AsisFlows>("/codyneo-flows.json");
export const useCodyNeoDetail = () => useJson<AsisDetail>("/codyneo-detail.json");
