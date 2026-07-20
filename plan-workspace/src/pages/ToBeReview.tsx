import { useEffect, useState } from "react";
import { PageShell } from "../components/Shell";
import { Card, CardContent, Badge, Loading } from "../components/ui";
import { ShieldCheck, Bug } from "lucide-react";

interface Finding {
  id: string; severity: string; area: string;
  claim: string; why: string; fix: string; status: string;
}
interface Review {
  reviewed_at: string; method: string; verdict: string;
  strengths: string[]; findings: Finding[];
}

type Tone = "neutral" | "good" | "warning" | "red" | "blue" | "muted" | "accent" | "purple";
const sevTone = (s: string): Tone =>
  s === "Blocker" ? "red" : s === "Major" ? "warning" : "muted";

export default function ToBeReview() {
  const [r, setR] = useState<Review | null>(null);
  useEffect(() => { fetch("/tobe-review.json").then((x) => x.json()).then(setR).catch(() => setR(null)); }, []);
  if (!r) return <Loading />;

  const order = ["Blocker", "Major", "Minor"];
  const sorted = [...r.findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const counts = order.map((s) => [s, r.findings.filter((f) => f.severity === s).length] as const);

  return (
    <PageShell
      title="To-Be Design Review"
      subtitle={`Adversarial review, ${r.reviewed_at} — ${r.findings.length} findings (${counts.map(([s, n]) => `${n} ${s}`).join(", ")}). All resolutions are folded into the To-Be spec.`}
    >
      <Card className="mb-6 border-l-4 border-l-emerald-600">
        <CardContent className="p-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verdict
          </div>
          <p className="text-sm text-foreground/90">{r.verdict}</p>
        </CardContent>
      </Card>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">What survived the teardown</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {r.strengths.map((s, i) => (
            <div key={i} className="rounded-md border bg-card px-3 py-2 text-sm text-foreground/90">{s}</div>
          ))}
        </div>
      </section>

      <section className="mb-3">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Bug className="h-4 w-4 text-muted-foreground" /> Findings and applied fixes
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{r.method}</p>
      </section>

      <div className="space-y-3">
        {sorted.map((f) => (
          <Card key={f.id} className={f.severity === "Blocker" ? "border-l-4 border-l-destructive" : f.severity === "Major" ? "border-l-4 border-l-amber-500" : ""}>
            <CardContent className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{f.id}</span>
                <Badge tone={sevTone(f.severity)}>{f.severity}</Badge>
                <span className="font-semibold">{f.area}</span>
                <span className="ms-auto"><Badge tone="good">{f.status}</Badge></span>
              </div>
              <p className="text-sm text-foreground/90"><span className="font-medium text-muted-foreground">Spec said: </span>{f.claim}</p>
              <p className="mt-1.5 text-sm text-foreground/90"><span className="font-medium text-rose-700 dark:text-rose-400">Why it breaks: </span>{f.why}</p>
              <p className="mt-1.5 text-sm text-foreground/90"><span className="font-medium text-emerald-700 dark:text-emerald-400">Fix applied: </span>{f.fix}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
