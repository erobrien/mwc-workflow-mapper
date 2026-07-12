#!/usr/bin/env python3
"""
Deploy Decision 19 into the -Target Release drafts: rebuild WF-07 (five objection
branches) and WF-09 (three temperature tiers) with the JJ cadences and the
brand-transformed message bodies from ghl_data/template_payloads.json.

DRAFT-ONLY: saves step graphs into the existing draft workflows in -Target Release.
No triggers attached, no publish, nothing fires.

Requires backend JWT (~/.ghl_jwt). Usage: python scripts/enrich_wf07_09.py
"""
import json, re, sys, uuid, requests
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
LOC = "Ghstz8eIsHWLeXek47dk"
B = "https://backend.leadconnectorhq.com"
FOLDER = "d15ca26c-3448-4063-a0e5-d4dfa617d76c"
jwt = Path("~/.ghl_jwt").expanduser().read_text().strip()
H = {"Authorization": f"Bearer {jwt}", "token-id": jwt, "channel": "APP",
     "source": "WEB_USER", "Version": "2021-07-28", "Accept": "application/json",
     "Content-Type": "application/json"}

tp = json.load(open(HERE / "ghl_data" / "template_payloads.json"))
def body_of(name):
    for t in tp:
        if t["template_name"] == name:
            return t["payload"]["template"]
    raise KeyError(name)

def nid(): return str(uuid.uuid4())

def tag_seg(tag):
    return {"__segmentId": nid(), "operator": "and", "conditions": [{
        "conditionType": "contact_detail", "conditionSubType": "tags",
        "conditionOperator": "is_any_of", "conditionValue": [tag],
        "__conditionId": nid(), "ifElseNodeId": "", "__customFieldType__": "standard", "isWait": False}]}

def branch(name, tag):
    return {"id": nid(), "name": name, "segments": [tag_seg(tag)],
            "operator": "and", "showErrors": False, "branchNameError": False}

def chain(parent_id, wf, segment, cadence):
    """Build wait->msg chain under a branch. cadence = [(days, template_name), ...]"""
    nodes, prev = [], None
    for i, (days, tname) in enumerate(cadence):
        w = {"id": nid(), "order": i * 2, "type": "wait", "name": f"Wait {days}d",
             "attributes": {"type": "time", "startAfter": {"type": "days", "value": days, "when": "after"}}}
        t = body_of(tname)
        if tname.startswith("sms"):
            m = {"id": nid(), "order": i * 2 + 1, "type": "sms",
                 "name": f"SMS: {segment} touch {i+1} [{tname}]",
                 "attributes": {"body": t["body"], "attachments": []}}
        else:
            m = {"id": nid(), "order": i * 2 + 1, "type": "email",
                 "name": f"Email: {segment} touch {i+1} [{tname}]",
                 "attributes": {"subject": t.get("subject", ""), "html": t["body"], "type": "email"}}
        if prev is None:
            w["parent"] = parent_id; w["parentKey"] = parent_id
        else:
            prev["next"] = w["id"]
        w["next"] = m["id"]
        nodes += [w, m]; prev = m
    return nodes

def seq(wf, segment, n_touches, pattern, channels):
    """cadence list [(days, template)] using registered template names."""
    out, ti = [], 0
    for i in range(n_touches):
        days = pattern[i % len(pattern)]
        ti += 1
        ch = channels[i % len(channels)]
        out.append((days, f"{ch}_wf{wf}_{segment}_t{ti}"))
    return out

def available(wf, segment):
    names = [t["template_name"] for t in tp if t.get("segment") == segment and t["wf"] == wf]
    # order by seq number
    return sorted(names, key=lambda n: int(re.search(r'_t(\d+)$', n).group(1)))

def build_wf(prefix, router_name, branches_def):
    rows = requests.get(f"{B}/workflow/{LOC}/list", headers=H,
                        params={"parentId": FOLDER, "limit": 100}, timeout=30).json().get("rows", [])
    w = next(x for x in rows if x.get("name", "").startswith(prefix))
    wid = w["_id"]
    wd = requests.get(f"{B}/workflow/{LOC}/{wid}?includeTriggers=true", headers=H, timeout=30).json()["workflowData"]
    brs, kids = [], []
    for bname, tag, segment, pattern in branches_def:
        br = branch(bname, tag)
        brs.append(br)
        names = available(prefix.split("-")[1].strip()[:2], segment)
        cadence = []
        for i, tname in enumerate(names):
            days = pattern[i % len(pattern)]
            cadence.append((days, tname))
        kids += chain(br["id"], prefix, segment, cadence)
    router = {"id": nid(), "order": 0, "type": "if_else", "name": router_name,
              "attributes": {"currentRecipeType": "CUSTOM", "branches": brs, "operator": "and",
                             "if": True, "conditionName": router_name, "version": 2,
                             "noneBranchName": "No matching tag (exit)"}}
    tpl = [router] + kids
    full = dict(wd); full["name"] = w["name"]; full["parentId"] = FOLDER; full["status"] = "draft"
    full["workflowData"] = {"templates": tpl}; full["templates"] = tpl
    full["createdSteps"] = [t["id"] for t in tpl]; full["modifiedSteps"] = []; full["deletedSteps"] = []
    r = requests.put(f"{B}/workflow/{LOC}/{wid}", headers=H, json=full, timeout=60)
    print(f"{w['name']}: save -> {r.status_code}" + ("" if r.status_code == 200 else f" {r.text[:150]}"))
    if r.status_code == 200:
        d2 = requests.get(f"{B}/workflow/{LOC}/{wid}?includeTriggers=true", headers=H, timeout=30).json()
        g = requests.get(d2["workflowData"]["fileUrl"], timeout=20)
        print(f"  readback: {len(g.json().get('templates', []))} nodes | status {d2['workflowData']['status']}")

# WF-07: objections, 1d/2d/3d cycling
build_wf("WF-07", "D19: objection branch router", [
    ("Cost", "objection_cost", "cost", [1, 2, 3]),
    ("Fear", "objection_fear", "fear", [1, 2, 3]),
    ("Partner", "objection_partner", "partner", [1, 2, 3]),
    ("Timing", "objection_timing", "timing", [1, 2, 3]),
    ("Decision", "objection_decision", "decision", [1, 2, 3]),
])
# WF-09: temperature tiers
build_wf("WF-09", "D19: temperature tier router", [
    ("HOT", "temp_hot", "hot", [3, 4, 5]),
    ("WARM", "temp_warm", "warm", [7, 10, 14, 14, 20]),
    ("COLD", "temp_cold", "cold", [30, 45, 14]),
])
print("\nDONE. Both drafts remain status=draft, zero triggers.")
