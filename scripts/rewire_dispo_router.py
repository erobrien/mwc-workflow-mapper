# -*- coding: utf-8 -*-
"""Rewire a Cody-pattern PCC Disposition Router in the Cody Neo copy:
after each opportunity stage-move, splice an internal_update_opportunity node
stamping outcome fields on the OPPORTUNITY; after each objection tag, stamp
nosale_reason. Preserves the per-clinic pattern; drafts only.

Usage: python rewire_dispo_router.py <workflow_id>
"""
import json, sys, uuid, copy
import requests, urllib3
urllib3.disable_warnings()

LOC = "YTi6qs4zhiW6d4a75A9f"
B = "https://backend.leadconnectorhq.com"
F = {  # copy's opportunity custom field ids
    "sale_outcome": "F47HFWXTL86avdQ4lbxO",
    "appt_status": "4ook5BOmCs7jwBRoJTmW",
    "pcc": "r0zn7KfY64BFtnUs0WYT",
    "provider": "RcIgOoRyWLDOW5Wr5Ihz",
    "processed_at": "WoXMFU3OgUouCZJhA9Mo",
    "nosale_reason": "jBoYVdQqtBrs1It68GNm",
}
S = requests.Session(); S.verify = False
S.headers.update({"channel": "APP", "source": "WEB_USER", "Version": "2021-07-28",
                  "Accept": "application/json", "Content-Type": "application/json"})


def cif(fid, val, dt="SINGLE_OPTIONS", vft="select"):
    return {"__customInputs__": {}, "dataType": dt, "filterField": fid,
            "value": val, "valueFieldType": vft}


def stamp_node(name, fields):
    return {"id": str(uuid.uuid4()), "order": 0,
            "name": name, "type": "internal_update_opportunity",
            "workflowsActionType": "INTERNAL",
            "attributes": {"allowBackward": True, "type": "internal_update_opportunity",
                           "__customInputs__": {}, "__customInputFields__": fields}}


def outcome_code(name):
    n = name.lower()
    if "mut" in n: return "mut"
    if "mar" in n: return "mar"
    if "sold" in n or "won" in n: return "sold"
    if "a&d" in n or "lost" in n: return "nosale"
    return None


REASON_MAP = {"cost": "cost", "fear": "fear", "partner": "partner",
              "time-to-think": "decision", "timing": "timing"}


def splice_after(tpls_by_id, host, new_node):
    """Insert new_node directly after host in the next-chain."""
    new_node["order"] = host.get("order", 0)
    if "parent" in host: new_node["parent"] = host["parent"]
    if "parentKey" in host: new_node["parentKey"] = host["parentKey"]
    nx = host.get("next")
    if isinstance(nx, str):
        new_node["next"] = nx
    host["next"] = new_node["id"]
    tpls_by_id[new_node["id"]] = new_node
    return new_node


def main(wid):
    tpls = copy.deepcopy(json.load(open(f"ghl_data_build/workflow_steps/{wid}.json"))["templates"])
    byid = {t["id"]: t for t in tpls}
    added = []

    # 1) outcome stamps after each opportunity stage-move
    for t in list(byid.values()):
        if t.get("type") != "create_opportunity": continue
        code = outcome_code(t.get("name", ""))
        if not code: continue
        fields = [
            cif(F["sale_outcome"], code),
            cif(F["appt_status"], "showed"),
            cif(F["pcc"], "{{contact.patient_care_consultant}}", "SINGLE_OPTIONS", "input"),
            cif(F["provider"], "{{contact.provider_making_recommendation}}", "SINGLE_OPTIONS", "input"),
            cif(F["processed_at"], "{{right_now.date_time}}", "TEXT", "input"),
        ]
        n = splice_after(byid, t, stamp_node(f"Opp: stamp outcome fields ({code})", fields))
        added.append((t.get("name", "")[:40], "->", n["name"]))

    # 2) nosale_reason stamps after each objection tag
    seen_reason = set()
    for t in list(byid.values()):
        if t.get("type") != "add_contact_tag": continue
        name = (t.get("name") or "").lower()
        if "objection" not in name: continue
        for k, code in REASON_MAP.items():
            if k in name:
                n = splice_after(byid, t, stamp_node(f"Opp: stamp nosale_reason ({code})",
                                                     [cif(F["nosale_reason"], code)]))
                added.append((t.get("name", "")[:40], "->", n["name"]))
                seen_reason.add(code)
                break

    new_tpls = list(byid.values())
    doc = S.get(f"{B}/workflow/{LOC}/{wid}", params={"includeTriggers": "true"}, timeout=25).json()
    wd = doc["workflowData"]
    full = dict(wd); full["status"] = "draft"
    full["workflowData"] = {"templates": new_tpls}; full["templates"] = new_tpls
    orig_ids = {t["id"] for t in json.load(open(f"ghl_data_build/workflow_steps/{wid}.json"))["templates"]}
    full["createdSteps"] = [t["id"] for t in new_tpls if t["id"] not in orig_ids]
    full["modifiedSteps"] = [t["id"] for t in new_tpls if t["id"] in orig_ids]
    full["deletedSteps"] = []
    r = S.put(f"{B}/workflow/{LOC}/{wid}", json=full, timeout=60)
    print(f"{wd.get('name')}: save={r.status_code} nodes {len(orig_ids)}->{len(new_tpls)} (+{len(added)})")
    if not r.ok:
        print(r.text[:400]); sys.exit(1)
    for a in added: print("  ", *a)
    d2 = S.get(f"{B}/workflow/{LOC}/{wid}", params={"includeTriggers": "true"}, timeout=25).json()
    fu = d2["workflowData"]["fileUrl"]
    json.dump({"fu": fu, "expected": len(new_tpls)}, open(f"/tmp/rewire_{wid}.json", "w"))
    import os
    os.makedirs("ghl_data_build/rewired", exist_ok=True)
    json.dump({"templates": new_tpls}, open(f"ghl_data_build/rewired/{wid}.json", "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
