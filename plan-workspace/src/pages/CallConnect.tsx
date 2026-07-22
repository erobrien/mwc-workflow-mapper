import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Alert, Loading, cn } from "../components/ui";
import {
  PhoneCall, PhoneForwarded, Users, ArrowRight, CheckCircle2, XCircle,
  ListOrdered, ShieldCheck, Rocket, ArrowLeft,
} from "lucide-react";

interface MechStep { n: number; what: string; detail: string }
interface Option { name: string; recommended: boolean; how_it_works: string; pros: string[]; cons: string[] }
interface BuildStep { order: number | string; action: string; detail: string }
interface RecommendedBuild {
  title: string; target_workflow: string; target_workflow_id: string; target_workflow_status: string;
  current_shape: string; proposed_steps: BuildStep[]; fields_and_tags_reused: string[];
  compliance_notes: string[]; rollout_plan: string[];
}
interface CallConnectData {
  generated_at: string; method: string; headline: string;
  mechanics: { title: string; steps: MechStep[]; prerequisite: string };
  options: Option[];
  recommended_build: RecommendedBuild;
}

export default function CallConnect() {
  const [data, setData] = useState<CallConnectData | null>(null);

  useEffect(() => {
    fetch("/call-connect.json").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <Loading />;

  return (
    <PageShell
      title="Call Connect — round-robin SDR routing for the no-book chase"
      subtitle={data.method}
      actions={
        <Link to="/lifecycle-playbook" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" /> Lifecycle Playbook
        </Link>
      }
    >
      <Alert tone="blue"><p className="text-sm">{data.headline}</p></Alert>

      {/* mechanics */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
          <PhoneForwarded className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {data.mechanics.title}
        </h2>
        <div className="space-y-2">
          {data.mechanics.steps.map((s) => (
            <div key={s.n} className="flex gap-3 rounded-md border bg-card p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">{s.n}</span>
              <div>
                <p className="text-sm font-medium">{s.what}</p>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Alert tone="warning">
            <p className="text-sm"><span className="font-semibold">Prerequisite: </span>{data.mechanics.prerequisite}</p>
          </Alert>
        </div>
      </section>

      {/* options comparison */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Routing options compared
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.options.map((o) => (
            <Card key={o.name} className={cn("border-l-4", o.recommended ? "border-l-emerald-500" : "border-l-slate-300 dark:border-l-slate-600")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{o.name}</p>
                  {o.recommended && <Badge tone="good">Recommended</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{o.how_it_works}</p>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Pros
                  </div>
                  <ul className="space-y-1">
                    {o.pros.map((p, i) => <li key={i} className="text-xs text-foreground/90">• {p}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                    <XCircle className="h-3 w-3" /> Cons
                  </div>
                  <ul className="space-y-1">
                    {o.cons.map((c, i) => <li key={i} className="text-xs text-foreground/90">• {c}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* recommended build */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
          <Rocket className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {data.recommended_build.title}
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="muted">{data.recommended_build.target_workflow}</Badge>
          <Badge tone="warning">{data.recommended_build.target_workflow_status}</Badge>
        </div>
        <Card className="mb-3"><CardContent className="p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current shape of the draft</div>
          <p className="text-sm text-foreground/90">{data.recommended_build.current_shape}</p>
        </CardContent></Card>

        <div className="mb-3 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recommended_build.proposed_steps.map((s, i) => (
                <tr key={i} className={String(s.order).includes("a") || String(s.order).includes("b") ? "bg-muted/20" : ""}>
                  <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs text-muted-foreground">{s.order}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-top font-medium">
                    <span className="inline-flex items-center gap-1"><ArrowRight className="h-3 w-3 text-muted-foreground" />{s.action}</span>
                  </td>
                  <td className="px-3 py-2 align-top text-foreground/90">{s.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Fields/tags reused:</span>
          {data.recommended_build.fields_and_tags_reused.map((f) => <Badge key={f} tone="muted">{f}</Badge>)}
        </div>

        <Card className="mb-3 border-l-4 border-l-amber-500"><CardContent className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Compliance notes
          </div>
          <ul className="space-y-1.5">
            {data.recommended_build.compliance_notes.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-foreground/90">{c}</span>
              </li>
            ))}
          </ul>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <ListOrdered className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Rollout plan
          </div>
          <ol className="space-y-1.5">
            {data.recommended_build.rollout_plan.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{r.replace(/^\d+\.\s*/, "")}</span>
              </li>
            ))}
          </ol>
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
