import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";
import { Check, X, Sparkles, Smartphone } from "lucide-react";

export default function TelemedPortal() {
  const { data, isLoading } = useTelemed();
  if (isLoading || !data) return <Loading />;
  const p = data.portal_app;

  return (
    <PageShell
      title="Membership portal & app"
      subtitle="The biggest area the build doc leaves open. GHL now ships a native member portal, memberships/courses, and a white-label app — enough for the 30-day test without custom code. A custom or white-label platform is the scale path."
    >
      <Card className="border-l-4 border-l-violet-500"><CardContent className="p-4 text-sm text-foreground/90">{p.intro}</CardContent></Card>

      {/* Options */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Options compared</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {p.options.map((opt) => {
            const recommended = /30-day test/i.test(opt.fit);
            return (
              <Card key={opt.name} className={recommended ? "border-emerald-400 dark:border-emerald-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{opt.name}</div>
                    {recommended && <Badge tone="good">test pick</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{opt.what}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      {opt.pros.map((pr, i) => <div key={i} className="flex items-start gap-1.5 text-xs"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /><span>{pr}</span></div>)}
                    </div>
                    <div>
                      {opt.cons.map((cn, i) => <div key={i} className="flex items-start gap-1.5 text-xs"><X className="mt-0.5 h-3 w-3 shrink-0 text-red-500" /><span>{cn}</span></div>)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5"><span className="text-muted-foreground">Cost: </span>{opt.cost}</span>
                    <span className="rounded bg-muted px-2 py-0.5"><span className="text-muted-foreground">Fit: </span>{opt.fit}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recommendation */}
      <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4">
        <div className="mb-1 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-emerald-500" /> Recommendation</div>
        <p className="text-sm text-foreground/90">{p.recommendation}</p>
      </CardContent></Card>

      {/* Member features */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Member-facing features &amp; where they live</h2>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40">Native home</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
              </tr></thead>
              <tbody>
                {p.member_features.map((f) => (
                  <tr key={f.feature} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium align-top">{f.feature}</td>
                    <td className="px-3 py-2 align-top"><Badge tone="blue">{f.native}</Badge></td>
                    <td className="px-3 py-2 align-top text-foreground/90">{f.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </section>

      {/* Native setup */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold"><Smartphone className="h-4 w-4" /> Native setup checklist (recommended path)</h2>
        <Card><CardContent className="p-4">
          <ol className="space-y-2 text-sm">
            {p.native_setup.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </CardContent></Card>
      </section>
    </PageShell>
  );
}
