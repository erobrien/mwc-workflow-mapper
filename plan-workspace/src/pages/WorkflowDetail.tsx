import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Alert, Loading, cn } from "../components/ui";
import { useJson, type AsisDetail, type AsisFlows, type AsisStep, type AsisWorkflow, type AsisAnalysis } from "../lib/asis";
import { MermaidChart } from "../components/MermaidChart";
import { ghlWorkflow } from "../lib/ghl";
import {
  ExternalLink, ArrowLeft, MessageSquare, Mail, Zap, Tag, FolderOpen, MapPin,
  Clock, GitBranch, CornerDownRight, Target, Database, Table2, Webhook, Phone,
  StickyNote, BellOff, LogOut, Pencil, CalendarCheck, CircleDot, AlertTriangle,
  ShieldAlert, Wrench, Search,
} from "lucide-react";

/* ---- engineering analysis section ------------------------------------- */
const SEVERITY_META: Record<string, { tone: "red" | "warning" | "blue" | "muted"; label: string; icon: any }> = {
  critical: { tone: "red", label: "Critical", icon: ShieldAlert },
  major: { tone: "warning", label: "Major", icon: AlertTriangle },
  minor: { tone: "blue", label: "Minor", icon: Search },
  none: { tone: "muted", label: "Informational", icon: Search },
};

function AnalysisSection({ analysis }: { analysis: AsisAnalysis }) {
  const sev = SEVERITY_META[analysis.severity] || SEVERITY_META.none;
  const SevIcon = sev.icon;
  const alertTone = analysis.severity === "critical" ? "red" : analysis.severity === "major" ? "warning" : analysis.severity === "minor" ? "blue" : "neutral";
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><SevIcon className="h-4 w-4" /> Engineering analysis</h2>
        <Badge tone={sev.tone}>{sev.label}</Badge>
        <span className="text-[11px] text-muted-foreground">— live re-map, 2026-07-22</span>
      </div>
      <div className="space-y-3">
        <Alert tone={alertTone as any}>
          <p>{analysis.summary}</p>
        </Alert>
        {analysis.findings.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> What's wrong / worth flagging
              </div>
              <ul className="space-y-2">
                {analysis.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {analysis.recommendation && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Improve / consolidate / refactor
              </div>
              <p className="text-sm text-foreground/90">{analysis.recommendation}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

/* ---- per-kind visual treatment ---------------------------------------- */
const KIND_META: Record<string, { icon: any; tone: string; label: string }> = {
  message: { icon: MessageSquare, tone: "text-emerald-600 dark:text-emerald-400", label: "Message" },
  wait: { icon: Clock, tone: "text-amber-600 dark:text-amber-400", label: "Wait" },
  decision: { icon: GitBranch, tone: "text-sky-600 dark:text-sky-400", label: "If / else" },
  goto: { icon: CornerDownRight, tone: "text-violet-600 dark:text-violet-400", label: "Go to" },
  tag: { icon: Tag, tone: "text-indigo-600 dark:text-indigo-400", label: "Tag" },
  opportunity: { icon: Target, tone: "text-rose-600 dark:text-rose-400", label: "Opportunity" },
  field: { icon: Pencil, tone: "text-teal-600 dark:text-teal-400", label: "Contact field" },
  appointment: { icon: CalendarCheck, tone: "text-cyan-600 dark:text-cyan-400", label: "Appointment" },
  sheets: { icon: Table2, tone: "text-green-700 dark:text-green-400", label: "Google Sheets" },
  webhook: { icon: Webhook, tone: "text-orange-600 dark:text-orange-400", label: "Webhook" },
  ivr: { icon: Phone, tone: "text-blue-600 dark:text-blue-400", label: "IVR / call" },
  note: { icon: StickyNote, tone: "text-yellow-700 dark:text-yellow-400", label: "Note" },
  dnd: { icon: BellOff, tone: "text-red-600 dark:text-red-400", label: "DND" },
  exit: { icon: LogOut, tone: "text-muted-foreground", label: "Exit" },
  workflow: { icon: Database, tone: "text-fuchsia-600 dark:text-fuchsia-400", label: "Workflow" },
  action: { icon: CircleDot, tone: "text-muted-foreground", label: "Action" },
};

function StepBody({ step }: { step: AsisStep }) {
  const d = step.detail;
  if (!d) return null;

  if (step.kind === "message") {
    if (d.channel === "sms") {
      return <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{d.body}</pre>;
    }
    // email / internal email — sanitised plain-text projection, no live HTML
    return (
      <div className="mt-2 space-y-1.5">
        {d.subject && <div className="text-sm font-medium">Subject: {d.subject}</div>}
        {(d.from_name || d.from_email) && <div className="text-xs text-muted-foreground">From: {d.from_name} {d.from_email && `<${d.from_email}>`}</div>}
        {d.preheader && <div className="text-xs italic text-muted-foreground">Preheader: {d.preheader}</div>}
        {d.body_text && <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{d.body_text}</pre>}
      </div>
    );
  }
  if (step.kind === "wait") {
    return <div className="mt-1 text-sm text-muted-foreground">{d.summary}{d.description ? ` — ${d.description}` : ""}</div>;
  }
  if (step.kind === "goto") {
    return <div className="mt-1 text-sm text-muted-foreground">→ jumps to <span className="font-medium text-foreground">{d.target_name || d.target_id}</span></div>;
  }
  if (step.kind === "tag") {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground">{d.op === "remove" ? "Remove" : "Add"}:</span>
        {(d.tags || []).map((t) => <Badge key={t} tone={d.op === "remove" ? "red" : "good"}>{t}</Badge>)}
      </div>
    );
  }
  if (step.kind === "opportunity") {
    return (
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <div><span className="font-medium text-foreground capitalize">{d.op}</span> opportunity{d.name ? ` — ${d.name}` : ""}</div>
        {d.status && <div>Status: {d.status}{d.value ? ` · value ${d.value}` : ""}</div>}
        {d.pipeline_id && <div className="font-mono text-[10px]">pipeline {d.pipeline_id}{d.stage_id ? ` · stage ${d.stage_id}` : ""}</div>}
        {d.scope && <div>Scope: {d.scope}</div>}
      </div>
    );
  }
  if (step.kind === "field") {
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        {d.action && <span className="font-medium text-foreground">{d.action}</span>}
        {d.fields && d.fields.length > 0 && <span> — {d.fields.join(", ")}</span>}
      </div>
    );
  }
  if (step.kind === "appointment") {
    return <div className="mt-1 text-sm text-muted-foreground">Set status → <span className="font-medium text-foreground">{d.status}</span></div>;
  }
  if (step.kind === "sheets") {
    return <div className="mt-1 text-xs text-muted-foreground">{d.action} · {d.spreadsheet}{d.sheet ? ` / ${d.sheet}` : ""}</div>;
  }
  if (step.kind === "webhook") {
    return <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{d.method} {d.url}</div>;
  }
  if (step.kind === "ivr") {
    return (
      <div className="mt-1 text-sm text-muted-foreground">
        {d.message && <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{d.message}</pre>}
        {d.num_digits != null && <div className="mt-1 text-xs">Collects {d.num_digits} digit(s)</div>}
      </div>
    );
  }
  if (step.kind === "note") {
    return d.body_text ? <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground/90">{d.body_text}</pre> : null;
  }
  if (step.kind === "dnd") {
    return <div className="mt-1 text-xs text-muted-foreground">{d.mode} · {d.direction}{d.channels && d.channels.length ? ` · ${d.channels.join(", ")}` : ""}</div>;
  }
  if (step.kind === "exit") {
    return d.action ? <div className="mt-1 text-xs text-muted-foreground">{d.action}</div> : null;
  }
  return null;
}

function StepNode({ step, n }: { step: AsisStep; n: number }) {
  const meta = KIND_META[step.kind] || KIND_META.action;
  const Icon = meta.icon;

  if (step.kind === "decision") {
    return (
      <div className="rounded-md border border-l-4 border-l-sky-400 bg-sky-50/40 dark:bg-sky-950/20">
        <div className="flex items-start gap-2 p-3">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.tone)} />
          <div className="min-w-0">
            <div className="text-sm font-semibold">If / else{step.condition_name ? `: ${step.condition_name}` : ""}</div>
            <div className="text-xs text-muted-foreground">{step.branches?.length || 0} branch(es){step.none_branch ? ` · else → ${step.none_branch}` : ""}</div>
          </div>
        </div>
        <div className="space-y-3 border-t border-sky-200/60 p-3 dark:border-sky-900/40">
          {step.branches?.map((b, i) => (
            <div key={i} className="rounded-md border bg-card">
              <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5">
                <Badge tone={b.is_else ? "muted" : "blue"}>{b.label}</Badge>
                {b.conditions.map((c, j) => <span key={j} className="text-xs text-muted-foreground">· {c}</span>)}
              </div>
              <div className="p-2">
                {b.steps.length ? <StepList steps={b.steps} /> : <div className="px-1 py-2 text-xs italic text-muted-foreground">(branch ends — contact exits this path)</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{n}</span>
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.tone)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium">{step.name}</span>
              <Badge tone="muted">{meta.label}</Badge>
            </div>
            <StepBody step={step} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* Sequential list; decisions self-number as 'B'. Linear steps get running index. */
function StepList({ steps }: { steps: AsisStep[] }) {
  let idx = 0;
  return (
    <div className="space-y-2">
      {steps.map((s) => {
        const label = s.kind === "decision" ? "◆" : String(++idx);
        return <StepNode key={s.id} step={s} n={label as any} />;
      })}
    </div>
  );
}

const DATASETS = {
  asis: { detail: "/asis-detail.json", flows: "/asis-flows.json", back: "/as-is", label: "As-is workflows",
          subtitle: "As-is workflow · complete step graph captured verbatim from the live GHL API · no brand-voice rewrite" },
  cody: { detail: "/cody-detail.json", flows: "/cody-flows.json", back: "/cody", label: "Cody build workflows",
          subtitle: "Cody build workflow · complete step graph captured verbatim from the live GHL API · no rewrite" },
  codyneo: { detail: "/codyneo-detail.json", flows: "/codyneo-flows.json", back: "/cody-neo", label: "Cody Neo workflows",
          subtitle: "Cody Neo workflow · corrected copy · outcome and attribution stamps write to the Opportunity" },
} as const;

export default function WorkflowDetail({ dataset = "asis" }: { dataset?: keyof typeof DATASETS }) {
  const { id } = useParams<{ id: string }>();
  const ds = DATASETS[dataset];
  const cody = dataset !== "asis";
  const { data, isLoading } = useJson<AsisDetail>(ds.detail);
  const { data: flowsData } = useJson<AsisFlows>(ds.flows);
  const backTo = ds.back;
  const backLabel = ds.label;
  const wf: AsisWorkflow | undefined = useMemo(() => data?.workflows.find((w) => w.id === id), [data, id]);
  const flow = useMemo(() => flowsData?.flows.find((f) => f.id === id), [flowsData, id]);

  if (isLoading || !data) return <Loading />;
  if (!wf) return (
    <PageShell title="Workflow not found">
      <Link to={backTo} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to {backLabel.toLowerCase()}</Link>
    </PageShell>
  );

  const loc = data.location_id;

  return (
    <PageShell
      title={wf.name}
      subtitle={ds.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <Link to={backTo} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
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
          <div className="mt-1"><Badge tone={wf.status === "published" ? "good" : "muted"}>{wf.status}</Badge></div>
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
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Graph size</div>
          <div className="mt-1 text-sm font-medium">{wf.n_steps} steps · {wf.n_nodes} nodes</div>
          <div className="mt-1 text-xs text-muted-foreground">{wf.sms} SMS · {wf.email} email</div>
        </CardContent></Card>
      </div>

      {/* Engineering analysis (added in the 2026-07-22 production re-map) */}
      {wf.analysis && <AnalysisSection analysis={wf.analysis} />}

      {/* Triggers */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Zap className="h-4 w-4" /> Triggers ({wf.triggers.length})</h2>
        {wf.triggers.length === 0 ? (
          <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">No triggers configured — this workflow is entered from another workflow or manually.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {wf.triggers.map((t) => (
              <div key={t.id} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", t.active ? "bg-emerald-500" : "bg-muted-foreground")} />
                  <span className="text-sm font-medium">{t.name}</span>
                  <Badge tone="blue">{t.type}</Badge>
                  {!t.active && <Badge tone="muted">inactive</Badge>}
                </div>
                {t.conditions.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {t.conditions.map((c, i) => <li key={i} className="text-xs text-muted-foreground">· {c}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step graph */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><GitBranch className="h-4 w-4" /> Step graph ({wf.n_steps})</h2>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">Verbatim — message copy needs brand review before rebuild</span>
        </div>
        {wf.steps.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">This workflow has no action steps — it is trigger-only.</div>
        ) : (
          <StepList steps={wf.steps} />
        )}
      </section>

      {/* Flow diagram */}
      {flow && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold"><GitBranch className="h-4 w-4" /> Flow diagram</h2>
            <span className="text-[11px] text-muted-foreground">{flow.desc}</span>
          </div>
          <Card><CardContent className="p-4">
            <MermaidChart src={flow.src} active />
          </CardContent></Card>
        </section>
      )}

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
