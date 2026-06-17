# -*- coding: utf-8 -*-
"""
Read-only opportunity field-usage scan. Pages all opportunities and tallies
population of standard top-level fields + every opportunity custom field.
GET-only. Writes audit/opp_usage.json.   python scripts/opp_usage_scan.py
"""
import json, os, time, urllib.request, urllib.error, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sec = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
B = "https://services.leadconnectorhq.com"

def get(path):
    r = urllib.request.Request(B + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": "2021-07-28",
        "Accept": "application/json", "User-Agent": "MWC-OppScan/1.0"}, method="GET")
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

# custom field id -> name
_, d = get(f"/locations/{LOC}/customFields?model=opportunity")
id2name = {f["id"]: f.get("name") for f in d.get("customFields", []) if f.get("model")=="opportunity"}

std = collections.Counter()      # standard top-level fields
cf = collections.Counter()       # custom fields by id
seen = 0; cursor = None; pages = 0
while pages < 120:
    url = f"/opportunities/search?location_id={LOC}&limit=100"
    if cursor: url += f"&startAfter={cursor[0]}&startAfterId={cursor[1]}"
    code, payload = get(url)
    if code != 200: print("stop http", code, "after", seen); break
    ops = payload.get("opportunities", [])
    if not ops: break
    for o in ops:
        seen += 1
        if o.get("name"): std["name"] += 1
        if (o.get("monetaryValue") or 0) > 0: std["monetaryValue (Lead value)"] += 1
        if o.get("source"): std["source"] += 1
        if o.get("assignedTo"): std["assignedTo (Owner)"] += 1
        if o.get("lostReasonId") or o.get("lostReason"): std["lostReason"] += 1
        if o.get("status"): std["status"] += 1
        for c in (o.get("customFields") or []):
            v = c.get("fieldValue", c.get("value"))
            if v not in (None, "", [], {}): cf[c.get("id")] += 1
    meta = payload.get("meta", {})
    cursor = (meta.get("startAfter"), meta.get("startAfterId")); pages += 1
    if pages % 10 == 0: print("scanned", seen)
    if not meta.get("nextPageUrl"): break

out = {"scanned": seen,
       "standard": dict(std),
       "custom": {id2name.get(k, k): v for k, v in cf.items()},
       "custom_zero": [n for i,n in id2name.items() if cf.get(i,0)==0]}
json.dump(out, open(os.path.join(ROOT,"audit","opp_usage.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("\nscanned", seen, "opportunities")
print("STANDARD fields populated:")
for k,v in std.most_common(): print(f"  {v:6} ({round(v/seen*100)}%)  {k}")
print("CUSTOM fields populated:")
pop=[(id2name.get(i),c) for i,c in cf.items()]
for n,c in sorted(pop,key=lambda x:-x[1]): print(f"  {c:6} ({round(c/seen*100)}%)  {n}")
print("CUSTOM fields with ZERO data:")
for n in out["custom_zero"]: print(f"  0       {n}")
