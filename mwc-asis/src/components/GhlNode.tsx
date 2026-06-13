import { Handle, Position } from "@xyflow/react";
import type { DrawerRef } from "../types";

const KIND_COLORS: Record<string, { bg: string; bar: string; fg: string }> = {
  trigger: { bg: "#1a2342", bar: "#E8670A", fg: "#fff" },
  condition: { bg: "#241a36", bar: "#9b6dff", fg: "#fff" },
  sms: { bg: "#15302a", bar: "#28c997", fg: "#fff" },
  email: { bg: "#162a3a", bar: "#3aa0ff", fg: "#fff" },
  wait: { bg: "#33260f", bar: "#e0a32b", fg: "#fff" },
  tag: { bg: "#2a1f2e", bar: "#e06ec1", fg: "#fff" },
  pipeline: { bg: "#1f2a1a", bar: "#8fcf4a", fg: "#fff" },
  end: { bg: "#2e1416", bar: "#e0443e", fg: "#fff" },
  action: { bg: "#1a2038", bar: "#6c7a99", fg: "#fff" },
};

export interface GhlNodeData {
  kind: string;
  label: string;
  title: string;
  sub?: string;
  ref: DrawerRef;
}

export function GhlNode({ data }: { data: GhlNodeData }) {
  const c = KIND_COLORS[data.kind] ?? KIND_COLORS.action;
  return (
    <div
      style={{
        width: 280,
        minHeight: 64,
        background: c.bg,
        color: c.fg,
        borderRadius: 10,
        borderLeft: `5px solid ${c.bar}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        padding: "10px 14px",
        fontFamily: "Montserrat, system-ui, sans-serif",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: c.bar }} />
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: 1,
          color: c.bar,
          textTransform: "uppercase",
        }}
      >
        {data.label}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, lineHeight: 1.2 }}>{data.title}</div>
      {data.sub ? (
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.sub}
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} style={{ background: c.bar }} />
    </div>
  );
}
