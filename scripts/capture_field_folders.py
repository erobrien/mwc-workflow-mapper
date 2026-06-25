# -*- coding: utf-8 -*-
"""Augment plan-workspace/public/custom_fields.json with the REAL current folder of each
contact custom field (GHL parentId -> folder name), plus a folders summary.

Lightweight: fetches the field schema (has parentId) and resolves each distinct folder id
to its name. Does NOT re-scan contacts (usage counts already captured).

  python scripts/capture_field_folders.py
"""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path
ROOT = Path(__file__).parent.parent
sec = json.load(open(ROOT / "secrets.json", encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
B = "https://services.leadconnectorhq.com"
CF = ROOT / "plan-workspace" / "public" / "custom_fields.json"
w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))

def get(path, version="2021-07-28"):
    r = urllib.request.Request(B + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": version,
        "Accept": "application/json", "User-Agent": "MWC-FolderCap/1.0"}, method="GET")
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {}

# 1. schema with parentId
code, data = get(f"/locations/{LOC}/customFields?model=contact")
assert code == 200, f"schema HTTP {code}"
schema = data.get("customFields", [])
id_parent = {f["id"]: f.get("parentId") for f in schema}

# 2. resolve folder ids -> names
folder_ids = sorted({pid for pid in id_parent.values() if pid})
folder_name = {}
for fid in folder_ids:
    c, d = get(f"/locations/{LOC}/customFields/{fid}")
    cf = (d or {}).get("customField") or {}
    folder_name[fid] = cf.get("name", "(unknown)")
w("resolved %d folders:" % len(folder_name))
for fid, nm in folder_name.items():
    w("  %-26s %s" % (fid, nm))

# 3. merge into custom_fields.json
cfj = json.load(open(CF, encoding="utf-8"))
counts = {}
for fld in cfj["fields"]:
    pid = id_parent.get(fld["id"])
    nm = folder_name.get(pid, "(no folder)")
    fld["folder"] = nm
    fld["folder_id"] = pid
    counts[nm] = counts.get(nm, 0) + 1

cfj["folders"] = [{"id": fid, "name": nm, "field_count": sum(1 for f in cfj["fields"] if f.get("folder_id") == fid)}
                  for fid, nm in folder_name.items()]
json.dump(cfj, open(CF, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

w("\nfields per folder (in custom_fields.json):")
for nm, c in sorted(counts.items(), key=lambda x: -x[1]):
    w("  %3d  %s" % (c, nm))
w("\nwrote folder + folder_id onto %d fields" % len(cfj["fields"]))
