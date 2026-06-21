import { PageShell } from "../components/Shell";
import { Card, CardContent, Tabs, TabPanel, Loading } from "../components/ui";
import { useTelemed } from "../lib/telemed";
import { MessageSquare, Mail, Bell } from "lucide-react";

const TABS = [
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "internal", label: "Internal" },
];

export default function TelemedMessages() {
  const { data, isLoading } = useTelemed();
  if (isLoading || !data) return <Loading />;
  const m = data.messages;

  return (
    <PageShell
      title="Message library"
      subtitle="Brand-voice-checked templates with channel variants where the experience differs. No em-dashes, members not patients, telehealth appointment not consultation, no &quot;free&quot;."
    >
      <Tabs tabs={TABS} initial="sms">
        <TabPanel value="sms" className="space-y-2">
          {m.sms.map((s) => (
            <Card key={s.name}><CardContent className="p-4">
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-3.5 w-3.5 text-sky-500" /> {s.name}</div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans text-xs text-foreground/90">{s.body}</pre>
            </CardContent></Card>
          ))}
        </TabPanel>

        <TabPanel value="email" className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Subject lines</h3>
            <Card><CardContent className="p-0"><table className="w-full text-sm">
              <tbody>{m.email.map((e) => (
                <tr key={e.name} className="border-b">
                  <td className="px-3 py-2 align-top w-1/3"><span className="inline-flex items-center gap-1.5 font-medium"><Mail className="h-3.5 w-3.5 text-amber-500" /> {e.name}</span></td>
                  <td className="px-3 py-2 align-top text-muted-foreground">{e.subject}</td>
                </tr>
              ))}</tbody>
            </table></CardContent></Card>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Email anatomy (all transactional emails)</h3>
            <Card><CardContent className="p-4"><ol className="space-y-1 text-xs">
              {m.email_anatomy.map((a, i) => <li key={i} className="flex gap-2"><span className="font-mono text-muted-foreground">{i + 1}.</span>{a}</li>)}
            </ol></CardContent></Card>
          </section>
        </TabPanel>

        <TabPanel value="internal" className="space-y-2">
          {m.internal.map((n, i) => (
            <Card key={i}><CardContent className="p-3 flex items-start gap-2 text-sm">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" /> {n}
            </CardContent></Card>
          ))}
        </TabPanel>
      </Tabs>
    </PageShell>
  );
}
