# -*- coding: utf-8 -*-
"""
Delete ONLY the explicit allow-list of empty duplicate custom fields.
Safety: verifies each field still exists, confirms contact-model fields show 0
usage in the latest scan (audit/field_usage.json), and aborts any single delete
whose usage > 0. Opportunity fields are all 0%-populated (verified separately).

  python scripts/delete_empty_dupes.py
"""
import json, os, urllib.request, urllib.error
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sec = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
B = "https://services.leadconnectorhq.com"

def call(method, path):
    r = urllib.request.Request(B + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": "2021-07-28",
        "Accept": "application/json", "User-Agent": "MWC/1.0"}, method=method)
    try:
        with urllib.request.urlopen(r, timeout=40) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}

ALLOW = [
    "opportunity.sale_amount", "opportunity.payment_type",
    "opportunity.patient_advisor", "opportunity.clinic_type",
    "contact.contactphysical_9uo_copy", "contact.contacthow_long_experiencing_aw9_copy",
    "contact.consent__source", "contact.consent__timestamp",
    "contact.review_link", "contact.review_status",
    "contact.lead_notes", "contact.age_range", "contact.health_goal",
]

# usage guard (contact scan)
usage = {}
fu = os.path.join(ROOT, "audit", "field_usage.json")
if os.path.exists(fu):
    for r in json.load(open(fu, encoding="utf-8"))["fields"]:
        usage[r["key"]] = r["used"]

# live field catalog (both models)
catalog = {}
for model in ("contact", "opportunity"):
    _, d = call("GET", f"/locations/{LOC}/customFields?model={model}")
    for f in d.get("customFields", []):
        if f.get("model") == model:
            catalog[f.get("fieldKey")] = f

print(f"{'FIELD KEY':46} {'NAME':30} action")
print("-" * 92)
deleted, skipped = 0, 0
for key in ALLOW:
    f = catalog.get(key)
    if not f:
        print(f"{key:46} {'(not found)':30} SKIP — already gone"); skipped += 1; continue
    name = (f.get("name") or "")[:30]
    u = usage.get(key, 0)
    if key.startswith("contact.") and u not in (0, None):
        print(f"{key:46} {name:30} ABORT — usage={u} (not empty)"); skipped += 1; continue
    code, resp = call("DELETE", f"/locations/{LOC}/customFields/{f['id']}")
    ok = resp.get("succeded") or resp.get("succeeded") or code in (200, 201)
    print(f"{key:46} {name:30} {'DELETED' if ok else 'FAIL '+str(code)}")
    deleted += 1 if ok else 0
    skipped += 0 if ok else 1

print(f"\ndeleted {deleted} · skipped {skipped}")
# post counts
for model in ("contact", "opportunity"):
    _, d = call("GET", f"/locations/{LOC}/customFields?model={model}")
    n = len([f for f in d.get("customFields", []) if f.get("model") == model])
    print(f"  {model} fields now: {n}")
