import type { AppData } from "../types";
import { DEMO_APP } from "./demo";

export async function loadApp(): Promise<AppData> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}app.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`app.json ${res.status}`);
    const data = (await res.json()) as AppData;
    if (!data.workflows || data.workflows.length === 0) return DEMO_APP;
    return data;
  } catch {
    return DEMO_APP;
  }
}

export function groupByFolder(app: AppData) {
  const byId = new Map(app.workflows.map((w) => [w.id, w]));
  const order = app.folders.length
    ? app.folders
    : [...new Set(app.workflows.map((w) => w.folder))].map((name) => ({
        name,
        workflows: app.workflows.filter((w) => w.folder === name).map((w) => w.id),
      }));
  return order
    .map((f) => ({
      name: f.name,
      workflows: f.workflows.map((id) => byId.get(id)).filter(Boolean),
    }))
    .filter((f) => f.workflows.length > 0);
}
