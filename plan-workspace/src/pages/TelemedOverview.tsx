import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";
import { Link } from "react-router-dom";
import { Globe, ShieldCheck, Lock, ExternalLink } from "lucide-react";

export default function TelemedOverview() {
  const { data, isLoading } = useTelemed();
  if (isLoading || !data) return <Loading />;
  const o = data.overview;

  return (
    <PageShell
      title="Virginia Online — Telehealth as the 4th MWC Location"
      subtitle={data.meta.subtitle}
      actions={<Badge tone="blue">30-day test</Badge>}
    >
      {/* Concept */}
      <Card className="border-l-4 border-l-sky-500">
        <CardContent className="p-4 text-sm text-foreground/90">
          <div className="mb-1 flex items-center gap-2 font-semibold"><Globe className="h-4 w-4 text-sky-500" /> The concept</div>
          {o.concept}
        </CardContent>
      </Card>

      {/* Brand voice */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4 text-sm">
          <span className="font-semibold">Brand voice — </span>
          <span className="text-muted-foreground">{data.meta.brand_voice}</span>
        </CardContent>
      </Card>

      {/* Principles */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Operating principles</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {o.principles.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Domains */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Domain mapping</h2>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where</th>
              </tr></thead>
              <tbody>
                {o.domains.map((d) => (
                  <tr key={d.domain} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs">{d.domain}</td>
                    <td className="px-3 py-2">{d.purpose}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </section>

      {/* Carve-out */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Carve-out contract — one sub-account, two workstreams</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-l-4 border-l-violet-500"><CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-violet-500" /> Owned by the [ONLINE] workstream</div>
            <ul className="space-y-1 text-sm text-foreground/90">
              {o.carveout_owned.map((c, i) => <li key={i} className="flex gap-2"><span className="text-violet-500">•</span>{c}</li>)}
            </ul>
          </CardContent></Card>
          <Card className="border-l-4 border-l-slate-400"><CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-slate-400" /> Shared — coordinate before changing</div>
            <ul className="space-y-1 text-sm text-foreground/90">
              {o.carveout_shared.map((c, i) => <li key={i} className="flex gap-2"><span className="text-slate-400">•</span>{c}</li>)}
            </ul>
          </CardContent></Card>
        </div>
      </section>

      {/* Role */}
      <section>
        <h2 className="mb-2 text-base font-semibold">[ONLINE] Editor role</h2>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {o.roles.map((r) => (
                  <tr key={r.permission} className="border-b">
                    <td className="px-3 py-2 font-medium w-1/3">{r.permission}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.setting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </section>

      {/* Day 30 */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Day-30 decision</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {o.day30_decisions.map((d, i) => (
            <Card key={d.name} className={i === 1 ? "border-emerald-400 dark:border-emerald-700" : ""}>
              <CardContent className="p-4">
                <div className="text-sm font-bold">{d.name}{i === 1 && <Badge tone="good" className="ml-2">likely</Badge>}</div>
                <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="font-semibold">Decision dataset: </span>
          <span className="text-muted-foreground">{o.day30_metrics.join(" · ")}</span>
        </div>
      </section>

      {/* Out of scope */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Out of scope for the 30-day test</h2>
        <div className="flex flex-wrap gap-2">
          {o.out_of_scope.map((s, i) => <span key={i} className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">{s}</span>)}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Link to="/telemed/workflows" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Workflows <ExternalLink className="h-3.5 w-3.5" /></Link>
        <Link to="/telemed/portal" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">Membership Portal & App</Link>
        <Link to="/telemed/ghl" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">GHL Feature Map</Link>
        <Link to="/telemed/plan" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">Build Plan</Link>
      </div>
    </PageShell>
  );
}
