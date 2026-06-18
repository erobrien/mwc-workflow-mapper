import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Loading } from "../components/ui";
import { useData, type AsIsWorkflow } from "../lib/data";
import { ghlWorkflows, ghlWorkflow } from "../lib/ghl";
import { ExternalLink } from "lucide-react";

type Col = "name" | "status" | "steps" | "sms" | "email" | "branch" | "tag" | "opp";
const NUMCOLS: { k: Col; label: string }[] = [
  { k: "steps", label: "Steps" }, { k: "sms", label: "SMS" }, { k: "email", label: "Email" },
  { k: "branch", label: "Branches" }, { k: "tag", label: "Tag ops" }, { k: "opp", label: "Opp ops" },
];

export default function Inventory() {
  const { data, isLoading } = useData();
  const [q, setQ] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);
  const [sort, setSort] = useState<Col>("steps");
  const [dir, setDir] = useState(-1);

  const rows = useMemo<AsIsWorkflow[]>(() => {
    const all = data?.as_is_workflows ?? [];
    const t = q.trim().toLowerCase();
    let f = all.filter((w) => showDrafts || w.status === "published");
    if (t) f = f.filter((w) => w.name.toLowerCase().includes(t));
    return [...f].sort((a, b) => {
      let x: any = (a as any)[sort], y: any = (b as any)[sort];
      x ??= dir === 1 ? Infinity : -Infinity; y ??= dir === 1 ? Infinity : -Infinity;
      if (typeof x === "string") x = x.toLowerCase();
      if (typeof y === "string") y = y.toLowerCase();
      return x < y ? -dir : x > y ? dir : 0;
    });
  }, [data, q, showDrafts, sort, dir]);

  if (isLoading || !data) return <Loading />;
  const all = data.as_is_workflows;
  const published = all.filter((w) => w.status === "published").length;
  const drafts = all.length - published;
  const click = (k: Col) => (sort === k ? setDir((d) => -d) : (setSort(k), setDir(k === "name" || k === "status" ? 1 : -1)));

  return (
    <PageShell
      title="Workflow inventory"
      subtitle={`${published} published · ${drafts} draft = ${all.length} workflows (from the captured snapshot).`}
      actions={
        <a href={ghlWorkflows(data.location_id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <ExternalLink className="h-3.5 w-3.5" /> Open in GHL
        </a>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by workflow name…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} /> Show drafts
        </label>
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{rows.length} shown</span>
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
                  <TH className="w-10">GHL</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <TD className="font-medium"><Link to={`/workflow/${w.id}`} className="hover:underline hover:text-primary">{w.name}</Link></TD>
                    <TD><Badge tone={w.status === "published" ? "good" : "muted"}>{w.status}</Badge></TD>
                    {NUMCOLS.map((c) => (
                      <TD key={c.k} className="text-right tabular-nums text-muted-foreground">{(w as any)[c.k] ?? 0}</TD>
                    ))}
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {(w.triggers ?? []).slice(0, 3).map((t, i) => <Badge key={i} tone="muted">{t.name}</Badge>)}
                        {(w.triggers ?? []).length > 3 && <Badge tone="muted">+{(w.triggers ?? []).length - 3}</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <a href={ghlWorkflow(data.location_id, w.id)} target="_blank" rel="noopener noreferrer"
                        title="Open this workflow's builder in GHL" className="inline-flex rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
