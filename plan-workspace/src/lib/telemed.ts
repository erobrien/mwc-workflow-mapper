import { useEffect, useState } from "react";

export interface TelemedData {
  meta: { title: string; subtitle: string; brand_voice: string; location_id: string; timezone: string; test_window: string };
  overview: {
    concept: string; principles: string[];
    domains: { domain: string; purpose: string; where: string }[];
    carveout_owned: string[]; carveout_shared: string[];
    roles: { permission: string; setting: string }[];
    out_of_scope: string[];
    day30_decisions: { name: string; detail: string }[];
    day30_metrics: string[];
  };
  ghl_features: { feature: string; scope: string; use: string }[];
  portal_app: {
    intro: string;
    options: { name: string; what: string; pros: string[]; cons: string[]; cost: string; fit: string }[];
    recommendation: string;
    member_features: { feature: string; native: string; notes: string }[];
    native_setup: string[];
  };
  custom_fields: {
    contact: { name: string; type: string; req: string; notes: string }[];
    appointment: { name: string; type: string; notes: string }[];
  };
  tags: Record<string, string[]>;
  calendars: {
    groups: { group: string; calendars: string }[];
    common: { setting: string; value: string }[];
    online_specifics: string[];
    provider_blocks: { day: string; am: string; pm: string; eve: string }[];
  };
  forms: { name: string; purpose: string; channel: string; items: string[] }[];
  pipelines: { name: string; scope: string; stages: { stage: string; entry: string; exit: string }[] }[];
  workflows: { code: string; name: string; source: string; trigger: string; steps: string[] }[];
  messages: {
    sms: { name: string; body: string }[];
    email: { name: string; subject: string }[];
    email_anatomy: string[];
    internal: string[];
  };
  trigger_links: { link: string; dest: string; tag: string }[];
  conversations: Record<string, string>;
  phone: { pattern_a: string; pattern_b: string };
  build_plan: {
    weeks: { week: string; rows: { day: string; owner: string; task: string }[] }[];
    estimate: string; checklist: string[];
  };
}

let cache: TelemedData | null = null;

export function useTelemed() {
  const [data, setData] = useState<TelemedData | null>(cache);
  const [isLoading, setLoading] = useState(!cache);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (cache) return;
    fetch("/telemed.json")
      .then((r) => { if (!r.ok) throw new Error(`telemed.json: ${r.status}`); return r.json(); })
      .then((d: TelemedData) => { cache = d; setData(d); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading, error };
}
