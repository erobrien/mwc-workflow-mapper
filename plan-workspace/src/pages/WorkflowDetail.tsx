import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading, cn } from "../components/ui";
import { useAsisDetail, type Coverage } from "../lib/asis";
import { ghlWorkflow } from "../lib/ghl";
import { ExternalLink, ArrowLeft, MessageSquare, Mail, Zap, Tag, FolderOpen, MapPin } from "lucide-react";

function chanTone(c: string) {
  return /email/i.test(c) ? "blue" : /sms|text/i.test(c) ? "good" : "muted";
}

const COVERAGE_LABEL: Record<Coverage, string> = {
  messages: "Message detail recovered",
  triggers: "Triggers only",
  metadata: "Structure only",
};
const COVERAGE_TONE: Record<Coverage, "good" | "blue" | "muted"> = {
  messages: "good", triggers: "blue", metadata: "muted",
};

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAsisDetail();

  const wf = useMemo(() => data?.workflows.find((w) => w.id === id), [data, id]);

  if (isLoading || !data) return <Loading />;
  if (!wf) return (
    <PageShell title="Workflow not found">
      <Link to="/as-is" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to as-is workflows</Link>
    </PageShell>
  );

  const loc = data.location_id;
  const stepDetail = wf.coverage === "messages";

  return (
    <PageShell
      title={wf.name}
      subtitle={`As-is workflow · captured verbatim from GHL · no brand-voice rewrite`}
      actions={
        <div className="flex items-center gap-2">
          <Link to="/as-is" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> As-is workflows
          </Link>
          <a href={ghlWorkflow(loc, wf.id)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <ExternalLink className="h-3.5 w-3.5" /> Open in GHL builder
          </a>
        </div>
      }
    >
      {/* Meta cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={wf.status === "published" ? "good" : "muted"}>{wf.status}</Badge>
            <Badge tone={COVERAGE_TONE[wf.coverage]}>{COVERAGE_LABEL[wf.coverage]}</Badge>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Folder</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />{wf.folder}
          </div>
          {wf.location && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{wf.location}</div>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last updated</div>
          <div className="mt-1 text-sm font-medium">{wf.updated_at || "—"}</div>
          <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{wf.id}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Migration disposition</div>
          {wf.disposition ? (
            <div className="mt-1 text-sm font-medium">{wf.disposition}{wf.target_nn ? ` → ${wf.target_nn}` : ""}</div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">Not yet mapped</div>
          )}
        </CardContent></Card>
      </div>

      {/* Coverage banner for non-message workflows */}
      {!stepDetail && (
        <div className="flex items-start gap-3 rounded-md border border-l-4 border-l-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <div>
            <div className="font-semibold text-amber-800 dark:text-amber-300">Structure only — step extraction pending</div>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
              {wf.triggers.length > 0
                ? "Triggers were recovered for this workflow, but the ordered step sequence (waits, if/else branches, and message copy) was not extractable from the GHL export."
                : "Only name, status, and folder metadata were recoverable for this workflow. The trigger list, ordered steps, and message copy were not extractable from the GHL export."}
              {" "}Open it in the GHL builder to see the live configuration.
            </p>
          </div>
        </div>
      )}

      {/* Triggers */}
      {wf.triggers.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Zap className="h-4 w-4" /> Triggers ({wf.triggers.length})</h2>
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

      {/* Tag references */}
      {(wf.tags_added.length > 0 || wf.tags_removed.length > 0) && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Tag className="h-4 w-4" /> Tag operations</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Adds ({wf.tags_added.length})</div>
              <div className="flex flex-wrap gap-1">
                {wf.tags_added.length ? wf.tags_added.map((t) => <Badge key={t} tone="good">{t}</Badge>) : <span className="text-xs text-muted-foreground">none</span>}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Removes ({wf.tags_removed.length})</div>
              <div className="flex flex-wrap gap-1">
                {wf.tags_removed.length ? wf.tags_removed.map((t) => <Badge key={t} tone="red">{t}</Badge>) : <span className="text-xs text-muted-foreground">none</span>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Messages */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" /> Message steps ({wf.messages.length})
            {wf.messages.length > 0 && <span className="text-xs font-normal text-muted-foreground">{wf.msg_sms} SMS · {wf.msg_email} email</span>}
          </h2>
          {wf.messages.length > 0 && <span className="text-[11px] text-amber-600 dark:text-amber-400">Verbatim — needs brand review before rebuild</span>}
        </div>
        {wf.messages.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No message copy was recovered for this workflow.
          </div>
        ) : (
          <div className="space-y-2">
            {wf.messages.map((m, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                    <Badge tone={chanTone(m.channel)}>{m.channel}</Badge>
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

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <Link to="/as-is" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to as-is workflows
        </Link>
        <a href={ghlWorkflow(loc, wf.id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          Open builder in GHL <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </PageShell>
  );
}
