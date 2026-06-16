// Vercel serverless function — live GHL workflow inventory.
// The PIT token lives in the GHL_TOKEN env var (server-side only; never shipped
// to the browser). Returns the full workflow list (published + draft) so the
// Inventory page reflects the live account instead of a static snapshot.
export default async function handler(_req: any, res: any) {
  const token = process.env.GHL_TOKEN;
  const loc = process.env.GHL_LOCATION_ID || "Ghstz8eIsHWLeXek47dk";
  if (!token) {
    res.status(500).json({ error: "GHL_TOKEN not configured" });
    return;
  }
  try {
    const r = await fetch(`https://services.leadconnectorhq.com/workflows/?locationId=${loc}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
        "User-Agent": "MWC-PlanWorkspace/1.0",
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: `GHL responded ${r.status}` });
      return;
    }
    const data = await r.json();
    const workflows = (data.workflows ?? []).map((w: any) => ({
      id: w.id, name: w.name, status: w.status, version: w.version,
      createdAt: w.createdAt, updatedAt: w.updatedAt,
    }));
    // cache at the edge for 5 min; serve stale while revalidating
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ fetchedAt: new Date().toISOString(), count: workflows.length, workflows });
  } catch (e: any) {
    res.status(502).json({ error: String(e?.message ?? e) });
  }
}
