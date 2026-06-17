import { useEffect, useState, useCallback } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { RefreshCw, Wifi, WifiOff, ExternalLink } from "lucide-react";

interface Appt { id: string; name: string; time: string; status: string; contactId: string; amount: number; }
interface LocData { appts: Appt[]; count: number; revenue: number; }
interface Daily { date: string; fetchedAt: string; totalAppts: number; totalRevenue: number; statusTotals: Record<string, number>; locations: Record<string, LocData>; }

const LOC_ORDER = ["Newport News", "Richmond", "Virginia Beach"];
const money = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const hhmm = (iso: string) => { try { return iso.slice(11, 16); } catch { return ""; } };

function statusTone(s: string): "good" | "red" | "warning" | "muted" | "blue" {
  const x = (s || "").toLowerCase();
  if (x === "showed") return "good";
  if (x === "noshow" || x === "no-show" || x === "invalid") return "red";
  if (x === "cancelled") return "warning";
  if (x === "confirmed") return "blue";
  return "muted";
}

export default function Daily() {
  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const [date, setDate] = useState(todayET);
  const [data, setData] = useState<Daily | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback((d: string) => {
    setState("loading");
    fetch(`/api/daily?date=${d}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j) => { setData(j); setState("ok"); })
      .catch(() => setState("error"));
  }, []);
  useEffect(() => { load(date); }, [date, load]);

  return (
    <PageShell
      title="Daily board"
      subtitle="Live appointments across the 3 clinic calendars, joined to won-opportunity revenue. The live replacement for the manual daily sheet."
      actions={
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => load(date)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      }
    >
      {state === "error" && <Card><CardContent>Could not load the daily board (the API runs in production; local dev has no function). Try on plan-workspace.vercel.app.</CardContent></Card>}
      {state === "loading" && !data && <Loading />}
      {data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recognized revenue</div>
              <div className="text-2xl font-bold tabular-nums">{money(data.totalRevenue)}</div>
              <div className="text-[11px] text-muted-foreground">won opps on {data.date}</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Appointments</div>
              <div className="text-2xl font-bold tabular-nums">{data.totalAppts}</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Showed / No-show</div>
              <div className="text-2xl font-bold tabular-nums">{data.statusTotals.showed || 0} / {(data.statusTotals.noshow || 0)}</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3 flex items-center gap-2">
              {state === "ok" ? <Badge tone="good"><Wifi className="me-1 inline h-3 w-3" />Live</Badge> : <Badge tone="warning"><WifiOff className="me-1 inline h-3 w-3" />Stale</Badge>}
              {data.fetchedAt && <span className="text-[11px] text-muted-foreground">{new Date(data.fetchedAt).toLocaleTimeString()}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {LOC_ORDER.map((loc) => {
              const L = data.locations[loc];
              if (!L) return null;
              return (
                <Card key={loc}>
                  <CardContent className="p-0">
                    <div className="flex items-baseline justify-between border-b bg-muted/40 px-4 py-2">
                      <span className="font-semibold">{loc}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{L.count} appt · {money(L.revenue)}</span>
                    </div>
                    <div className="divide-y">
                      {L.appts.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No appointments.</div>}
                      {L.appts.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                          <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{hhmm(a.time)}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{a.name || "—"}</span>
                          {a.amount > 0 && <span className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{money(a.amount)}</span>}
                          <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" /> Revenue = sum of won opportunities' monetaryValue for the day. Outcome/pay-type/PCC fields exist on the opportunity but aren't populated yet — once reps fill them, this board can show them per appointment.
          </p>
        </>
      )}
    </PageShell>
  );
}
