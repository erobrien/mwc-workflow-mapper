# -*- coding: utf-8 -*-
"""Splice a frozen attribution stamp onto the opportunity in each Lead
Notification workflow of the Cody Neo copy, right after the opportunity create.
Written once at create (frozen record of what created the deal); the contact
keeps GHL-native living attribution. Drafts only.

Usage: python stamp_lead_attribution.py <workflow_id>
"""
import json, sys, uuid, copy
import requests, urllib3
urllib3.disable_warnings()

LOC = "YTi6qs4zhiW6d4a75A9f"
B = "https://backend.leadconnectorhq.com"
F = {"lead_source": "EbNCM03ezhFQSCFs7Is8", "utm_source": "7oahfAuuSaBq76JfKoiJ",
     "utm_campaign": "C0Y1d3vIinecWMZCDh3j", "utm_medium": "dgjKeITqHaxBvPUA9gJY",
     "gclid": "iGeHeJeXmHEn43v3Y9K9", "fbclid": "KseXPBZO6P5Abn4uQNiy"}
S = requests.Session(); S.verify = False
S.headers.update({"channel": "APP", "source": "WEB_USER", "Version": "2021-07-28",
                  "Accept": "application/json", "Content-Type": "application/json"})


def cif(fid, val):
    return {"__customInputs__": {}, "dataType": "TEXT", "filterField": fid,
            "value": val, "valueFieldType": "input"}


def main(wid):
    tpls = copy.deepcopy(json.load(open(f"ghl_data_build/workflow_steps/{wid}.json"))["templates"])
    byid = {t["id"]: t for t in tpls}
    hosts = [t for t in tpls if t.get("type") in ("create_opportunity","internal_create_opportunity")]
    if not hosts:
        print(wid, "no create_opportunity node found"); return
    added = 0
    for host in hosts:
        node = {"id": str(uuid.uuid4()), "order": host.get("order", 0),
                "name": "Opp: stamp attribution at create (frozen)",
                "type": "internal_update_opportunity", "workflowsActionType": "INTERNAL",
                "attributes": {"allowBackward": True, "type": "internal_update_opportunity",
                               "__customInputs__": {}, "__customInputFields__": [
                    cif(F["lead_source"], "{{contact.attributionSource.sessionSource}}"),
                    cif(F["utm_source"], "{{contact.attributionSource.utmSource}}"),
                    cif(F["utm_medium"], "{{contact.attributionSource.utmMedium}}"),
                    cif(F["utm_campaign"], "{{contact.attributionSource.campaign}}"),
                    cif(F["gclid"], "{{contact.attributionSource.gclid}}"),
                    cif(F["fbclid"], "{{contact.attributionSource.fbclid}}"),
                ]}}
        if "parent" in host: node["parent"] = host["parent"]
        if "parentKey" in host: node["parentKey"] = host["parentKey"]
        nx = host.get("next")
        if isinstance(nx, str): node["next"] = nx
        host["next"] = node["id"]
        byid[node["id"]] = node
        added += 1
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
    print(f"{wd.get('name')}: save={r.status_code} nodes {len(orig_ids)}->{len(new_tpls)} (+{added})")
    if not r.ok: print(r.text[:300]); sys.exit(1)
    d2 = S.get(f"{B}/workflow/{LOC}/{wid}", params={"includeTriggers": "true"}, timeout=25).json()
    json.dump({"fu": d2["workflowData"]["fileUrl"], "expected": len(new_tpls)},
              open(f"/tmp/rewire_{wid}.json", "w"))


if __name__ == "__main__":
    main(sys.argv[1])
