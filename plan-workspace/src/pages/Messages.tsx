import { useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { RoutedTabs, RoutedTabPanel } from "../components/RoutedTabs";
import { useData } from "../lib/data";

function chanTone(c: string) {
  return /email/i.test(c) ? "blue" : /sms|text/i.test(c) ? "good" : "muted";
}

export default function Messages() {
  const { data, isLoading } = useData();
  const [q, setQ] = useState("");
  if (isLoading || !data) return <Loading />;
  const t = q.trim().toLowerCase();

  const tobe = data.messages_tobe.filter((m) =>
    !t || (m.id_name + m.message + (m.workflow_step ?? "")).toLowerCase().includes(t));
  const asis = data.messages_asis.filter((m) =>
    !t || (m.workflow + m.message + (m.subject ?? "")).toLowerCase().includes(t));

  return (
    <PageShell
      title="Message library"
      subtitle={`${data.messages_tobe.length} target messages authored · ${data.messages_asis.length} legacy messages captured for preservation.`}
    >
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search message text…"
        className="mb-4 w-full max-w-md rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />

      <RoutedTabs base="/messages" tabs={[{ value: "target", label: `Target (${tobe.length})` }, { value: "legacy", label: `Legacy (${asis.length})` }]}>
        <RoutedTabPanel value="target" className="space-y-2">
          {tobe.map((m, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{m.id_name}</span>
                <Badge tone={chanTone(m.type)}>{m.type}</Badge>
                {m.timing && <Badge tone="muted">{m.timing}</Badge>}
                {m.workflow_step && <span className="text-xs text-muted-foreground">{m.workflow_step}</span>}
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{m.message}</pre>
            </CardContent></Card>
          ))}
        </RoutedTabPanel>
        <RoutedTabPanel value="legacy" className="space-y-2">
          <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-300">Not brand compliant — all {data.messages_asis.length} messages require audit</div>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                These are the live messages captured directly from GHL. None have been brand-reviewed. Every message below must be audited and rewritten before the target workflows go live. See the <span className="font-medium">Target</span> tab for the planned replacements.
              </p>
            </div>
          </div>
          {asis.map((m, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{m.workflow}</span>
                <Badge tone={chanTone(m.channel)}>{m.channel}</Badge>
                <Badge tone="warning">Needs brand review</Badge>
                {m.delay && <Badge tone="muted">{m.delay}</Badge>}
                {m.status && <span className="ms-auto text-xs text-muted-foreground">{m.status}</span>}
              </div>
              {m.step && <div className="mb-1 text-xs text-muted-foreground">{m.step}</div>}
              {m.subject && <div className="mb-1 text-sm font-medium">{m.subject}</div>}
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{m.message}</pre>
            </CardContent></Card>
          ))}
        </RoutedTabPanel>
      </RoutedTabs>
    </PageShell>
  );
}
