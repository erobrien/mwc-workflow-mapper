import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { MermaidChart } from "../components/MermaidChart";
import { useData } from "../lib/data";
import {
  ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, ChevronDown,
} from "lucide-react";

/* ---------- Types (matches build_tobe_v2_detail.py output) ------------------ */

interface Branch { label: string; condition: string; path: string; }
interface Step { order: number; action: string; name: string; config: string; branches?: Branch[]; }
interface Message { step: string; channel: string; body: string; }
interface TriggerSetup { type: string; filters: string[]; target: string; }
interface Settings { quiet_hours: string; allow_reentry: string; stop_on_response: string; reentry_caveat: string; status: string; }
interface WFMethod { name: string; detail: string; }
interface Variables {
  principle: string;
  location_variable: string;
  collision_warning?: string;
  methods?: WFMethod[];
  custom_values: string[];
}
interface WFDetail {
  purpose: string; diagram_key: string; trigger: TriggerSetup;
  prerequisites: string[]; steps: Step[]; messages: Message[];
  settings: Settings; test: string[]; depends_on: string[]; variables?: Variables;
}
interface Diagram { key: string; title: string; caption: string; src: string; }

/* Shared-diagram footnotes so the reader knows when a graph covers >1 workflow. */
const DIAGRAM_SHARED: Record<string, string> = {
  preappt: "Shared diagram: covers WF-03 and WF-04 together (the pre-appointment sequence).",
  "wf07-08": "Shared diagram: covers WF-07 (A&D Nurture) and WF-08 (No-Show and Cancel Recovery).",
  retention: "Shared diagram: covers WF-09 (Long-Term Nurture + Renewal sub-flow) and WF-10 (Feedback Survey).",
  support: "Shared diagram: covers the support cluster: WF-11, WF-14, WF-15, WF-16 (WF-13 dropped from v2).",
};

/* Workflows dropped from v2. Kept in tobe-detail.json for generator compatibility. */
const DROPPED_FROM_V2 = new Set<string>(["13"]);

/* ---------- Action -> short type chip (used on step timeline + chip strip) --- */

type ActionKind =
  | "SMS" | "EMAIL" | "WAIT" | "IF" | "PATH" | "UPDATE" | "CREATE"
  | "TAG" | "ADD-TO-WF" | "REMOVE" | "FIND-OPP" | "TRIGGER" | "STEP";

function actionKind(a: string, name?: string): ActionKind {
  const s = (a || "").toLowerCase();
  const n = (name || "").toUpperCase();
  if (s.includes("send sms") || n.startsWith("SMS:")) return "SMS";
  if (s.includes("send email") || n.startsWith("EMAIL:")) return "EMAIL";
  if (s === "wait" || n.startsWith("WAIT:")) return "WAIT";
  if (s === "if" || n.startsWith("IF:")) return "IF";
  if (s === "path" || n.startsWith("PATH:")) return "PATH";
  if (s.includes("update") || n.startsWith("UPDATE:")) return "UPDATE";
  if (s.includes("create") || n.startsWith("CREATE:")) return "CREATE";
  if (s.includes("add contact tag") || n.startsWith("TAG:")) return "TAG";
  if (s.includes("add to workflow") || s === "add" || n.startsWith("ADD:")) return "ADD-TO-WF";
  if (s.includes("remove from workflow") || n.startsWith("REMOVE:")) return "REMOVE";
  if (s.includes("find opportunity") || n.startsWith("FIND-OPP")) return "FIND-OPP";
  if (s === "trigger" || n.startsWith("TRIGGER")) return "TRIGGER";
  return "STEP";
}

const KIND_TONE: Record<ActionKind, "good" | "purple" | "blue" | "muted" | "warning" | "accent" | "neutral" | "red"> = {
  SMS: "good", EMAIL: "purple", WAIT: "muted", IF: "warning", PATH: "neutral",
  UPDATE: "blue", CREATE: "accent", TAG: "blue", "ADD-TO-WF": "accent",
  REMOVE: "red", "FIND-OPP": "warning", TRIGGER: "accent", STEP: "muted",
};

/* ---------- Chip helpers (mirror /to-be card chips exactly) ----------------- */

function countKind(steps: Step[], kind: ActionKind): number {
  return steps.filter((s) => actionKind(s.action, s.name) === kind).length;
}

function shortTrigger(t: string | undefined): string | null {
  if (!t) return null;
  return t.split(" (")[0].trim();
}

function quietHoursChip(q: string | undefined): { label: string; tone: "good" | "warning" | "muted" | "blue" } | null {
  if (!q) return null;
  const s = q.toLowerCase();
  if (s.startsWith("n/a") || s.includes("no sms")) return { label: "Quiet: n/a", tone: "muted" };
  if (s.startsWith("none")) return { label: "No quiet hours (transactional)", tone: "good" };
  if (s.includes("08:00-21:00") || s.includes("8:00-21:00") || s.includes("8am")) {
    return { label: "8am–9pm quiet hours", tone: "warning" };
  }
  return { label: "Quiet hours set", tone: "blue" };
}

function draftChip(status: string | undefined): string | null {
  if (!status) return null;
  const m = status.match(/^(Draft v\d+)/i);
  return m ? m[1] : null;
}

/* ---------- Small inline highlighter for BUILD DECISION NEEDED --------------- */

function BuildDecision({ text }: { text: string }) {
  const parts = text.split(/(BUILD DECISION NEEDED[^.]*\.?)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("BUILD DECISION NEEDED") ? (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300"
          >
            <AlertTriangle className="h-3 w-3" /> {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/* ---------- Section title ---------------------------------------------------- */

function SectionTitle({ title, count, right }: { title: string; count?: number; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground/70">{title}</h2>
      {count != null && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground/80">{count}</span>
      )}
      {right && <div className="ms-auto">{right}</div>}
    </div>
  );
}

/* ---------- Collapsible ------------------------------------------------------ */

function Collapsible({
  summary, defaultOpen = false, children,
}: { summary: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-sm border-2 border-border bg-muted/40 px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
        aria-expanded={open}
      >
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="min-w-0 flex-1">{summary}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

/* ---------- Timeline row ----------------------------------------------------- */

function StepRow({ s }: { s: Step }) {
  const kind = actionKind(s.action, s.name);
  const displayName = s.name.replace(/^([A-Z-]+):\s*/, ""); // strip leading TYPE: since we show it as a chip
  return (
    <li className="grid grid-cols-[36px_88px_1fr] items-start gap-3 border-b border-border/60 py-2 last:border-b-0">
      <span className="mt-0.5 inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-[11px] font-semibold text-foreground/80">
        {s.order}
      </span>
      <span className="mt-0.5 inline-flex items-center">
        <Badge tone={KIND_TONE[kind]} className="!rounded-sm font-mono">{kind}</Badge>
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[12.5px] font-semibold leading-snug text-foreground">
          {displayName}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/85">
          <BuildDecision text={s.config} />
        </p>
        {s.branches && s.branches.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {s.branches.map((b, i) => (
              <li
                key={i}
                className="rounded-sm border border-border bg-muted/40 px-2 py-1 text-[12px] text-foreground/85"
              >
                <span className="font-semibold">{b.label}</span>
                <span className="text-muted-foreground"> · if {b.condition} → {b.path}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/* ============================================================================ */
/*                                 Component                                    */
/* ============================================================================ */

export default function ToBeWorkflow() {
  const { n } = useParams<{ n: string }>();
  const { data, isLoading } = useData();
  const [detail, setDetail] = useState<Record<string, WFDetail> | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null);

  useEffect(() => {
    fetch("/tobe-detail.json").then((r) => r.json()).then((d) => setDetail(d.workflows)).catch(() => setDetail({}));
    fetch("/wf-diagrams.json").then((r) => r.json()).then(setDiagrams).catch(() => setDiagrams([]));
  }, []);

  const d = detail && n ? detail[n] : undefined;

  // Chip strip (identical language to the /to-be card grid). Must run
  // before any early return to satisfy the rules of hooks.
  const chips = useMemo(() => {
    const list: { label: string; tone: "good" | "warning" | "red" | "blue" | "muted" | "purple" | "accent" | "neutral" }[] = [];
    if (!d) return list;
    const trig = shortTrigger(d.trigger?.type);
    if (trig) list.push({ label: trig, tone: "blue" });
    const sms = countKind(d.steps, "SMS");
    const email = countKind(d.steps, "EMAIL");
    list.push({ label: `${sms} SMS`, tone: sms > 0 ? "good" : "muted" });
    list.push({ label: `${email} email`, tone: email > 0 ? "purple" : "muted" });
    list.push({ label: `${d.steps.length} steps`, tone: "muted" });
    const qh = quietHoursChip(d.settings?.quiet_hours);
    if (qh) list.push(qh);
    const draft = draftChip(d.settings?.status);
    if (draft) list.push({ label: draft, tone: "accent" });
    return list;
  }, [d]);

  if (isLoading || !data || !detail) return <Loading />;

  // WF-13 dropped-from-v2 page stays as a clear "dropped" notice.
  if (n && DROPPED_FROM_V2.has(n)) {
    return (
      <PageShell
        title={`WF-${n} — dropped from v2`}
        subtitle="This workflow is not part of the v2 shipping scope. WF-14 through WF-17 keep their numbers."
        actions={
          <Link
            to="/to-be"
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All workflows
          </Link>
        }
      >
        <Card><CardContent className="p-4 space-y-3 text-sm text-foreground/90">
          <p>
            <b>WF-{n} (Ad-platform CAPI + Google Ads conversions)</b> was dropped from the
            locked v2 spec. Ad-platform conversion firing is not part of the v2 GHL native
            rebuild. The upstream router (WF-05) no longer routes SOLD + new to WF-{n};
            it just hands SOLD + new to WF-06 Onboarding. WF-14 through WF-17 keep their
            existing numbers on purpose so downstream references stay stable.
          </p>
          <p className="text-muted-foreground">
            The <code className="rounded bg-muted px-1">to-be/wf-{n}.json</code> file is
            retained in the repo so <code className="rounded bg-muted px-1">build_tobe_v2_detail.py</code>
            can keep regenerating <code className="rounded bg-muted px-1">tobe-detail.json</code>,
            but this URL is intentionally not a live workflow build guide.
          </p>
          <div>
            <Link to="/to-be" className="text-sm font-semibold text-primary hover:underline">
              ← Back to the 16 live workflows
            </Link>
          </div>
        </CardContent></Card>
      </PageShell>
    );
  }

  const wf = data.tobe_workflows.find((w) => w.n === n);
  if (!wf || !d) {
    return (
      <PageShell title="Workflow not found" subtitle="No such to-be workflow.">
        <Link to="/to-be" className="text-sm text-primary hover:underline">Back to Target</Link>
      </PageShell>
    );
  }

  const nums = data.tobe_workflows.map((w) => w.n);
  const idx = nums.indexOf(n!);
  const prev = idx > 0 ? data.tobe_workflows[idx - 1] : null;
  const next = idx < nums.length - 1 ? data.tobe_workflows[idx + 1] : null;
  const dia = diagrams?.find((x) => x.key === d.diagram_key);

  return (
    <PageShell
      title={`WF-${wf.n} · ${wf.name}`}
      subtitle={d.purpose}
      actions={
        <Link
          to="/to-be"
          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All workflows
        </Link>
      }
    >
      <div className="space-y-4">
        {/* --- Sticky compact header: chips + prev/next --------------------- */}
        <div className="sticky top-14 z-20 -mx-4 border-b-2 border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c, i) => <Badge key={i} tone={c.tone}>{c.label}</Badge>)}
            <div className="ms-auto flex items-center gap-1">
              {prev ? (
                <Link
                  to={`/to-be/wf/${prev.n}`}
                  className="inline-flex items-center gap-1 rounded-sm border-2 border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                  title={`WF-${prev.n} ${prev.name}`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WF-{prev.n}</span>
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  to={`/to-be/wf/${next.n}`}
                  className="inline-flex items-center gap-1 rounded-sm border-2 border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                  title={`WF-${next.n} ${next.name}`}
                >
                  <span className="hidden sm:inline">WF-{next.n}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : <span />}
            </div>
          </div>
        </div>

        {/* --- Flow diagram FIRST (efficiency win) -------------------------- */}
        {dia ? (
          <section>
            <SectionTitle
              title="Flow"
              right={
                <span className="text-[11px] font-medium text-muted-foreground">
                  {dia.title}
                </span>
              }
            />
            <Card>
              <CardContent className="p-4">
                {DIAGRAM_SHARED[d.diagram_key] && (
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {DIAGRAM_SHARED[d.diagram_key]}
                  </p>
                )}
                <MermaidChart src={dia.src} active zoomable />
                {dia.caption && (
                  <p className="mt-3 text-xs text-foreground/80">{dia.caption}</p>
                )}
              </CardContent>
            </Card>
          </section>
        ) : (
          d.diagram_key && (
            <Card><CardContent className="p-3 text-xs text-muted-foreground">
              Flow diagram <code className="rounded bg-muted px-1">{d.diagram_key}</code> not yet published.
            </CardContent></Card>
          )
        )}

        {/* --- Trigger + prerequisites + depends-on strip ------------------- */}
        <section>
          <SectionTitle title="Trigger and preconditions" />
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GHL trigger</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{d.trigger.type}</div>
                  {d.trigger.filters.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-foreground/85">
                      {d.trigger.filters.map((f, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground">·</span><span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Point at</div>
                  <p className="mt-0.5 text-[12.5px] text-foreground/85">
                    <BuildDecision text={d.trigger.target} />
                  </p>
                </div>
              </div>

              {(d.prerequisites?.length > 0 || d.depends_on?.length > 0) && (
                <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  {d.prerequisites?.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Prerequisites ({d.prerequisites.length})
                      </div>
                      <ul className="mt-1 space-y-1 text-[12.5px] text-foreground/85">
                        {d.prerequisites.map((p, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-muted-foreground">·</span>
                            <span><BuildDecision text={p} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.depends_on?.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Depends on</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {d.depends_on.map((x, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-sm border-2 border-border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-foreground/80"
                          >
                            {x}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* --- Message content: member-facing SMS/email --------------------- */}
        {d.messages && d.messages.length > 0 && d.messages[0].channel !== "n/a" && (
          <section>
            <SectionTitle title="Member-facing copy" count={d.messages.length} />
            <div className="grid gap-2 md:grid-cols-2">
              {d.messages.map((m, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone={m.channel.toLowerCase() === "sms" ? "good" : "purple"} className="!rounded-sm font-mono">
                        {m.channel.toUpperCase()}
                      </Badge>
                      <span className="truncate text-[11px] font-semibold text-muted-foreground">{m.step}</span>
                    </div>
                    <p className="whitespace-pre-wrap rounded-sm border border-border bg-muted/40 p-2 text-[12.5px] leading-snug text-foreground/90">
                      <BuildDecision text={m.body} />
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
        {d.messages && d.messages.length > 0 && d.messages[0].channel === "n/a" && (
          <section>
            <SectionTitle title="Messaging" />
            <Card><CardContent className="p-3 text-[12.5px] text-foreground/80">
              {d.messages[0].body}
            </CardContent></Card>
          </section>
        )}

        {/* --- Build steps timeline ---------------------------------------- */}
        <section>
          <SectionTitle title="Build steps" count={d.steps.length} />
          <Card>
            <CardContent className="p-3">
              <ul>
                {d.steps.map((s) => <StepRow key={s.order} s={s} />)}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* --- Location / variables — one short callout + collapsed "why" --- */}
        {d.variables && (
          <section>
            <SectionTitle title="Location and variables" />
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-[12.5px] leading-snug text-foreground/90">
                  Clinic is a static variable. Slugs are{" "}
                  <code className="rounded bg-muted px-1 text-[11.5px]">richmond</code>,{" "}
                  <code className="rounded bg-muted px-1 text-[11.5px]">virginia-beach</code>,{" "}
                  <code className="rounded bg-muted px-1 text-[11.5px]">newport-news</code>. Method 2
                  stamps four <code className="rounded bg-muted px-1 text-[11.5px]">current_clinic_*</code>{" "}
                  fields on the Contact once, in WF-01 only. Address is a plain string; no map integration.
                </p>
                <div className="text-[12px] text-foreground/80">
                  Display label:{" "}
                  <code className="rounded bg-muted px-1 text-[11.5px]">opportunity.location</code>{" "}
                  {d.variables.location_variable.replace(/^opportunity\.location\s*/, "")}
                </div>
                {d.variables.collision_warning && (
                  <div className="rounded-sm border-l-4 border-red-500 bg-red-50/70 p-2 text-[12px] text-red-900 dark:bg-red-950/40 dark:text-red-200">
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="h-3 w-3" /> Custom Value collision risk
                    </div>
                    {d.variables.collision_warning}
                  </div>
                )}
                <Collapsible summary="Why Method 2 (per-clinic patterns and custom-value collision detail)">
                  <div className="space-y-2 rounded-sm border-2 border-border bg-card p-3">
                    <p className="text-[12.5px] text-foreground/85">{d.variables.principle}</p>
                    {d.variables.methods && d.variables.methods.length > 0 && (
                      <div className="space-y-1.5">
                        {d.variables.methods.map((m, i) => (
                          <div key={i} className="rounded-sm border border-border bg-muted/30 p-2">
                            <div className="text-[12px] font-semibold">{m.name}</div>
                            <p className="text-[12px] text-foreground/85">{m.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {d.variables.custom_values && d.variables.custom_values.length > 0 && (
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Custom values: safe vs collision
                        </div>
                        <ul className="space-y-1 text-[12px] text-foreground/85">
                          {d.variables.custom_values.map((c, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-muted-foreground">·</span><span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Collapsible>
              </CardContent>
            </Card>
          </section>
        )}

        {/* --- Settings + tests + writer guardrail --------------------------- */}
        <section>
          <SectionTitle title="Settings, tests, guardrails" />
          <Card>
            <CardContent className="p-3 space-y-3">
              <dl className="grid gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quiet hours</dt>
                  <dd className="text-foreground/90">{d.settings.quiet_hours}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Allow re-entry</dt>
                  <dd className="text-foreground/90">{d.settings.allow_reentry}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stop on response</dt>
                  <dd className="text-foreground/90">{d.settings.stop_on_response}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Re-entry caveat</dt>
                  <dd className="text-foreground/90">{d.settings.reentry_caveat}</dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</dt>
                  <dd className="font-medium text-amber-700 dark:text-amber-400">{d.settings.status}</dd>
                </div>
              </dl>

              {d.test && d.test.length > 0 && (
                <div className="border-t border-border pt-2">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Test / acceptance ({d.test.length})
                  </div>
                  <ul className="space-y-1 text-[12.5px]">
                    {d.test.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <input type="checkbox" className="mt-1 shrink-0" readOnly />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-border pt-2 text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground/85">Writer guardrail:</span>{" "}
                Force is the sole writer of <code className="rounded bg-muted px-1 text-[11.5px]">sale_outcome</code>,{" "}
                <code className="rounded bg-muted px-1 text-[11.5px]">sale_type</code>,{" "}
                <code className="rounded bg-muted px-1 text-[11.5px]">appt_status</code>, and dollars. Workflows
                never move Sales stages. Curve owns attribution; GHL never POSTs to Curve. WF-13 dropped from v2.
              </div>

              {wf.absorbs && (
                <div className="border-t border-border pt-2 text-[11.5px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Absorbs (as-is):</span> {wf.absorbs}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* --- Footer prev/next (mirror of sticky top) ---------------------- */}
        <div className="flex items-center justify-between border-t-2 border-border pt-3">
          {prev ? (
            <Link
              to={`/to-be/wf/${prev.n}`}
              className="inline-flex items-center gap-1 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> WF-{prev.n} {prev.name}
            </Link>
          ) : <span />}
          {next ? (
            <Link
              to={`/to-be/wf/${next.n}`}
              className="inline-flex items-center gap-1 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              WF-{next.n} {next.name} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : <span />}
        </div>
      </div>
    </PageShell>
  );
}
