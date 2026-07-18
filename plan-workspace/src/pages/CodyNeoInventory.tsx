import { useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Badge, Card, CardContent, Stat, Loading } from "../components/ui";
import { useCodyNeoInventory } from "../lib/cody";
import { Database, Tag, Waypoints, ClipboardList, CalendarCheck, Braces } from "lucide-react";

export default function CodyNeoInventory() {
  const { data, isLoading } = useCodyNeoInventory();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"fields" | "tags" | "pipelines" | "values" | "calendars" | "forms">("fields");

  const t = q.trim().toLowerCase();
  const fields = useMemo(() => (data?.fields ?? []).filter((f) =>
    !t || f.name.toLowerCase().includes(t) || f.key.toLowerCase().includes(t)), [data, t]);
  const tags = useMemo(() => (data?.tags ?? []).filter((x) => !t || x.toLowerCase().includes(t)), [data, t]);
  const values = useMemo(() => (data?.custom_values ?? []).filter((v) =>
    !t || v.name.toLowerCase().includes(t) || v.key.toLowerCase().includes(t)), [data, t]);
  const forms = useMemo(() => (data?.forms ?? []).filter((f) => !t || f.name.toLowerCase().includes(t)), [data, t]);

  if (isLoading || !data) return <Loading />;

  const TABS: { id: typeof tab; label: string; icon: any; n: number }[] = [
    { id: "fields", label: "Custom fields", icon: Database, n: data.fields.length },
    { id: "tags", label: "Tags", icon: Tag, n: data.tags.length },
    { id: "pipelines", label: "Pipelines", icon: Waypoints, n: data.pipelines.length },
    { id: "values", label: "Custom values", icon: Braces, n: data.custom_values.length },
    { id: "calendars", label: "Calendars", icon: CalendarCheck, n: data.calendars.length },
    { id: "forms", label: "Forms", icon: ClipboardList, n: data.forms.length },
  ];
  const contactOnly = data.fields.every((f) => f.model === "contact");

  return (
    <PageShell
      title="Cody Neo build — inventory"
      subtitle={`Fields, tags, pipelines, custom values, calendars, and forms captured live from the corrected copy (${data.location_id}) after the field-architecture pass. Fields in the "zz Deprecated" group are per-deal contact fields superseded by opportunity fields.`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {TABS.map((x) => <Stat key={x.id} label={x.label} value={x.n} />)}
      </div>

      {contactOnly && (
        <div className="rounded-md border border-l-4 border-l-amber-500 bg-card p-3 text-sm text-muted-foreground">
          All {data.fields.length} custom fields are on the <b className="text-foreground">Contact</b> — none on the Opportunity. This repeats the current-state structural defect (D2: outcomes overwrite per person, not per deal) that the Target field model corrects, and does not meet the opportunity-owned outcome contract (sale_outcome, sale_type, frozen attribution stamp).
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((x) => (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${tab === x.id ? "bg-muted font-semibold" : "hover:bg-muted/60"}`}>
              <x.icon className="h-3.5 w-3.5" />{x.label} <Badge tone="muted">{x.n}</Badge>
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…"
          className="ms-auto w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {tab === "fields" && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Type</th><th className="px-3 py-2">Model</th>
            </tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5">{f.name}</td>
                  <td className="px-3 py-1.5 break-all font-mono text-xs text-muted-foreground">{f.key}</td>
                  <td className="px-3 py-1.5 text-xs">{f.dataType}</td>
                  <td className="px-3 py-1.5"><Badge tone={f.model === "opportunity" ? "good" : "muted"}>{f.model}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {fields.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No fields match.</div>}
        </CardContent></Card>
      )}

      {tab === "tags" && (
        <Card><CardContent className="flex flex-wrap gap-1.5 p-3">
          {tags.map((x) => <span key={x} className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">{x}</span>)}
          {tags.length === 0 && <div className="w-full p-4 text-center text-sm text-muted-foreground">No tags match.</div>}
        </CardContent></Card>
      )}

      {tab === "pipelines" && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.pipelines.map((p) => (
            <Card key={p.name}><CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Waypoints className="h-4 w-4 text-sky-600" />{p.name}<Badge tone="muted">{p.stages.length} stages</Badge></div>
              <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                {p.stages.map((s, i) => <li key={i} className="flex gap-2"><span className="w-5 shrink-0 text-right tabular-nums text-xs text-muted-foreground/70">{i + 1}.</span>{s}</li>)}
              </ol>
            </CardContent></Card>
          ))}
        </div>
      )}

      {tab === "values" && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Key</th>
            </tr></thead>
            <tbody>
              {values.map((v) => (
                <tr key={v.key || v.name} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5">{v.name}</td>
                  <td className="px-3 py-1.5 break-all font-mono text-xs text-muted-foreground">{v.key}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {values.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No custom values match.</div>}
        </CardContent></Card>
      )}

      {tab === "calendars" && (
        <div className="grid gap-2 md:grid-cols-3">
          {data.calendars.map((c) => (
            <Card key={c.id}><CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><CalendarCheck className="h-4 w-4 text-sky-600" />{c.name}</div>
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{c.id}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {tab === "forms" && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Form</th><th className="px-3 py-2">ID</th>
            </tr></thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5">{f.name}</td>
                  <td className="px-3 py-1.5 break-all font-mono text-xs text-muted-foreground">{f.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {forms.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No forms match.</div>}
        </CardContent></Card>
      )}
    </PageShell>
  );
}
