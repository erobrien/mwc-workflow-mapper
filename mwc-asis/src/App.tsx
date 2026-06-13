import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GhlNode } from "./components/GhlNode";
import { Drawer } from "./components/Drawer";
import { buildFlow } from "./lib/flow";
import { groupByFolder, loadApp } from "./lib/data";
import type { AppData, DrawerRef, Workflow } from "./types";
import "./App.css";

const nodeTypes = { ghl: GhlNode };

export default function App() {
  const [app, setApp] = useState<AppData | null>(null);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [drawer, setDrawer] = useState<DrawerRef | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadApp().then((a) => {
      setApp(a);
      const first = a.workflows.find((w) => w.steps?.length) ?? a.workflows[0] ?? null;
      setSelected(first);
    });
  }, []);

  const folders = useMemo(() => (app ? groupByFolder(app) : []), [app]);

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(
    () => (selected ? buildFlow(selected) : { nodes: [], edges: [] }),
    [selected],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return folders;
    const q = query.toLowerCase();
    return folders
      .map((f) => ({ ...f, workflows: f.workflows.filter((w) => w!.name.toLowerCase().includes(q)) }))
      .filter((f) => f.workflows.length > 0);
  }, [folders, query]);

  if (!app) return <div className="loading">Loading…</div>;

  const isDemo = app.generated_at === "demo";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">MWC</span>
          <span className="brand-sub">AS-IS Workflow Map</span>
        </div>
        {isDemo ? (
          <div className="demo-banner">
            Demo data. Run the extraction scripts and <code>merge_steps.py</code> to load real workflows.
          </div>
        ) : null}
        <input
          className="search"
          placeholder="Search workflows…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="folders">
          {filtered.map((f) => (
            <div key={f.name} className="folder">
              <div className="folder-name">{f.name}</div>
              {f.workflows.map((w) => (
                <button
                  key={w!.id}
                  className={`wf ${selected?.id === w!.id ? "active" : ""}`}
                  onClick={() => {
                    setSelected(w!);
                    setDrawer(null);
                  }}
                >
                  <span className="wf-name">{w!.name}</span>
                  <span className="wf-meta">
                    {w!.extracted ? `${w!.stats?.total_steps ?? w!.steps.length} steps` : "not extracted"}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="canvas">
        {selected ? (
          <>
            <header className="canvas-head">
              <h1>{selected.name}</h1>
              <div className="canvas-meta">
                <span>{selected.folder}</span>
                <span>·</span>
                <span>{selected.status}</span>
                {selected.extraction_method ? (
                  <>
                    <span>·</span>
                    <span className="method">{selected.extraction_method}</span>
                  </>
                ) : null}
              </div>
            </header>
            {selected.steps.length === 0 ? (
              <div className="empty">Steps not yet extracted for this workflow.</div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                onNodeClick={(_, node) => {
                  const ref = (node.data as { ref?: DrawerRef }).ref;
                  if (ref) setDrawer(ref);
                }}
              >
                <Background color="#1c2545" gap={20} />
                <Controls />
                <MiniMap pannable zoomable nodeColor="#E8670A" maskColor="rgba(11,16,41,0.7)" />
              </ReactFlow>
            )}
          </>
        ) : (
          <div className="empty">Select a workflow.</div>
        )}
      </main>

      <Drawer refData={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
