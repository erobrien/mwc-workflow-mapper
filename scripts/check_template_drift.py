#!/usr/bin/env python3
"""
Drift detector: verify each -Target Release draft SMS/email node's body matches
its declared template body. Since GHL SMS nodes cannot reference templates by ID
(they hold a body copy), the TEMPLATE NAME is the sole linkage. This script
matches each workflow send-node to its template via the naming convention
(<channel>_wf<NN>_<step>) and flags body drift.

Requires a backend JWT (~/.ghl_jwt).
Usage:  python scripts/check_template_drift.py
Exit 1 if any matched node's body diverges from its template body.
"""
import json, re, sys, requests
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
LOC = "Ghstz8eIsHWLeXek47dk"
B = "https://backend.leadconnectorhq.com"
FOLDER = "d15ca26c-3448-4063-a0e5-d4dfa617d76c"
jwt = Path("~/.ghl_jwt").expanduser().read_text().strip()
H = {"Authorization": f"Bearer {jwt}", "token-id": jwt, "channel": "APP",
     "source": "WEB_USER", "Version": "2021-07-28", "Accept": "application/json"}

# template bodies by name + the step label
tpl = json.load(open(HERE / "ghl_data" / "template_payloads.json"))
reg = json.load(open(HERE / "ghl_data" / "build_ids.json"))["message_registry"]
# map: normalized step token -> expected template body, per wf
def norm(s):
    s = re.sub(r'^(sms|email|call|ivr):\s*', '', s.lower())
    s = re.split(r'\s*\(|\s+t[+-]|\s*\bquiet\b', s)[0]  # drop timing suffixes like (T+0, quiet-hours)
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')

templates = {}  # (wf, step_norm) -> body
for p in tpl:
    wf = p["wf"].zfill(2)
    templates[(wf, p["template_name"].split("_", 2)[2])] = p["payload"]["template"].get("body", "")

# fetch draft workflows
rows = requests.get(f"{B}/workflow/{LOC}/list", headers=H,
                    params={"parentId": FOLDER, "limit": 100}, timeout=30).json().get("rows", [])
drift, matched, unmatched = [], 0, 0
for w in rows:
    if w.get("type") == "directory" or not w.get("name", "").startswith("WF-"):
        continue
    wf = w["name"].split()[0].split("-")[1]  # '01' from 'WF-01 ...'
    d = requests.get(f"{B}/workflow/{LOC}/{w['_id']}?includeTriggers=true", headers=H, timeout=20).json()
    g = requests.get(d["workflowData"]["fileUrl"], timeout=15)
    for n in (g.json().get("templates", []) if g.status_code == 200 else []):
        if n.get("type") not in ("sms", "email"):
            continue
        a = n.get("attributes", {})
        node_body = a.get("html", "") if n.get("type") == "email" else a.get("body", "")
        step = norm(n.get("name", ""))
        key = (wf, step)
        if key in templates:
            matched += 1
            if node_body.strip() != templates[key].strip():
                drift.append(f"{w['name']} :: {n.get('name')} (step={step}): BODY DRIFT")
        else:
            unmatched += 1  # node has no template (e.g. call scripts, probes) — expected

print(f"matched nodes: {matched} | drift: {len(drift)} | unmatched (no template, expected): {unmatched}")
for d in drift:
    print("  -", d)
sys.exit(1 if drift else 0)
