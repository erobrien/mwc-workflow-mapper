# -*- coding: utf-8 -*-
"""
Read-only contact field-usage scan with a RECENCY test. Pages all contacts,
buckets each as recent (created in last 30 days) or not, and tallies per-field
population for both. A field with 0 population among recent contacts = not in
active use (even if it holds old data). GET-only. Writes audit/contact_recent_usage.json.
  python scripts/contact_recent_usage.py
"""
import json, os, time, datetime, urllib.request, urllib.error, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sec = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
B = "https://services.leadconnectorhq.com"
CUTOFF = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30))
CUT_MS = int(CUTOFF.timestamp() * 1000)
CUT_ISO = CUTOFF.isoformat()[:19]

def get(path):
    r = urllib.request.Request(B + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": "2021-07-28",
        "Accept": "application/json", "User-Agent": "MWC-RecentScan/1.0"}, method="GET")
    for a in range(4):
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503) and a < 3: time.sleep(2**a); continue
            return e.code, {}
        except Exception:
            if a < 3: time.sleep(2**a); continue
            return -1, {}

def is_recent(c):
    da = c.get("dateAdded")
    if da is None: return False
    if isinstance(da, (int, float)): return da >= CUT_MS
    return str(da)[:19] >= CUT_ISO

_, d = get(f"/locations/{LOC}/customFields?model=contact")
id2name = {f["id"]: f.get("name") for f in d.get("customFields", []) if f.get("model")=="contact"}

allc = collections.Counter(); recc = collections.Counter()
seen = recent_total = 0; cursor = None; pages = 0
while pages < 250:
    url = f"/contacts/?locationId={LOC}&limit=100"
    if cursor: url += f"&startAfter={cursor[0]}&startAfterId={cursor[1]}"
    code, payload = get(url)
    if code != 200: print("stop http", code, "after", seen); break
    contacts = payload.get("contacts", [])
    if not contacts: break
    for c in contacts:
        seen += 1
        rec = is_recent(c)
        if rec: recent_total += 1
        for cf in (c.get("customFields") or []):
            v = cf.get("value")
            if v not in (None, "", [], {}):
                allc[cf.get("id")] += 1
                if rec: recc[cf.get("id")] += 1
    meta = payload.get("meta", {})
    cursor = (meta.get("startAfter"), meta.get("startAfterId")); pages += 1
    if pages % 20 == 0: print("scanned", seen)
    if not meta.get("nextPageUrl") and not meta.get("startAfterId"): break

rows = []
for fid, name in id2name.items():
    rows.append({"name": name, "all_time": allc.get(fid, 0), "last_30d": recc.get(fid, 0)})
rows.sort(key=lambda r: (r["last_30d"], r["all_time"]))
out = {"scanned": seen, "recent_contacts_30d": recent_total,
       "cutoff": CUT_ISO, "fields": rows}
json.dump(out, open(os.path.join(ROOT,"audit","contact_recent_usage.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)

dead = [r for r in rows if r["last_30d"] == 0]
abandoned = [r for r in dead if r["all_time"] > 0]
never = [r for r in dead if r["all_time"] == 0]
print(f"\nscanned {seen} contacts · {recent_total} created in last 30 days (since {CUT_ISO[:10]})")
print(f"fields with 0 values in last 30 days: {len(dead)} of {len(rows)}")
print(f"  - abandoned (had old data, none recent): {len(abandoned)}")
print(f"  - never used (0 all-time): {len(never)}")
print("\nABANDONED (old data, nothing in last 30d):")
for r in sorted(abandoned, key=lambda x:-x["all_time"]): print(f"  all-time {r['all_time']:>5} · 30d 0   {r['name']}")
print("\nNEVER USED (0 all-time):")
for r in never: print(f"  {r['name']}")
print("\nACTIVE (used in last 30d) count:", len([r for r in rows if r['last_30d']>0]))
