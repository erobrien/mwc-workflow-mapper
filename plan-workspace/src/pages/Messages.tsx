import { useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Tabs, TabPanel, Badge, Loading } from "../components/ui";
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

      <Tabs tabs={[{ value: "tobe", label: `Target (${tobe.length})` }, { value: "asis", label: `Legacy (${asis.length})` }]}>
        <TabPanel value="tobe" className="space-y-2">
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
        </TabPanel>
        <TabPanel value="asis" className="space-y-2">
          {asis.map((m, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{m.workflow}</span>
                <Badge tone={chanTone(m.channel)}>{m.channel}</Badge>
                {m.delay && <Badge tone="muted">{m.delay}</Badge>}
                {m.status && <span className="text-xs text-muted-foreground">{m.status}</span>}
              </div>
              {m.subject && <div className="mb-1 text-sm font-medium">{m.subject}</div>}
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{m.message}</pre>
            </CardContent></Card>
          ))}
        </TabPanel>
      </Tabs>
    </PageShell>
  );
}
