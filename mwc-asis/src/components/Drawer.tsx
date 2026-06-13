import { useState } from "react";
import type { DrawerRef, Step } from "../types";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="drawer-label">{label}</div>
      <div className="drawer-value">{value}</div>
    </div>
  );
}

function SmsView({ step }: { step: Step }) {
  const s = step.sms ?? {};
  return (
    <>
      <Field label="Template" value={s.template_name} />
      <Field label="From" value={s.from} />
      <div className="drawer-label">Body</div>
      <pre className="drawer-pre">{s.body || "(empty)"}</pre>
    </>
  );
}

function EmailView({ step }: { step: Step }) {
  const e = step.email ?? {};
  const [tab, setTab] = useState<"html" | "plain">("html");
  return (
    <>
      <Field label="Template" value={e.template_name} />
      <Field label="From" value={e.from} />
      <Field label="Subject" value={e.subject} />
      <div className="drawer-tabs">
        <button className={tab === "html" ? "active" : ""} onClick={() => setTab("html")}>
          HTML preview
        </button>
        <button className={tab === "plain" ? "active" : ""} onClick={() => setTab("plain")}>
          Plain text
        </button>
      </div>
      {tab === "html" ? (
        e.html ? (
          <iframe className="drawer-iframe" srcDoc={e.html} title="email-html" sandbox="" />
        ) : (
          <div className="drawer-empty">No HTML body</div>
        )
      ) : (
        <pre className="drawer-pre">{e.plain || e.html?.replace(/<[^>]+>/g, "") || "(empty)"}</pre>
      )}
    </>
  );
}

function GenericStep({ step }: { step: Step }) {
  return (
    <>
      <Field label="Type" value={String(step.type)} />
      {step.tag ? <Field label="Tag" value={`${step.tag.action} ${step.tag.name ?? ""}`} /> : null}
      {step.wait ? <Field label="Wait" value={`${step.wait.duration ?? "?"} ${step.wait.unit ?? ""}`} /> : null}
      {step.condition?.branches?.length ? (
        <div style={{ marginBottom: 12 }}>
          <div className="drawer-label">Branches</div>
          {step.condition.branches.map((b, i) => (
            <div key={i} className="drawer-branch">
              <strong>{b.label ?? `Branch ${i + 1}`}</strong>
              {b.expression ? <span> — {b.expression}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      {step.pipeline ? <Field label="Pipeline" value={`${step.pipeline.name} → ${step.pipeline.stage}`} /> : null}
      {step.field_update ? (
        <Field label="Field update" value={`${step.field_update.field} = ${step.field_update.value}`} />
      ) : null}
      <div className="drawer-label">Raw</div>
      <pre className="drawer-pre small">{JSON.stringify(step.raw ?? step, null, 2)}</pre>
    </>
  );
}

export function Drawer({ refData, onClose }: { refData: DrawerRef | null; onClose: () => void }) {
  if (!refData) return null;

  let title = "";
  let body: React.ReactNode = null;

  if (refData.kind === "trigger") {
    title = "Trigger";
    body = (
      <>
        {refData.triggers.map((t, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <Field label="Type" value={t.type} />
            <div className="drawer-label">Filters</div>
            <pre className="drawer-pre small">{JSON.stringify(t.filters ?? [], null, 2)}</pre>
          </div>
        ))}
      </>
    );
  } else {
    const s = refData.step;
    title = s.title || String(s.type);
    if (s.type === "send_sms") body = <SmsView step={s} />;
    else if (s.type === "send_email") body = <EmailView step={s} />;
    else body = <GenericStep step={s} />;
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>{title}</h2>
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">{body}</div>
      </aside>
    </>
  );
}
