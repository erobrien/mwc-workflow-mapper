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

let cache: AsisDetail | null = null;
let flowsCache: AsisFlows | null = null;

export function useAsisFlows() {
  const [data, setData] = useState<AsisFlows | null>(flowsCache);
  const [isLoading, setLoading] = useState(!flowsCache);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (flowsCache) return;
    fetch("/asis-flows.json")
      .then((r) => { if (!r.ok) throw new Error(`asis-flows.json: ${r.status}`); return r.json(); })
      .then((d: AsisFlows) => { flowsCache = d; setData(d); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading, error };
}

export function useAsisDetail() {
  const [data, setData] = useState<AsisDetail | null>(cache);
  const [isLoading, setLoading] = useState(!cache);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (cache) return;
    fetch("/asis-detail.json")
      .then((r) => { if (!r.ok) throw new Error(`asis-detail.json: ${r.status}`); return r.json(); })
      .then((d: AsisDetail) => { cache = d; setData(d); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading, error };
}
