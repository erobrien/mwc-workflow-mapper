// Vercel serverless function — live daily board for the 3 clinic calendars.
// Returns today's (or ?date=YYYY-MM-DD) appointments per location, joined to
// won-opportunity revenue (monetaryValue) for that day. Token stays server-side.
declare const process: { env: Record<string, string | undefined> };

const BASE = "https://services.leadconnectorhq.com";
const CALENDARS: Record<string, string> = {
  "Richmond": "1Cfy5JnO2A4ggiZlMVvX",
  "Newport News": "lBaRbjUpEmesxEloFBME",
  "Virginia Beach": "4xmnBGMWJ6TVUKcAPpPb",
};

function etOffset(dateStr: string) {
  const s = new Date(dateStr + "T12:00:00Z").toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" });
  return s.includes("EDT") ? "-04:00" : "-05:00";
}

async function ghl(token: string, path: string, version = "2021-07-28") {
  const r = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}`, Version: version, Accept: "application/json", "User-Agent": "MWC-Daily/1.0" },
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export default async function handler(req: any, res: any) {
  const token = process.env.GHL_TOKEN;
  const loc = process.env.GHL_LOCATION_ID || "Ghstz8eIsHWLeXek47dk";
  if (!token) { res.status(500).json({ error: "GHL_TOKEN not configured" }); return; }

  const date: string = (req.query?.date as string) || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const off = etOffset(date);
  const startMs = new Date(`${date}T00:00:00${off}`).getTime();
  const endMs = new Date(`${date}T23:59:59${off}`).getTime();

  try {
    // 1. events for all 3 calendars (parallel)
    const perCal = await Promise.all(Object.entries(CALENDARS).map(async ([name, cid]) => {
      const d = await ghl(token, `/calendars/events?locationId=${loc}&calendarId=${cid}&startTime=${startMs}&endTime=${endMs}`, "2021-04-15");
      const events = (d.events || []).filter((e: any) => (e.startTime || "").slice(0, 10) === date);
      return [name, events] as [string, any[]];
    }));

    // 2. revenue map: won opps with value, updated on this ET day -> contactId -> amount
    const rev: Record<string, number> = {};
    let cursor: [any, any] | null = null, pages = 0;
    while (pages < 15) {
      let url = `/opportunities/search?location_id=${loc}&limit=100`;
      if (cursor) url += `&startAfter=${cursor[0]}&startAfterId=${cursor[1]}`;
      const d: any = await ghl(token, url);
      const ops = d.opportunities || [];
      if (!ops.length) break;
      let oldest = Infinity;
      for (const o of ops) {
        const ts = new Date(o.updatedAt || o.createdAt || 0).getTime();
        oldest = Math.min(oldest, ts);
        if (o.status === "won" && (o.monetaryValue || 0) > 0 && ts >= startMs && ts <= endMs && o.contactId) {
          rev[o.contactId] = (rev[o.contactId] || 0) + o.monetaryValue;
        }
      }
      const meta = d.meta || {};
      if (oldest < startMs || !meta.nextPageUrl) break;
      cursor = [meta.startAfter, meta.startAfterId]; pages++;
    }

    // 3. assemble per-location
    const locations: any = {};
    let totalAppts = 0, totalRevenue = 0;
    const statusTotals: Record<string, number> = {};
    for (const [name, events] of perCal) {
      const appts = events.map((e: any) => {
        const amount = rev[e.contactId] || 0;
        return {
          id: e.id, name: (e.title || "").trim(), time: e.startTime,
          status: e.appointmentStatus || e.appoinmentStatus || "confirmed",
          contactId: e.contactId, amount,
        };
      }).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || ""));
      const locRevenue = appts.reduce((s: number, a: any) => s + a.amount, 0);
      for (const a of appts) statusTotals[a.status] = (statusTotals[a.status] || 0) + 1;
      locations[name] = { appts, count: appts.length, revenue: locRevenue };
      totalAppts += appts.length; totalRevenue += locRevenue;
    }

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(200).json({ date, fetchedAt: new Date().toISOString(), totalAppts, totalRevenue, statusTotals, locations });
  } catch (e: any) {
    res.status(502).json({ error: String(e?.message ?? e) });
  }
}
