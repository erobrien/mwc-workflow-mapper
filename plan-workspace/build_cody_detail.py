# -*- coding: utf-8 -*-
"""
Build the Cody (Cavenaugh Media) build-account dataset from the live GHL
extraction of sub-account VoeVvlByAem9pkxb7f6a (ghl_data_cody/).

Reuses the resolver from build_asis_detail.py so Cody workflows render
node-for-node identically to the Current State views. Nothing is rewritten:
names, statuses and message copy are carried verbatim.

Output: public/cody-detail.json   (same schema as asis-detail.json)
  python build_cody_detail.py
"""
import json, os

import build_asis_detail as B

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "ghl_data_cody")
STEPS = os.path.join(DATA, "workflow_steps")
LOCATION_ID = "VoeVvlByAem9pkxb7f6a"


def load_merged():
    """Merge {id}.doc.json (workflowData + triggers) with {id}.json (templates)
    into the shape build_asis_detail expects."""
    roster = json.load(open(os.path.join(DATA, "workflows.json"), encoding="utf-8"))
    merged = []
    for r in roster:
        wid = r.get("_id") or r.get("id")
        doc_p = os.path.join(STEPS, f"{wid}.doc.json")
        stp_p = os.path.join(STEPS, f"{wid}.json")
        if not os.path.exists(doc_p):
            continue
        doc = json.load(open(doc_p, encoding="utf-8"))
        wd = doc.get("workflowData") or {}
        templates = []
        if os.path.exists(stp_p):
            templates = json.load(open(stp_p, encoding="utf-8")).get("templates", [])
        merged.append({
            "id": wid,
            "name": wd.get("name", r.get("name", "")),
            "folder": r.get("_folderPath") or "Uncategorized",
            "status": wd.get("status", ""),
            "updatedAt": wd.get("updatedAt", ""),
            "version": wd.get("version"),
            "triggers": doc.get("triggers", []),
            "templates": templates,
        })
    return merged


def main():
    workflows = []
    total_sms = total_email = total_steps = total_triggers = 0

    for w in load_merged():
        tpl = {t["id"]: t for t in w["templates"]}
        trig_names = {tr["id"]: tr.get("name", "") for tr in w["triggers"]}
        triggers = [{
            "id": tr.get("id", ""),
            "name": tr.get("name", ""),
            "type": tr.get("type", ""),
            "active": bool(tr.get("active", True)),
            "conditions": [B.trigger_condition_text(c) for c in tr.get("conditions", [])
                           if B.trigger_condition_text(c)],
        } for tr in w["triggers"]]

        refd = set()
        for t in w["templates"]:
            nx = t.get("next")
            if isinstance(nx, list):
                refd.update(nx)
            elif isinstance(nx, str):
                refd.add(nx)
        roots = [t["id"] for t in w["templates"] if t["id"] not in refd and not t.get("parent")]
        msg_counter = {"sms": 0, "email": 0}
        seen = set()
        steps = []
        for r in roots:
            steps.extend(B.resolve(r, tpl, trig_names, seen, msg_counter))

        kinds = B.count_kinds(steps, {})
        n_steps = sum(kinds.values())
        total_sms += msg_counter["sms"]
        total_email += msg_counter["email"]
        total_steps += n_steps
        total_triggers += len(triggers)

        workflows.append({
            "id": w["id"], "name": w["name"], "folder": w["folder"],
            "status": w["status"], "updated_at": (w.get("updatedAt") or "")[:10],
            "version": w.get("version"), "location": B.detect_location(w["name"]),
            "triggers": triggers, "steps": steps, "step_counts": kinds,
            "n_steps": n_steps, "n_nodes": len(tpl),
            "sms": msg_counter["sms"], "email": msg_counter["email"],
        })

    folder_names = sorted({w["folder"] for w in workflows})
    workflows.sort(key=lambda w: (folder_names.index(w["folder"]), w["name"].lower()))
    folders = [{"name": f, "count": sum(1 for w in workflows if w["folder"] == f)}
               for f in folder_names]

    out = {
        "scope": "Cody (Cavenaugh Media) build sub-account — live API extraction",
        "extraction_method": "ghl_backend_api",
        "location_id": LOCATION_ID,
        "coverage": {
            "total": len(workflows),
            "published": sum(1 for w in workflows if w["status"] == "published"),
            "draft": sum(1 for w in workflows if w["status"] != "published"),
            "total_steps": total_steps, "total_triggers": total_triggers,
            "total_sms": total_sms, "total_email": total_email,
            "with_steps": sum(1 for w in workflows if w["n_steps"] > 0),
        },
        "out_of_scope_count": 0,
        "roster_total": len(workflows),
        "folders": folders,
        "workflows": workflows,
    }
    dest = os.path.join(HERE, "public", "cody-detail.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # light roster for global search (name/id only — keeps ⌘K fast)
    idx = [{"id": w["id"], "name": w["name"], "status": w["status"], "folder": w["folder"]}
           for w in workflows]
    json.dump(idx, open(os.path.join(HERE, "public", "cody-index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    c = out["coverage"]
    print("wrote public/cody-detail.json")
    print(f"  workflows   : {c['total']} ({c['published']} published / {c['draft']} draft)")
    print(f"  total steps : {c['total_steps']} | triggers {c['total_triggers']} | sms {c['total_sms']} | email {c['total_email']}")
    print(f"  folders     : {[f['name'] + ' (' + str(f['count']) + ')' for f in folders]}")


if __name__ == "__main__":
    main()
