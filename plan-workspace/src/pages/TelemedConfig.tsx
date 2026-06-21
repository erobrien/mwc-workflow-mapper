import { PageShell } from "../components/Shell";
import { Card, CardContent, Tabs, TabPanel, Badge, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";

const TABS = [
  { value: "fields", label: "Custom Fields" },
  { value: "tags", label: "Tags" },
  { value: "calendars", label: "Calendars" },
  { value: "forms", label: "Forms" },
  { value: "pipelines", label: "Pipelines" },
  { value: "links", label: "Trigger Links & Comms" },
];

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export default function TelemedConfig() {
  const { data, isLoading } = useTelemed();
  if (isLoading || !data) return <Loading />;

  return (
    <PageShell
      title="Build configuration"
      subtitle="Custom fields, tags, calendars, forms, pipelines, and links for the Virginia Online channel. Everything namespaced online_* / mwc-online-* / [ONLINE] for the carve-out."
    >
      <Tabs tabs={TABS} initial="fields">
        {/* FIELDS */}
        <TabPanel value="fields" className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Contact custom fields ({data.custom_fields.contact.length})</h3>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className={th}>Field</th><th className={th}>Type</th><th className={th}>Set</th><th className={th}>Notes</th></tr></thead>
              <tbody>{data.custom_fields.contact.map((f) => (
                <tr key={f.name} className="border-b"><td className="px-3 py-1.5 font-mono text-xs">{f.name}</td><td className="px-3 py-1.5 text-xs">{f.type}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{f.req}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{f.notes}</td></tr>
              ))}</tbody>
            </table></div></CardContent></Card>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Appointment custom fields ({data.custom_fields.appointment.length})</h3>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className={th}>Field</th><th className={th}>Type</th><th className={th}>Notes</th></tr></thead>
              <tbody>{data.custom_fields.appointment.map((f) => (
                <tr key={f.name} className="border-b"><td className="px-3 py-1.5 font-mono text-xs">{f.name}</td><td className="px-3 py-1.5 text-xs">{f.type}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{f.notes}</td></tr>
              ))}</tbody>
            </table></div></CardContent></Card>
          </section>
        </TabPanel>

        {/* TAGS */}
        <TabPanel value="tags" className="space-y-3">
          {Object.entries(data.tags).map(([family, list]) => (
            <Card key={family}><CardContent className="p-4">
              <div className="mb-2 text-sm font-semibold capitalize">{family} tags <span className="text-muted-foreground">({list.length})</span></div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((t) => <span key={t} className="rounded bg-muted px-2 py-0.5 font-mono text-[11px]">{t}</span>)}
              </div>
            </CardContent></Card>
          ))}
        </TabPanel>

        {/* CALENDARS */}
        <TabPanel value="calendars" className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Calendar groups</h3>
            <Card><CardContent className="p-0"><table className="w-full text-sm">
              <tbody>{data.calendars.groups.map((g) => (
                <tr key={g.group} className="border-b"><td className="px-3 py-2 font-medium w-1/3">{g.group}</td><td className="px-3 py-2 text-muted-foreground">{g.calendars}</td></tr>
              ))}</tbody>
            </table></CardContent></Card>
          </section>
          <div className="grid gap-3 md:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Common settings</h3>
              <Card><CardContent className="p-0"><table className="w-full text-sm">
                <tbody>{data.calendars.common.map((c) => (
                  <tr key={c.setting} className="border-b"><td className="px-3 py-1.5 font-medium text-xs">{c.setting}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{c.value}</td></tr>
                ))}</tbody>
              </table></CardContent></Card>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Virginia Online specifics</h3>
              <Card><CardContent className="p-4"><ul className="space-y-1.5 text-xs">
                {data.calendars.online_specifics.map((s, i) => <li key={i} className="flex gap-2"><span className="text-sky-500">•</span>{s}</li>)}
              </ul></CardContent></Card>
            </section>
          </div>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Provider block schedule (first 30 days)</h3>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className={th}>Day</th><th className={th}>Morning</th><th className={th}>Afternoon</th><th className={th}>Evening</th></tr></thead>
              <tbody>{data.calendars.provider_blocks.map((b) => (
                <tr key={b.day} className="border-b">
                  <td className="px-3 py-1.5 font-medium">{b.day}</td>
                  {[b.am, b.pm, b.eve].map((cell, i) => (
                    <td key={i} className={`px-3 py-1.5 text-xs ${/online/i.test(cell) ? "text-sky-700 dark:text-sky-400 font-medium" : "text-muted-foreground"}`}>{cell}</td>
                  ))}
                </tr>
              ))}</tbody>
            </table></div></CardContent></Card>
          </section>
        </TabPanel>

        {/* FORMS */}
        <TabPanel value="forms" className="space-y-3">
          {data.forms.map((f) => (
            <Card key={f.name}><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-sm font-semibold">{f.name}</div>
                <Badge tone={f.channel === "online" ? "blue" : f.channel === "in-person" ? "warning" : "neutral"}>{f.channel}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.purpose}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.items.map((it, i) => <span key={i} className="rounded bg-muted px-2 py-0.5 text-[11px]">{it}</span>)}
              </div>
            </CardContent></Card>
          ))}
        </TabPanel>

        {/* PIPELINES */}
        <TabPanel value="pipelines" className="space-y-4">
          {data.pipelines.map((p) => (
            <section key={p.name}>
              <h3 className="text-sm font-semibold font-mono">{p.name}</h3>
              <p className="mb-2 text-xs text-muted-foreground">{p.scope}</p>
              <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40"><th className={th}>Stage</th><th className={th}>Entry</th><th className={th}>Exit</th></tr></thead>
                <tbody>{p.stages.map((s) => (
                  <tr key={s.stage} className="border-b"><td className="px-3 py-1.5 font-medium text-xs">{s.stage}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{s.entry}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{s.exit}</td></tr>
                ))}</tbody>
              </table></div></CardContent></Card>
            </section>
          ))}
        </TabPanel>

        {/* LINKS & COMMS */}
        <TabPanel value="links" className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Trigger links</h3>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className={th}>Link</th><th className={th}>Destination</th><th className={th}>Tag on click</th></tr></thead>
              <tbody>{data.trigger_links.map((l) => (
                <tr key={l.link} className="border-b"><td className="px-3 py-1.5 font-mono text-xs">{l.link}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{l.dest}</td><td className="px-3 py-1.5 font-mono text-[11px]">{l.tag}</td></tr>
              ))}</tbody>
            </table></div></CardContent></Card>
          </section>
          <div className="grid gap-3 md:grid-cols-2">
            <Card><CardContent className="p-4">
              <div className="mb-2 text-sm font-semibold">Conversations</div>
              <ul className="space-y-1 text-xs">
                {Object.entries(data.conversations).map(([k, v]) => <li key={k}><span className="font-medium capitalize">{k.replace(/_/g, " ")}: </span><span className="text-muted-foreground">{v}</span></li>)}
              </ul>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="mb-2 text-sm font-semibold">Phone routing</div>
              <div className="space-y-2 text-xs">
                <div><Badge tone="good">Pattern A</Badge> <span className="text-muted-foreground">{data.phone.pattern_a}</span></div>
                <div><Badge tone="neutral">Pattern B</Badge> <span className="text-muted-foreground">{data.phone.pattern_b}</span></div>
              </div>
            </CardContent></Card>
          </div>
        </TabPanel>
      </Tabs>
    </PageShell>
  );
}
