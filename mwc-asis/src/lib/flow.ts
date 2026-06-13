import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type { Step, Workflow } from "../types";

const NODE_W = 280;
const NODE_H = 84;
const ACCENT = "#E8670A";

export function classify(type: string): string {
  if (type === "trigger") return "trigger";
  if (type === "wait") return "wait";
  if (type === "send_sms") return "sms";
  if (type === "send_email") return "email";
  if (type.includes("tag")) return "tag";
  if (type === "if_else") return "condition";
  if (type === "move_pipeline") return "pipeline";
  if (type === "end") return "end";
  return "action";
}

function subFor(s: Step): string {
  if (s.type === "send_sms") return s.sms?.template_name ?? s.sms?.body?.slice(0, 60) ?? "";
  if (s.type === "send_email") return s.email?.subject ?? s.email?.template_name ?? "";
  if (s.type === "wait") return `${s.wait?.duration ?? "?"} ${s.wait?.unit ?? ""}`.trim();
  if (s.type === "add_tag" || s.type === "remove_tag")
    return `${s.tag?.action === "remove" ? "−" : "+"} ${s.tag?.name ?? ""}`;
  if (s.type === "if_else") return s.condition?.label ?? "";
  if (s.type === "move_pipeline") return `${s.pipeline?.name ?? ""} → ${s.pipeline?.stage ?? ""}`;
  if (s.type === "update_field") return `${s.field_update?.field ?? ""} = ${s.field_update?.value ?? ""}`;
  return "";
}

export function buildFlow(wf: Workflow): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 64 });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const stepNodeId = (s: Step) => `step-${s.id ?? s.index}`;
  const targetNodeId = (id: string) => `step-${id}`;
  const known = new Set<string>();

  const trigId = "trigger";
  const trigLabel = wf.triggers?.map((t) => t.type).filter(Boolean).join(" • ") || "Trigger";
  g.setNode(trigId, { width: NODE_W, height: NODE_H });
  known.add(trigId);
  nodes.push({
    id: trigId,
    type: "ghl",
    position: { x: 0, y: 0 },
    data: {
      kind: "trigger",
      label: "TRIGGER",
      title: trigLabel,
      sub: wf.triggers?.map((t) => JSON.stringify(t.filters ?? [])).join(" ") ?? "",
      ref: { kind: "trigger", triggers: wf.triggers ?? [], workflow: wf },
    },
  });

  for (const s of wf.steps) {
    const id = stepNodeId(s);
    g.setNode(id, { width: NODE_W, height: NODE_H });
    known.add(id);
    nodes.push({
      id,
      type: "ghl",
      position: { x: 0, y: 0 },
      data: {
        kind: classify(String(s.type)),
        label: String(s.type).toUpperCase().replace(/_/g, " "),
        title: s.title,
        sub: subFor(s),
        ref: { kind: "step", step: s, workflow: wf },
      },
    });
  }

  // Edges: explicit next_id / branches first; fall back to linear ordering.
  let prevId = trigId;
  const hasExplicit = wf.steps.some(
    (s) => s.next_id || (s.type === "if_else" && s.condition?.branches?.some((b) => b.next_id)),
  );

  for (const s of wf.steps) {
    const id = stepNodeId(s);

    if (s.type === "if_else" && s.condition?.branches?.length) {
      for (const br of s.condition.branches) {
        if (!br.next_id) continue;
        const target = targetNodeId(br.next_id);
        if (!known.has(target)) continue;
        edges.push({
          id: `e-${id}-${target}-${br.label ?? ""}`,
          source: id,
          target,
          label: br.label,
          type: "smoothstep",
          style: { stroke: ACCENT },
          labelStyle: { fill: "#fff", fontSize: 11 },
        });
        g.setEdge(id, target);
      }
    } else if (s.next_id) {
      const target = targetNodeId(s.next_id);
      if (known.has(target)) {
        edges.push({ id: `e-${id}-${target}`, source: id, target, type: "smoothstep", style: { stroke: ACCENT } });
        g.setEdge(id, target);
      }
    }

    if (!hasExplicit && !s.parent_id) {
      edges.push({ id: `e-lin-${prevId}-${id}`, source: prevId, target: id, type: "smoothstep", style: { stroke: ACCENT } });
      g.setEdge(prevId, id);
    }
    prevId = id;
  }

  // Connect trigger to the first real step if nothing else points there.
  const firstStep = wf.steps[0] ? stepNodeId(wf.steps[0]) : null;
  if (firstStep && !edges.some((e) => e.target === firstStep)) {
    edges.push({ id: `e-trig-${firstStep}`, source: trigId, target: firstStep, type: "smoothstep", style: { stroke: ACCENT } });
    g.setEdge(trigId, firstStep);
  }

  dagre.layout(g);
  for (const n of nodes) {
    const p = g.node(n.id);
    if (p) n.position = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  }
  return { nodes, edges };
}
