import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Alert, Loading, cn } from "../components/ui";
import { useAsisDetail } from "../lib/asis";
import {
  MessageSquare, Mail, Phone, Bell, Clock, ShieldAlert, ListTree,
  CircleSlash, AlertTriangle, ArrowRight, Wrench,
} from "lucide-react";

interface TimingRow { when: string; channel: string; what: string }
interface Stage {
  key: string; title: string;
  status: "live_but_flawed" | "live_but_thin" | "gap_workflow_exists_but_dead" | "gap_no_workflow_exists";
  live_workflows: string[];
  what_happens_today: string;
  problems: string[];
  recommended_channel_and_timing: TimingRow[];
}
interface MissingChase { title: string; gap: string; recommendation: string }
interface PlaybookData {
  generated_at: string; method: string; headline: string;
  stages: Stage[]; missing_chases: MissingChase[];
}

const STATUS_META: Record<string, { label: string; tone: "good" | "warning" | "red"; icon: any }> = {
  live_but_flawed: { label: "Live, but flawed", tone: "warning", icon: AlertTriangle },
  live_but_thin: { label: "Live, but thin", tone: "warning", icon: AlertTriangle },
  gap_workflow_exists_but_dead: { label: "Workflow exists, never fires", tone: "red", icon: CircleSlash },
  gap_no_workflow_exists: { label: "No workflow exists", tone: "red", icon: CircleSlash },
};

function channelIcon(channel: string) {
  const c = channel.toLowerCase();
  if (c.includes("sms")) return MessageSquare;
  if (c.includes("email")) return Mail;
  if (c.includes("call")) return Phone;
  if (c.includes("task") || c.includes("staff") || c.includes("notification")) return Bell;
  return MessageSquare;
}

function StageCard({ stage, wfIdByName }: { stage: Stage; wfIdByName: Record<string, string> }) {
  const meta = STATUS_META[stage.status];
  const Icon = meta.icon;
  return (
    <Card className={cn("border-l-4", stage.status.startsWith("gap") ? "border-l-destructive" : "border-l-amber-500")}>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{stage.title}</h3>
          <Badge tone={meta.tone}><Icon className="mr-1 inline h-3 w-3" />{meta.label}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {stage.live_workflows.length === 0
            ? <Badge tone="red">No live workflow</Badge>
            : stage.live_workflows.map((w) => {
                const clean = w.replace(/\s*\(draft.*?\)|\s*\(published.*?\)/g, "");
                const id = wfIdByName[clean];
                return id ? (
                  <Link key={w} to={`/workflow/${id}`}><Badge tone="muted" className="hover:bg-muted/80">{w}</Badge></Link>
                ) : <Badge key={w} tone="muted">{w}</Badge>;
              })}
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What happens today</div>
          <p className="text-sm text-foreground/90">{stage.what_happens_today}</p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Problems
          </div>
          <ul className="space-y-1.5">
            {stage.problems.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Wrench className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Recommended: what to do, when, in which channel
          </div>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Channel</th>
                  <th className="px-3 py-2 font-semibold">What</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stage.recommended_channel_and_timing.map((r, i) => {
                  const ChanIcon = channelIcon(r.channel);
                  return (
                    <tr key={i} className={r.when.toLowerCase().includes("structural") ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <td className="whitespace-nowrap px-3 py-2 align-top font-medium">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{r.when}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top">
                        <span className="inline-flex items-center gap-1"><ChanIcon className="h-3 w-3 text-muted-foreground" />{r.channel}</span>
                      </td>
                      <td className="px-3 py-2 align-top text-foreground/90">{r.what}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LifecyclePlaybook() {
  const [data, setData] = useState<PlaybookData | null>(null);
  const { data: asis } = useAsisDetail();

  useEffect(() => {
    fetch("/lifecycle-playbook.json").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <Loading />;

  const wfIdByName: Record<string, string> = {};
  for (const w of asis?.workflows ?? []) wfIdByName[w.name] = w.id;

  const liveCount = data.stages.filter((s) => s.status.startsWith("live")).length;
  const gapCount = data.stages.filter((s) => s.status.startsWith("gap")).length;

  return (
    <PageShell
      title="Lifecycle & channel playbook — what to do, when, in which channel"
      subtitle={data.method}
    >
      <Alert tone="red"><p className="text-sm">{data.headline}</p></Alert>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle stages reviewed</div>
          <div className="mt-1 text-2xl font-bold">{data.stages.length}</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live, but flawed/thin</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{liveCount}</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-destructive"><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Structural gaps (no live automation)</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{gapCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Additional missing chases found</div>
          <div className="mt-1 text-2xl font-bold">{data.missing_chases.length}</div>
        </CardContent></Card>
      </div>

      <div className="space-y-5">
        {data.stages.map((s) => <StageCard key={s.key} stage={s} wfIdByName={wfIdByName} />)}
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
          <ListTree className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Other chases we're missing entirely
        </h2>
        <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
          Beyond the 5 requested stages, these gaps surfaced during the review — sequences with no automated counterpart anywhere in the 45 live workflows.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {data.missing_chases.map((m) => (
            <Card key={m.title} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> {m.title}
                </p>
                <p className="mb-2 text-sm text-foreground/90">{m.gap}</p>
                <p className="flex items-start gap-1.5 text-sm text-teal-700 dark:text-teal-400">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {m.recommendation}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
