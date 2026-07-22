import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Alert, Loading, cn } from "../components/ui";
import { useAsisDetail } from "../lib/asis";
import { ListChecks, AlertOctagon, AlertTriangle, Wrench, Gauge, User, ShieldAlert, ArrowLeft } from "lucide-react";

interface PriorityItem {
  rank: number;
  priority: "P0" | "P1" | "P2";
  title: string;
  defect_ids: string[];
  workflows: string[];
  problem: string;
  fix: string;
  effort: string;
  risk_of_inaction: string;
  owner_hint: string;
}
interface PriorityData {
  generated_at: string;
  method: string;
  summary: { total_items: number; p0_count: number; p1_count: number; p2_count: number; framing: string };
  items: PriorityItem[];
}

const PRIORITY_META: Record<string, { tone: "red" | "warning" | "blue"; label: string; icon: any }> = {
  P0: { tone: "red", label: "P0 — fix this sprint", icon: AlertOctagon },
  P1: { tone: "warning", label: "P1 — structural, next", icon: AlertTriangle },
  P2: { tone: "blue", label: "P2 — cleanup", icon: Gauge },
};

function findWorkflowId(name: string, byName: Record<string, string>): string | undefined {
  return byName[name];
}

function ItemCard({ item, wfIdByName }: { item: PriorityItem; wfIdByName: Record<string, string> }) {
  const meta = PRIORITY_META[item.priority];
  const Icon = meta.icon;
  const borderTone = item.priority === "P0" ? "border-l-destructive" : item.priority === "P1" ? "border-l-amber-500" : "border-l-sky-500";
  return (
    <Card className={cn("border-l-4", borderTone)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">#{item.rank}</span>
          <Badge tone={meta.tone}><Icon className="mr-1 inline h-3 w-3" />{meta.label}</Badge>
          <span className="text-sm font-semibold">{item.title}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.workflows.map((w) => {
            const id = findWorkflowId(w, wfIdByName);
            return id ? (
              <Link key={w} to={`/workflow/${id}`}>
                <Badge tone="muted" className="hover:bg-muted/80">{w}</Badge>
              </Link>
            ) : (
              <Badge key={w} tone="muted">{w}</Badge>
            );
          })}
          {item.defect_ids.map((d) => <Badge key={d} tone="purple">{d}</Badge>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Problem
            </div>
            <p className="text-sm text-foreground/90">{item.problem}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Fix
            </div>
            <p className="text-sm text-foreground/90">{item.fix}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Effort</div>
            <p className="mt-0.5 text-xs text-foreground/80">{item.effort}</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk of inaction</div>
            <p className="mt-0.5 text-xs text-foreground/80">{item.risk_of_inaction}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3 w-3" /> Owner
            </div>
            <p className="mt-0.5 text-xs text-foreground/80">{item.owner_hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PriorityChanges() {
  const [data, setData] = useState<PriorityData | null>(null);
  const { data: asis } = useAsisDetail();

  useEffect(() => {
    fetch("/priority-changes.json").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <Loading />;

  const wfIdByName: Record<string, string> = {};
  for (const w of asis?.workflows ?? []) wfIdByName[w.name] = w.id;

  const groups: { key: "P0" | "P1" | "P2"; items: PriorityItem[] }[] = [
    { key: "P0", items: data.items.filter((i) => i.priority === "P0") },
    { key: "P1", items: data.items.filter((i) => i.priority === "P1") },
    { key: "P2", items: data.items.filter((i) => i.priority === "P2") },
  ];

  return (
    <PageShell
      title="Priority changes — GHL production"
      subtitle={`${data.items.length} ranked action items, generated ${data.generated_at}. ${data.method}`}
      actions={
        <Link to="/as-is" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" /> As-is workflows
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P0 — fix this sprint</div>
            <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.p0_count}</div>
            <div className="mt-1 text-xs text-muted-foreground">live revenue/reporting integrity bugs</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P1 — structural, next</div>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{data.summary.p1_count}</div>
            <div className="mt-1 text-xs text-muted-foreground">duplication actively causing P0 bugs</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P2 — cleanup</div>
            <div className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">{data.summary.p2_count}</div>
            <div className="mt-1 text-xs text-muted-foreground">reduces risk, not actively corrupting data</div>
          </CardContent>
        </Card>
      </div>

      <Alert tone="neutral">
        <p className="text-sm">{data.summary.framing}</p>
      </Alert>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-3 flex items-center gap-2">
              <Badge tone={PRIORITY_META[g.key].tone}>{PRIORITY_META[g.key].label}</Badge>
              <Badge tone="muted">{g.items.length}</Badge>
            </div>
            <div className="space-y-3">
              {g.items.map((item) => <ItemCard key={item.rank} item={item} wfIdByName={wfIdByName} />)}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" />
        Every item links back to its source workflow(s) and defect id(s) — see As-Is Workflows and Audit Gaps for full evidence.
      </div>
    </PageShell>
  );
}
