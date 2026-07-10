# -*- coding: utf-8 -*-
"""
Build the Current State dataset from the live GHL "Active Workflows" extraction.

Scope (Eric's directive): the Current State views cover ONLY the workflows under
GHL's "Active Workflows" folder, and must be 100% accurate to that extraction.
Source of truth = the 28 merged files written by
  scripts/integrate_ghl_extract.py  ->  ../ghl_data/workflow_steps/{id}.json
each of which carries the doc metadata + triggers + the complete step graph
(templates[]) exactly as returned by the GHL backend (signed URLs stripped).

Nothing here is rewritten into brand voice — message copy, names and statuses are
carried verbatim.  For each workflow we resolve the step graph into an ordered,
branch-aware tree the frontend can render node-for-node.

Output: public/asis-detail.json
  python build_asis_detail.py
"""
import json, os, re, glob, html as _html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STEPS = os.path.join(ROOT, "ghl_data", "workflow_steps")
ROSTER = os.path.join(ROOT, "ghl_data", "workflows.json")

FOLDER_ORDER = [
    "01. WP Lead Capture", "02. Appointments & Visit Journey",
    "03. Call Routing & Dispositions", "04. System Admin & Error Handling",
    "Onboarding", "Vercel",
]

# node.type -> render category (kind) used by the frontend
KIND = {
    "sms": "message", "email": "message", "internal_notification": "message",
    "wait": "wait", "transition": "wait",
    "if_else": "decision",
    "goto": "goto",
    "add_contact_tag": "tag", "remove_contact_tag": "tag",
    "create_opportunity": "opportunity", "internal_create_opportunity": "opportunity",
    "remove_opportunity": "opportunity", "internal_update_opportunity": "opportunity",
    "find_opportunity": "opportunity",
    "update_contact_field": "field", "create_update_contact": "field",
    "update_appointment_status": "appointment", "event_start_date": "appointment",
    "google_sheets": "sheets",
    "webhook": "webhook",
    "ivr_say": "ivr", "ivr_gather": "ivr", "ivr_connect_call": "ivr",
    "ivr_collect_voicemail": "ivr", "call": "ivr", "manual-call": "ivr",
    "add_notes": "note",
    "dnd_contact": "dnd",
    "remove_from_workflow": "exit", "workflow_goal": "exit",
    "add_to_workflow": "workflow", "workflow_split": "workflow",
    "assign_user": "action", "remove_assigned_user": "action",
    "task-notification": "action", "math_operation": "action",
}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"[ \t]*\n[ \t]*")


def html_to_text(h):
    """Plain-text preview of email/note HTML. Merge fields ({{...}}) preserved.
    No live HTML is ever executed — this is a sanitised text projection."""
    if not h:
        return ""
    t = h.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    t = re.sub(r"</p>", "\n\n", t, flags=re.I)
    t = re.sub(r"</div>", "\n", t, flags=re.I)
    t = re.sub(r"</li>", "\n", t, flags=re.I)
    t = re.sub(r"<li[^>]*>", " - ", t, flags=re.I)
    t = TAG_RE.sub("", t)
    t = _html.unescape(t)
    t = WS_RE.sub("\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def wait_summary(at):
    sa = at.get("startAfter")
    if isinstance(sa, dict) and sa.get("value") is not None:
        unit = sa.get("type", "")
        val = sa.get("value")
        when = sa.get("when", "after")
        unit_s = unit if str(val) != "1" else unit.rstrip("s")
        return f"Wait {val} {unit_s} ({when})"
    # hybrid / wait-until-condition
    return "Wait until condition met"


def trigger_condition_text(c):
    title = c.get("title") or c.get("field") or ""
    op = c.get("operator", "")
    val = c.get("value")
    if isinstance(val, list):
        val = ", ".join(str(v) for v in val)
    return " ".join(x for x in (title, op, str(val) if val not in (None, "") else "") if x).strip()


def branch_condition_text(seg_list, trig_names):
    """Human summary of a branch's condition segments."""
    out = []
    for seg in seg_list or []:
        for c in seg.get("conditions", []):
            ct = c.get("conditionType", "")
            cop = c.get("conditionOperator", "")
            cv = c.get("conditionValue", "")
            if ct == "trigger" and cv in trig_names:
                out.append(f"triggered by “{trig_names[cv]}”")
            elif isinstance(cv, (str, int, float)) and cv != "":
                label = c.get("__customFieldTitle__") or ct or "field"
                out.append(f"{label} {cop} {cv}".strip())
            elif ct:
                out.append(ct)
    return out


def opportunity_detail(t):
    at = t["attributes"]
    if t["type"] == "internal_create_opportunity":
        stage = ""
        for f in at.get("__customInputFields__", []):
            if f.get("filterField") == "pipelineStageId":
                stage = f.get("value", "")
        return {"op": "create", "pipeline_id": at.get("pipelineId", ""),
                "stage_id": stage, "status": "", "name": "", "value": ""}
    return {
        "op": "remove" if t["type"] == "remove_opportunity" else
              ("update" if t["type"] == "internal_update_opportunity" else "create"),
        "pipeline_id": at.get("pipeline_id", ""),
        "stage_id": at.get("pipeline_stage_id", ""),
        "status": at.get("opportunity_status", ""),
        "name": at.get("opportunity_name", ""),
        "value": at.get("monetary_value", ""),
        "scope": at.get("opportunity_to_be_found", ""),
    }


def build_node(t, tpl, trig_names, msg_counter):
    """Resolve one template node into a render-ready step dict (no children yet)."""
    ty = t["type"]
    at = t.get("attributes", {}) or {}
    kind = KIND.get(ty, "action")
    node = {"id": t["id"], "type": ty, "kind": kind, "name": t.get("name", "") or ty}
    d = {}

    if ty == "sms":
        d = {"channel": "sms", "body": at.get("body", ""),
             "attachments": len(at.get("attachments", []) or [])}
        msg_counter["sms"] += 1
    elif ty == "email":
        d = {"channel": "email", "subject": at.get("subject", ""),
             "from_name": at.get("from_name", ""), "from_email": at.get("from_email", ""),
             "preheader": at.get("preHeader", ""),
             "body_text": html_to_text(at.get("html", "")),
             "attachments": len(at.get("attachments", []) or [])}
        msg_counter["email"] += 1
    elif ty == "internal_notification":
        em = at.get("email", {}) or {}
        d = {"channel": "internal email", "subject": em.get("subject", ""),
             "body_text": html_to_text(em.get("html", ""))}
        msg_counter["email"] += 1
    elif kind == "wait":
        d = {"summary": wait_summary(at) if ty == "wait" else "Wait for condition",
             "description": at.get("description", "")}
    elif ty == "goto":
        tgt = at.get("targetNodeId", "")
        d = {"target_id": tgt, "target_name": tpl.get(tgt, {}).get("name", "") if tgt in tpl else ""}
    elif kind == "tag":
        d = {"op": "add" if ty == "add_contact_tag" else "remove", "tags": at.get("tags", []) or []}
    elif kind == "opportunity":
        d = opportunity_detail(t)
    elif ty == "update_contact_field":
        d = {"action": at.get("actionType", ""),
             "fields": [f.get("title", "") for f in at.get("fields", []) if f.get("title")]}
    elif ty == "create_update_contact":
        d = {"action": "create/update contact"}
    elif ty == "update_appointment_status":
        d = {"status": at.get("status_type", "")}
    elif ty == "google_sheets":
        d = {"action": (at.get("action") or {}).get("name", ""),
             "spreadsheet": (at.get("spreadsheet") or {}).get("name", ""),
             "sheet": (at.get("sheet") or {}).get("name", "")}
    elif ty == "webhook":
        d = {"method": at.get("method", ""), "url": at.get("url", "")}
    elif kind == "ivr":
        d = {"message": at.get("message", ""), "num_digits": at.get("numDigits"),
             "widget": at.get("widgetType", "")}
    elif ty == "add_notes":
        d = {"body_text": html_to_text(at.get("html", ""))}
    elif ty == "dnd_contact":
        d = {"direction": at.get("dnd_direction", ""), "mode": at.get("dnd_contact", ""),
             "channels": at.get("specific_channels", []) or []}
    elif ty == "workflow_goal":
        d = {"action": at.get("action", "")}
    elif ty == "remove_from_workflow":
        d = {"action": "remove from workflow"}

    if d:
        node["detail"] = d
    return node


def resolve(start_id, tpl, trig_names, seen, msg_counter):
    """Follow next-pointers from start_id, returning an ordered list of steps.
    next=list => decision node (fan-out into labelled branches); next=str => linear."""
    seq = []
    cur = start_id
    while cur and cur in tpl and cur not in seen:
        t = tpl[cur]
        seen.add(cur)
        nx = t.get("next")
        node = build_node(t, tpl, trig_names, msg_counter)
        if isinstance(nx, list):  # decision / fan-out
            node["kind"] = "decision"
            at = t.get("attributes", {}) or {}
            by_id = {b.get("id"): b for b in at.get("branches", []) or []}
            branches = []
            for cid in nx:
                child = tpl.get(cid)
                if not child:
                    continue
                bmeta = by_id.get(cid)
                label = (bmeta or {}).get("name") or child.get("name") or "branch"
                conds = branch_condition_text((bmeta or {}).get("segments"), trig_names)
                # if_else branch containers are pass-through: recurse their next.
                if child["type"] == "if_else" and isinstance(child.get("next"), str):
                    seen.add(cid)
                    steps = resolve(child["next"], tpl, trig_names, seen, msg_counter)
                else:
                    steps = resolve(cid, tpl, trig_names, seen, msg_counter)
                branches.append({"label": label, "conditions": conds, "steps": steps})
            none_name = at.get("noneBranchName")
            if none_name and not any(b["label"] == none_name for b in branches):
                for b in branches:  # tag the fall-through branch when unlabelled
                    if not b["conditions"]:
                        b["is_else"] = True
            node["condition_name"] = at.get("conditionName", "")
            node["branches"] = branches
            node["none_branch"] = none_name or ""
            seq.append(node)
            break  # branches are the continuation; nothing linear follows a decision
        seq.append(node)
        cur = nx if isinstance(nx, str) else None
    return seq


def count_kinds(steps, acc):
    for s in steps:
        acc[s["kind"]] = acc.get(s["kind"], 0) + 1
        for b in s.get("branches", []):
            count_kinds(b["steps"], acc)
    return acc


def detect_location(name):
    low = name.lower()
    for label, pat in [("Newport News", r"newport|npn"),
                       ("Richmond", r"richmond|\brva\b"),
                       ("Virginia Beach", r"virginia beach|va beach|\bvba\b"),
                       ("Home", r"\bhome\b"),
                       ("Consultation", r"consultation")]:
        if re.search(pat, low):
            return label
    return ""


def main():
    files = sorted(glob.glob(os.path.join(STEPS, "*.json")))
    workflows = []
    total_sms = total_email = total_steps = total_triggers = 0

    for p in files:
        w = json.load(open(p, encoding="utf-8"))
        tpl = {t["id"]: t for t in w.get("templates", [])}

        # verbatim trigger list with conditions
        trig_names = {tr["id"]: tr.get("name", "") for tr in w.get("triggers", [])}
        triggers = []
        for tr in w.get("triggers", []):
            triggers.append({
                "id": tr.get("id", ""),
                "name": tr.get("name", ""),
                "type": tr.get("type", ""),
                "active": bool(tr.get("active", True)),
                "conditions": [trigger_condition_text(c) for c in tr.get("conditions", []) if trigger_condition_text(c)],
            })

        # resolve step graph: single root = not referenced by any next/goto/parent
        refd = set()
        for t in w.get("templates", []):
            nx = t.get("next")
            if isinstance(nx, list):
                refd.update(nx)
            elif isinstance(nx, str):
                refd.add(nx)
        roots = [t["id"] for t in w.get("templates", []) if t["id"] not in refd and not t.get("parent")]
        msg_counter = {"sms": 0, "email": 0}
        seen = set()
        steps = []
        for r in roots:
            steps.extend(resolve(r, tpl, trig_names, seen, msg_counter))

        kinds = count_kinds(steps, {})
        n_steps = sum(kinds.values())
        total_sms += msg_counter["sms"]
        total_email += msg_counter["email"]
        total_steps += n_steps
        total_triggers += len(triggers)

        workflows.append({
            "id": w["id"],
            "name": w["name"],
            "folder": w.get("folder", "Uncategorized"),
            "status": w.get("status", ""),
            "updated_at": (w.get("updatedAt") or "")[:10],
            "version": w.get("version"),
            "location": detect_location(w["name"]),
            "triggers": triggers,
            "steps": steps,
            "step_counts": kinds,
            "n_steps": n_steps,
            "n_nodes": len(tpl),
            "sms": msg_counter["sms"],
            "email": msg_counter["email"],
        })

    workflows.sort(key=lambda w: (FOLDER_ORDER.index(w["folder"]) if w["folder"] in FOLDER_ORDER else 99,
                                  w["name"].lower()))

    folders = []
    for f in FOLDER_ORDER:
        ids = [w for w in workflows if w["folder"] == f]
        if ids:
            folders.append({"name": f, "count": len(ids)})

    roster_total = len(json.load(open(ROSTER, encoding="utf-8"))) if os.path.exists(ROSTER) else 0
    out_of_scope = max(roster_total - len(workflows), 0)

    out = {
        "scope": "GHL Active Workflows folder — live API extraction",
        "extraction_method": "ghl_backend_api",
        "location_id": "Ghstz8eIsHWLeXek47dk",
        "coverage": {
            "total": len(workflows),
            "published": sum(1 for w in workflows if w["status"] == "published"),
            "draft": sum(1 for w in workflows if w["status"] != "published"),
            "total_steps": total_steps,
            "total_triggers": total_triggers,
            "total_sms": total_sms,
            "total_email": total_email,
            "with_steps": sum(1 for w in workflows if w["n_steps"] > 0),
        },
        "out_of_scope_count": out_of_scope,
        "roster_total": roster_total,
        "folders": folders,
        "workflows": workflows,
    }

    dest = os.path.join(HERE, "public", "asis-detail.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("wrote public/asis-detail.json")
    c = out["coverage"]
    print(f"  workflows      : {c['total']} ({c['published']} published / {c['draft']} draft)")
    print(f"  total steps    : {c['total_steps']} | triggers {c['total_triggers']} | sms {c['total_sms']} | email {c['total_email']}")
    print(f"  folders        : {[f['name'] + f' ({f['count']})' for f in folders]}")
    print(f"  out of scope   : {out_of_scope} of {roster_total} roster workflows")


if __name__ == "__main__":
    main()
