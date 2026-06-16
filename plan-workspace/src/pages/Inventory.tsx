import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Loading, toneFor } from "../components/ui";
import { useData, type AsIsWorkflow } from "../lib/data";
import { ghlWorkflows } from "../lib/ghl";
import { ExternalLink, RefreshCw, Wifi, WifiOff } from "lucide-react";

type Row = AsIsWorkflow & { version?: number; updatedAt?: string };
type Col = "name" | "status" | "steps" | "sms" | "email" | "branch" | "tag" | "opp";
const NUMCOLS: { k: Col; label: string }[] = [
  { k: "steps", label: "Steps" }, { k: "sms", label: "SMS" }, { k: "email", label: "Email" },
  { k: "branch", label: "Branches" }, { k: "tag", label: "Tag ops" }, { k: "opp", label: "Opp ops" },
];

export default function Inventory() {
  const { data } = useData();
  const [live, setLive] = useState<{ workflows: any[]; fetchedAt: string } | null>(null);
  const [liveState, setLiveState] = useState<"loading" | "ok" | "fallback">("loading");
  const [q, setQ] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);
  const [sort, setSort] = useState<Col>("steps");
  const [dir, setDir] = useState(-1);

  const load = () => {
    setLiveState("loading");
    fetch("/api/inventory")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { setLive(d); setLiveState("ok"); })
      .catch(() => setLiveState("fallback"));
  };
  useEffect(load, []);

  // Authoritative list: live workflows when available, else the static snapshot.
  // Enrich each live row with the snapshot's step/trigger detail (matched by id).
  const rows: Row[] = useMemo(() => {
    const snap = data?.as_is_workflows ?? [];
    const byId = new Map(snap.map((w) => [w.id, w]));
    if (liveState === "ok" && live) {
      return live.workflows.map((w) => ({ ...(byId.get(w.id) ?? {}), ...w } as Row));
    }
    return snap as Row[];
  }, [data, live, liveState]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let f = rows.filter((w) => showDrafts || w.status === "published");
    if (t) f = f.filter((w) => w.name.toLowerCase().includes(t));
    return [...f].sort((a, b) => {
      let x: any = (a as any)[sort], y: any = (b as any)[sort];
      x ??= dir === 1 ? Infinity : -Infinity; y ??= dir === 1 ? Infinity : -Infinity;
      if (typeof x === "string") x = x.toLowerCase();
      if (typeof y === "string") y = y.toLowerCase();
      return x < y ? -dir : x > y ? dir : 0;
    });
  }, [rows, q, showDrafts, sort, dir]);

  if (!data && liveState === "loading") return <Loading />;
  const published = rows.filter((w) => w.status === "published").length;
  const drafts = rows.filter((w) => w.status !== "published").length;
  const click = (k: Col) => (sort === k ? setDir((d) => -d) : (setSort(k), setDir(k === "name" || k === "status" ? 1 : -1)));

  return (
    <PageShell
      title="Workflow inventory"
      subtitle={`${published} published · ${drafts} draft = ${rows.length} total workflows in the live account.`}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <RefreshCw className={`h-3.5 w-3.5 ${liveState === "loading" ? "animate-spin" : ""}`} /> Refresh
          </button>
          <a href={ghlWorkflows(data?.location_id ?? "Ghstz8eIsHWLeXek47dk")} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <ExternalLink className="h-3.5 w-3.5" /> Open in GHL
          </a>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {liveState === "ok" ? (
          <Badge tone="good"><Wifi className="me-1 inline h-3 w-3" /> Live from GHL</Badge>
        ) : liveState === "fallback" ? (
          <Badge tone="warning"><WifiOff className="me-1 inline h-3 w-3" /> Snapshot (API unavailable)</Badge>
        ) : (
          <Badge tone="muted">Connecting…</Badge>
        )}
        {live?.fetchedAt && liveState === "ok" && (
          <span className="text-xs text-muted-foreground">fetched {new Date(live.fetchedAt).toLocaleString()}</span>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by workflow name…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} /> Show drafts
        </label>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{filtered.length} shown</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <thead className="sticky top-0 bg-card">
                <tr>
                  <TH className="cursor-pointer"><button onClick={() => click("name")}>Workflow{sort === "name" ? (dir === 1 ? " ↑" : " ↓") : ""}</button></TH>
                  <TH className="cursor-pointer"><button onClick={() => click("status")}>Status{sort === "status" ? (dir === 1 ? " ↑" : " ↓") : ""}</button></TH>
                  {NUMCOLS.map((c) => (
                    <TH key={c.k} className="cursor-pointer text-right"><button onClick={() => click(c.k)}>{c.label}{sort === c.k ? (dir === 1 ? " ↑" : " ↓") : ""}</button></TH>
                  ))}
                  <TH>Triggers</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <TD className="font-medium">{w.name}</TD>
                    <TD><Badge tone={w.status === "published" ? "good" : "muted"}>{w.status}</Badge></TD>
                    {NUMCOLS.map((c) => (
                      <TD key={c.k} className="text-right tabular-nums text-muted-foreground">{(w as any)[c.k] ?? "—"}</TD>
                    ))}
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {(w.triggers ?? []).slice(0, 3).map((t, i) => <Badge key={i} tone="muted">{t.name}</Badge>)}
                        {(w.triggers ?? []).length > 3 && <Badge tone="muted">+{(w.triggers ?? []).length - 3}</Badge>}
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        List + status are live from the GHL API. Step counts and triggers come from the audit snapshot, matched by workflow id (shown as “—” for workflows added since the snapshot).
      </p>
    </PageShell>
  );
}
