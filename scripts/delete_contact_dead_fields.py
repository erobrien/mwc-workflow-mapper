# -*- coding: utf-8 -*-
"""
Delete the 27 dead contact custom fields (0 values in the last 30 days).
Matched by fieldKey where possible; the 6 junk-named ones resolve by exact name
with a uniqueness check. Guard: aborts any field whose last-30d usage != 0
(per audit/contact_recent_usage.json). Reports all-time count for transparency.
  python scripts/delete_contact_dead_fields.py
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

BY_KEY = [
    "contact.other", "contact.reason", "contact.service", "contact.select_office",
    "contact.lead_location", "contact.survery_feedback_score", "contact.requested_callback_time",
    "contact.fatigue_frequency", "contact.referral_status", "contact.referred_by",
    "contact.survey_steps_completed", "contact.how_did_you_hear_about_us_message",
    "contact.latest_lead_source_id", "contact.lab_date",
    "contact.electronic_signature_type_full_legal_name", "contact.emergency_contact_relationship",
    "contact.price__item_3", "contact.term_length__item_3", "contact.product_sold__item_3",
    "contact.how_did_you_hear_about_us",   # 19-record stray (NOT the 909 _mens_wellness_centers twin)
]
BY_NAME = [
    "Have you ever been diagnosed with any of the following? (Check all that apply) (copy)",
    "Multi Line 71uz", "Radio Location", "Other Cancellation Reason",
    "Consultation Disposition", "Renewal Date", "Referral Source Detail",
]

# last-30d guard
rec = {r["name"]: r for r in json.load(open(os.path.join(ROOT,"audit","contact_recent_usage.json"),encoding="utf-8"))["fields"]}

# live catalog
_, d = call("GET", f"/locations/{LOC}/customFields?model=contact")
fields = [f for f in d.get("customFields", []) if f.get("model") == "contact"]
by_key = {f.get("fieldKey"): f for f in fields}
by_name = {}
for f in fields:
    by_name.setdefault(f.get("name"), []).append(f)

targets = []
for k in BY_KEY:
    targets.append(("key", k))
for n in BY_NAME:
    targets.append(("name", n))

print(f"{'TARGET':58} {'30d':>4} {'all':>5}  result")
print("-" * 92)
deleted = skipped = 0
for kind, val in targets:
    if kind == "key":
        f = by_key.get(val)
    else:
        matches = by_name.get(val, [])
        f = matches[0] if len(matches) == 1 else None
        if len(matches) > 1:
            print(f"{val[:58]:58} {'?':>4} {'?':>5}  SKIP — name not unique"); skipped += 1; continue
    if not f:
        print(f"{val[:58]:58} {'-':>4} {'-':>5}  SKIP — not found"); skipped += 1; continue
    name = f.get("name")
    r = rec.get(name, {})
    d30 = r.get("last_30d", "?"); allt = r.get("all_time", "?")
    if d30 not in (0,):
        print(f"{name[:58]:58} {str(d30):>4} {str(allt):>5}  ABORT — recent usage > 0"); skipped += 1; continue
    code, resp = call("DELETE", f"/locations/{LOC}/customFields/{f['id']}")
    ok = resp.get("succeded") or resp.get("succeeded") or code in (200,201)
    print(f"{name[:58]:58} {d30:>4} {allt:>5}  {'DELETED' if ok else 'FAIL '+str(code)}")
    deleted += 1 if ok else 0
    skipped += 0 if ok else 1

print(f"\ndeleted {deleted} · skipped {skipped}")
_, d = call("GET", f"/locations/{LOC}/customFields?model=contact")
print("contact fields now:", len([f for f in d.get('customFields',[]) if f.get('model')=='contact']))
