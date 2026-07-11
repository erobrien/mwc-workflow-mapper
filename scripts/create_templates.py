#!/usr/bin/env python3
"""
Create the 15 MWC message templates in GHL from ghl_data/template_payloads.json.
Requires a backend JWT (not the PIT) — templates need write scope the PIT lacks.

Usage:
  python scripts/create_templates.py            # uses ~/.ghl_jwt
  python scripts/create_templates.py --dry-run # print payloads, don't POST

Safe: only CREATES new templates under sms_wfNN_*/email_wfNN_* naming.
Never edits or deletes existing live templates. Skips name collisions.
"""
import json, sys, os, requests
from pathlib import Path

LOC = "Ghstz8eIsHWLeXek47dk"
BASE = "https://services.leadconnectorhq.com"
HERE = Path(__file__).resolve().parent.parent
PAYLOADS = json.load(open(HERE / "ghl_data" / "template_payloads.json"))

jwt = Path("~/.ghl_jwt").expanduser().read_text().strip()
H = {
    "Authorization": f"Bearer {jwt}", "token-id": jwt,
    "channel": "APP", "source": "WEB_USER",
    "Version": "2021-07-28", "Accept": "application/json", "Content-Type": "application/json",
}

dry = "--dry-run" in sys.argv

# existing names for collision skip
r = requests.get(f"{BASE}/locations/{LOC}/templates", headers=H, timeout=20)
existing = {t["name"] for t in r.json().get("templates", [])}
print(f"existing templates: {len(existing)}")

created = {}
for p in PAYLOADS:
    name = p["template_name"]
    if name in existing:
        print(f"  SKIP (exists): {name}")
        continue
    if dry:
        print(f"  DRY: {name} -> {p['payload']['template'].get('body','')[:60]}")
        continue
    r = requests.post(f"{BASE}/locations/{LOC}/templates", headers=H, json=p["payload"], timeout=20)
    if r.status_code in (200, 201):
        d = r.json().get("template") or r.json()
        created[name] = d.get("id")
        print(f"  CREATED {name}: {d.get('id')}")
    else:
        print(f"  FAILED {name}: {r.status_code} {r.text[:150]}")

if not dry and created:
    out = HERE / "ghl_data" / "created_templates.json"
    json.dump(created, open(out, "w"), indent=2)
    print(f"\nsaved {len(created)} ids -> {out}")
