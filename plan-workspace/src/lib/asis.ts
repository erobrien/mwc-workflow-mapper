import { useEffect, useState } from "react";

// Shapes mirror public/asis-detail.json (built by build_asis_detail.py — the
// merged current-state dataset: 136-workflow roster joined with verbatim
// messages, triggers, folder, tag references, and migration disposition).

export type Coverage = "messages" | "triggers" | "metadata";

export interface AsisMessage {
  step: string; channel: string; delay: string;
  subject: string; message: string; status: string;
}
export interface AsisTrigger { name: string; type: string; active?: boolean; }

export interface AsisWorkflow {
  id: string; name: string; status: string; updated_at: string;
  folder: string; location: string; family: string;
  triggers: AsisTrigger[]; messages: AsisMessage[];
  msg_sms: number; msg_email: number;
  tags_added: string[]; tags_removed: string[];
  disposition: string | null; target_nn: string | null;
  coverage: Coverage;
}

export interface AsisDetail {
  generated_at: string; location_id: string;
  coverage: {
    total: number; with_messages: number; triggers_only: number;
    metadata_only: number; total_messages: number;
    published: number; draft: number;
  };
  folders: { name: string; count: number }[];
  workflows: AsisWorkflow[];
}

let cache: AsisDetail | null = null;

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
