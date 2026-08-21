import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge } from "../components/ui";
import { ArrowRight, Lock, Zap, Workflow, Radar } from "lucide-react";

/* Home is the operate-mode landing.
   Two problems, the lock (Force + Curve + one WF per job), and the
   cutover ladder, visible without scrolling past a manifesto. No
   invented numbers. Everything else lives one click deep. */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70">{title}</h2>
      {children}
    </section>
  );
}

function ProblemCard({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <Card className="card-lift">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-foreground">{n}</span>
          <h3 className="font-bold leading-tight text-foreground">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{body}</p>
      </CardContent>
    </Card>
  );
}

function LockCard({ icon: Icon, title, body }: { icon: any; title: string; body: React.ReactNode }) {
  return (
    <Card className="card-lift">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" aria-hidden />
          <div className="text-sm font-bold text-foreground">{title}</div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85">{body}</p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <PageShell
      title="MWC GHL Refactor · locked v2 spec"
      subtitle="Native GHL v2 rebuild. Force writes outcomes and dollars. Curve owns attribution. 16 single-purpose workflows, drafts unpublished. This site is the spec; it is not a publish."
      actions={
        <>
          <Link
            to="/to-be"
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Workflow className="h-3.5 w-3.5" /> Target
          </Link>
          <Link
            to="/force"
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Force <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      <Section title="The two problems this fixes">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ProblemCard
            n={1}
            title="Deals are dispositioned on the contact, not the opportunity"
            body={
              <>
                Sale outcome and price land on the contact, so every new consult overwrites the last and the opportunity stays empty. Revenue cannot roll up per deal, clinic, or rep.
              </>
            }
          />
          <ProblemCard
            n={2}
            title="Attribution is never carried to win or loss"
            body={
              <>
                Ad source, UTM, and click IDs live on the contact and overwrite per touch. Nothing ties spend to won revenue. Curve owns that closed loop, not GHL.
              </>
            }
          />
        </div>
      </Section>

      <Section title="The lock">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <LockCard
            icon={Zap}
            title="Force writes outcomes"
            body={
              <>
                <Link to="/force" className="font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-2 hover:decoration-foreground">Force</Link> is the sole writer of{" "}
                <code className="rounded bg-muted px-1 text-[11px]">sale_outcome</code>,{" "}
                <code className="rounded bg-muted px-1 text-[11px]">sale_type</code>,{" "}
                <code className="rounded bg-muted px-1 text-[11px]">appt_status</code>, and dollars on the opportunity. Workflows never move Sales stages.
              </>
            }
          />
          <LockCard
            icon={Radar}
            title="Curve owns attribution"
            body={
              <>
                Attribution owner is{" "}
                <a href="https://curvecompliance.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-2 hover:decoration-foreground">Curve</a>. GHL keeps only coarse ops source (<code className="rounded bg-muted px-1 text-[11px]">next-lander</code> vs <code className="rounded bg-muted px-1 text-[11px]">wordpress-form</code>) and clinic slug. No GHL workflow POSTs to Curve; no CAPI fires from GHL.
              </>
            }
          />
          <LockCard
            icon={Workflow}
            title="One workflow per job"
            body={
              <>
                16 live workflows (WF-01 to WF-17; WF-13 dropped). Native GHL only. Drafts live on staging; nothing publishes until Curve is live, then GHL.
              </>
            }
          />
        </div>
      </Section>

      <Section title="Cutover sequence">
        <Card>
          <CardContent className="p-4">
            <ol className="space-y-2">
              <li className="flex gap-3 rounded-sm border-2 border-border bg-card p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-foreground">1</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-foreground">Curve goes live first</span>
                    <Badge tone="good">next week</Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground/85">
                    Booking app fires <code className="rounded bg-muted px-1 text-[11px]">lead</code> and <code className="rounded bg-muted px-1 text-[11px]">booked</code>. Force fires <code className="rounded bg-muted px-1 text-[11px]">SOLD</code>. GHL workflows do not POST to Curve.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-sm border-2 border-border bg-card p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-foreground text-xs font-bold text-background">2</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-foreground">Publish new GHL folder</span>
                    <Badge tone="neutral">after Curve</Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground/85">
                    Drafts stay unpublished until step 1 is verified. See the{" "}
                    <Link to="/force" className="font-semibold underline decoration-accent decoration-2 underline-offset-2 hover:decoration-foreground">Force contract</Link>.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </Section>

      <Section title="Where to go">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link to="/to-be" className="group block">
            <Card className="card-lift h-full">
              <CardContent className="p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-foreground/70" />
                  <span className="text-base font-bold text-foreground">Target · locked v2</span>
                  <ArrowRight className="ms-auto h-4 w-4 text-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-sm text-foreground/85">
                  16 workflows, one job each. Cards to build guides. Diagrams first.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/force" className="group block">
            <Card className="card-lift h-full">
              <CardContent className="p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="text-base font-bold text-foreground">Force · consult writer</span>
                  <ArrowRight className="ms-auto h-4 w-4 text-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-sm text-foreground/85">
                  Writes, no-writes, cutover ladder, conversion events.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </Section>

      <div className="rounded-sm border-2 border-border bg-muted/40 p-3 text-xs text-foreground/85">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Lock className="h-3.5 w-3.5 text-accent" /> Native GHL only.
        </span>{" "}
        No custom code, no new backends. Clinics: <code className="rounded bg-card px-1 text-[11px]">richmond</code>, <code className="rounded bg-card px-1 text-[11px]">virginia-beach</code>, <code className="rounded bg-card px-1 text-[11px]">newport-news</code>. Address is a string. No maps. Members not patients.
      </div>
    </PageShell>
  );
}
