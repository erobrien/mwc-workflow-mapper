import { useMemo, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Table, TH, TD, Badge, Loading } from "../components/ui";
import { useData, type AsIsWorkflow } from "../lib/data";
import { ghlWorkflows } from "../lib/ghl";
import { ExternalLink } from "lucide-react";

type Col = keyof Pick<AsIsWorkflow, "name" | "steps" | "sms" | "email" | "wait" | "branch" | "tag" | "opp">;
const COLS: { k: Col; label: string }[] = [
  { k: "name", label: "Workflow" }, { k: "steps", label: "Steps" }, { k: "sms", label: "SMS" },
  { k: "email", label: "Email" }, { k: "wait", label: "Waits" }, { k: "branch", label: "Branches" },
  { k: "tag", label: "Tag ops" }, { k: "opp", label: "Opp ops" },
];

export default function Inventory() {
  const { data, isLoading } = useData();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Col>("steps");
  const [dir, setDir] = useState(-1);

  const published = useMemo(
    () => (data?.as_is_workflows ?? []).filter((w) => w.status === "published"),
    [data]
  );
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = t ? published.filter((w) => w.name.toLowerCase().includes(t)) : published;
    return [...f].sort((a, b) => {
      let x: any = a[sort], y: any = b[sort];
      x ??= dir === 1 ? Infinity : -Infinity; y ??= dir === 1 ? Infinity : -Infinity;
      if (typeof x === "string") x = x.toLowerCase();
      if (typeof y === "string") y = y.toLowerCase();
      return x < y ? -dir : x > y ? dir : 0;
    });
  }, [published, q, sort, dir]);

  if (isLoading || !data) return <Loading />;
  const drafts = data.as_is_workflows.length - published.length;
  const click = (k: Col) => (sort === k ? setDir((d) => -d) : (setSort(k), setDir(k === "name" ? 1 : -1)));

  return (
    <PageShell
      title="Workflow inventory"
      subtitle={`${published.length} active workflows. ${drafts} inactive drafts are out of scope and will be archived — not shown.`}
      actions={
        <a href={ghlWorkflows(data.location_id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <ExternalLink className="h-3.5 w-3.5" /> Open in GHL
        </a>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by workflow name…"
          className="w-full max-w-md rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <span className="ms-auto text-xs tabular-nums text-muted-foreground">{rows.length} of {published.length}</span>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <thead className="sticky top-0 bg-card">
                <tr>
                  {COLS.map((c) => (
                    <TH key={c.k} className={c.k === "name" ? "cursor-pointer" : "cursor-pointer text-right"}>
                      <button onClick={() => click(c.k)} className="inline-flex items-center gap-1">
                        {c.label}{sort === c.k ? (dir === 1 ? " ↑" : " ↓") : ""}
                      </button>
                    </TH>
                  ))}
                  <TH>Triggers</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <TD className="font-medium">{w.name}</TD>
                    {(["steps", "sms", "email", "wait", "branch", "tag", "opp"] as Col[]).map((k) => (
                      <TD key={k} className="text-right tabular-nums text-muted-foreground">{(w[k] as number) || 0}</TD>
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
    </PageShell>
  );
}
