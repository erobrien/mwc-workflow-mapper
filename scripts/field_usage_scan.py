# -*- coding: utf-8 -*-
"""
Read-only field-usage scan. Pages through ALL contacts and tallies how many have
a non-empty value for each custom field. Also flags which fields are referenced
by forms/surveys (wired-in even if currently empty). GET-only; writes
audit/field_usage.json. This is the DRY RUN for any field deletion.

  python scripts/field_usage_scan.py
"""
import json, os, time, urllib.request, urllib.error
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sec = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
B = "https://services.leadconnectorhq.com"

def get(path, version="2021-07-28"):
    r = urllib.request.Request(B + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": version,
        "Accept": "application/json", "User-Agent": "MWC-FieldScan/1.0"}, method="GET")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt); continue
            return e.code, {}
        except Exception:
            if attempt < 3:
                time.sleep(2 ** attempt); continue
            return -1, {}

# --- field catalog ---
_, d = get(f"/locations/{LOC}/customFields")
fields = d.get("customFields", [])
id2name = {f["id"]: f.get("name") for f in fields}
id2key = {f["id"]: f.get("fieldKey") for f in fields}
usage = {f["id"]: 0 for f in fields}
print(f"catalog: {len(fields)} custom fields")

# --- page through all contacts ---
seen = 0
start_after = None
start_after_id = None
page = 0
while True:
    q = f"/contacts/?locationId={LOC}&limit=100"
    if start_after and start_after_id:
        q += f"&startAfter={start_after}&startAfterId={start_after_id}"
    code, payload = get(q)
    if code != 200:
        print("stop: http", code, "after", seen); break
    contacts = payload.get("contacts", [])
    if not contacts:
        break
    for c in contacts:
        seen += 1
        for cf in (c.get("customFields") or c.get("customField") or []):
            fid = cf.get("id")
            val = cf.get("value")
            if fid in usage and val not in (None, "", [], {}):
                usage[fid] += 1
    meta = payload.get("meta", {})
    start_after = meta.get("startAfter")
    start_after_id = meta.get("startAfterId")
    page += 1
    if page % 10 == 0:
        print(f"  scanned {seen} contacts...")
    if not meta.get("nextPageUrl") and not start_after_id:
        break
    if page > 200:  # safety
        print("safety cap hit"); break

print(f"scanned {seen} contacts total")

# --- forms / surveys field references (wired-in even if empty) ---
referenced = set()
for ep, key in [(f"/forms/?locationId={LOC}&limit=100", "forms"),
                (f"/surveys/?locationId={LOC}&limit=50", "surveys")]:
    _, fd = get(ep)
    for item in fd.get(key, []):
        blob = json.dumps(item)
        for fid, nm in id2name.items():
            k = id2key.get(fid, "")
            if (k and k in blob) or (fid in blob):
                referenced.add(fid)

rows = []
for f in fields:
    fid = f["id"]
    rows.append({"id": fid, "name": id2name[fid], "key": id2key[fid], "model": f.get("model"),
                 "used": usage[fid], "pct": round(usage[fid] / seen * 100, 2) if seen else 0,
                 "form_or_survey_ref": fid in referenced})
rows.sort(key=lambda r: r["used"])
out = {"scanned_contacts": seen, "total_fields": len(fields), "fields": rows}
json.dump(out, open(os.path.join(ROOT, "audit", "field_usage.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

zero = [r for r in rows if r["used"] == 0]
zero_unref = [r for r in zero if not r["form_or_survey_ref"]]
print(f"\nZERO population: {len(zero)} fields")
print(f"ZERO population AND not referenced by any form/survey: {len(zero_unref)} (deletion candidates)")
print("saved -> audit/field_usage.json")
