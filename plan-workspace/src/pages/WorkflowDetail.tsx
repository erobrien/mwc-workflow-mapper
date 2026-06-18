import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, Table, TH, TD, cn } from "../components/ui";
import { useData } from "../lib/data";
import { ghlWorkflow } from "../lib/ghl";
import { ExternalLink, ArrowLeft, MessageSquare, Mail, Clock, GitBranch, Tag, Layers } from "lucide-react";

function chanTone(c: string) {
  return /email/i.test(c) ? "blue" : /sms|text/i.test(c) ? "good" : "muted";
}

function codeOf(name: string) {
  return name.match(/^(\d+[A-Za-z]?)\./)?.[1]?.toUpperCase() ?? "";
}

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useData();

  const wf = useMemo(() => data?.as_is_workflows.find((w) => w.id === id), [data, id]);
  const msgs = useMemo(() => data?.messages_asis.filter((m) => m.workflow_id === id) ?? [], [data, id]);

  const tobeMatch = useMemo(() => {
    if (!data || !wf) return null;
    const code = codeOf(wf.name);
    if (!code) return null;
    return data.tobe_workflows.find((t) =>
      t.absorbs?.toUpperCase().includes(code) ||
      wf.name.slice(0, 6).toUpperCase().includes(t.n.padStart(2, "0"))
    ) ?? null;
  }, [data, wf]);

  if (isLoading || !data) return <Loading />;
  if (!wf) return (
    <PageShell title="Workflow not found">
      <Link to="/inventory" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to inventory</Link>
    </PageShell>
  );

  const loc = data.location_id;
  const statItems = [
    { icon: Layers, label: "Steps", value: wf.steps ?? 0 },
    { icon: MessageSquare, label: "SMS", value: wf.sms ?? 0 },
    { icon: Mail, label: "Email", value: wf.email ?? 0 },
    { icon: Clock, label: "Waits", value: wf.wait ?? 0 },
    { icon: GitBranch, label: "Branches", value: wf.branch ?? 0 },
    { icon: Tag, label: "Tag ops", value: wf.tag ?? 0 },
    { icon: Layers, label: "Opp ops", value: wf.opp ?? 0 },
  ];

  return (
    <PageShell
      title={wf.name}
      subtitle={`As-is workflow · ${msgs.length} captured messages · all require brand review before rebuild`}
      actions={
        <div className="flex items-center gap-2">
          <Link to="/inventory" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> Inventory
          </Link>
          <a href={ghlWorkflow(loc, wf.id)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <ExternalLink className="h-3.5 w-3.5" /> Open in GHL builder
          </a>
        </div>
      }
    >
      {/* Brand compliance warning */}
      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <div>
          <div className="font-semibold text-amber-800 dark:text-amber-300">Messages not brand compliant</div>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
            All {msgs.length} messages captured from this workflow are live as-is copy — not brand-reviewed. Every message requires audit and rewrite before the target workflow goes live.
          </p>
        </div>
      </div>

      {/* Stats + meta */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="mt-1"><Badge tone={wf.status === "published" ? "good" : "muted"}>{wf.status}</Badge></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last updated</div>
          <div className="mt-1 text-sm font-medium">{wf.updated_at ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workflow ID</div>
          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{wf.id}</div>
        </CardContent></Card>
        {tobeMatch ? (
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Maps to target</div>
            <div className="mt-1">
              <Link to="/to-be/workflows" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                {tobeMatch.n}. {tobeMatch.name}
              </Link>
            </div>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Maps to target</div>
            <Link to="/to-be/workflows" className="mt-1 text-xs text-muted-foreground hover:text-foreground">See target workflows →</Link>
          </CardContent></Card>
        )}
      </div>

      {/* Step counts */}
      <div className="flex flex-wrap gap-3">
        {statItems.map(({ icon: Icon, label, value }) => (
          <div key={label} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm", value === 0 ? "text-muted-foreground" : "font-medium")}>
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Triggers */}
      {wf.triggers && wf.triggers.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Triggers ({wf.triggers.length})</h2>
          <div className="flex flex-wrap gap-2">
            {wf.triggers.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm">
                <span className={cn("h-2 w-2 rounded-full", t.active ? "bg-emerald-500" : "bg-muted-foreground")} />
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.type}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Messages */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Captured messages ({msgs.length})</h2>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">All flagged: needs brand review</span>
        </div>
        {msgs.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">No messages captured from this workflow.</div>
        ) : (
          <div className="space-y-2">
            {msgs.map((m, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={chanTone(m.channel)}>{m.channel}</Badge>
                    <Badge tone="warning">Needs brand review</Badge>
                    {m.step && <span className="text-xs text-muted-foreground">{m.step}</span>}
                    {m.delay && <Badge tone="muted">{m.delay}</Badge>}
                    {m.status && <span className="ms-auto text-xs text-muted-foreground">{m.status}</span>}
                  </div>
                  {m.subject && <div className="mb-1.5 text-sm font-medium">{m.subject}</div>}
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{m.message}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Link to="/inventory" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to workflow inventory
        </Link>
        <a href={ghlWorkflow(loc, wf.id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          Open builder in GHL <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </PageShell>
  );
}
