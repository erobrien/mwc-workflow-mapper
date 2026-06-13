"""Pull all workflows + messages via the GHL app backend (requires JWT in ~/.ghl_jwt).

This is the PREFERRED path -- it returns full workflow JSON (steps, branches, waits,
message refs). Run probe() first to confirm the response shape, then adjust the
normalize_* field names to match before bulk-running main().
"""
import json
import time

import requests

from auth import BACKEND, DATA_DIR, LOCATION_ID, STEPS_DIR, backend_headers

KIND_MAP = {
    "sendsms": "send_sms",
    "sendemail": "send_email",
    "addremovetag": "add_tag",
    "ifelse": "if_else",
    "wait": "wait",
    "updatecontactfield": "update_field",
    "addopportunity": "move_pipeline",
    "webhook": "webhook",
    "endworkflow": "end",
}


def fetch_workflow(wf_id: str) -> dict:
    url = f"{BACKEND}/workflow/{LOCATION_ID}/{wf_id}"
    r = requests.get(url, headers=backend_headers(), timeout=30)
    if r.status_code == 401:
        raise SystemExit("JWT expired or invalid. Refresh it from DevTools into ~/.ghl_jwt.")
    r.raise_for_status()
    return r.json()


def fetch_message_templates() -> dict:
    url = f"{BACKEND}/conversations/templates/{LOCATION_ID}"
    r = requests.get(url, headers=backend_headers(), timeout=30)
    r.raise_for_status()
    return r.json()


def normalize_step(raw: dict, idx: int) -> dict:
    t = str(raw.get("type", "")).lower()
    step = {
        "id": raw.get("id") or f"step-{idx}",
        "index": idx,
        "type": KIND_MAP.get(t, "action"),
        "title": raw.get("name") or raw.get("title") or t,
        "parent_id": raw.get("parentId"),
        "branch": raw.get("branch"),
        "next_id": raw.get("nextStepId"),
        "raw": raw,
    }
    if step["type"] == "send_sms":
        step["sms"] = {
            "template_id": raw.get("templateId"),
            "template_name": raw.get("templateName"),
            "from": raw.get("from"),
            "body": raw.get("body") or raw.get("message"),
        }
    elif step["type"] == "send_email":
        step["email"] = {
            "template_id": raw.get("templateId"),
            "template_name": raw.get("templateName"),
            "from": raw.get("from"),
            "subject": raw.get("subject"),
            "html": raw.get("html") or raw.get("body"),
            "plain": raw.get("plainText"),
        }
    elif step["type"] == "wait":
        step["wait"] = {
            "duration": raw.get("duration") or raw.get("value"),
            "unit": raw.get("unit") or raw.get("type"),
            "until_event": raw.get("untilEvent"),
            "business_hours": raw.get("businessHours", False),
        }
    elif step["type"] == "add_tag":
        step["tag"] = {
            "action": "remove" if raw.get("action") == "remove" else "add",
            "name": raw.get("tagName") or raw.get("name"),
        }
    elif step["type"] == "if_else":
        branches = raw.get("branches") or raw.get("branchList") or raw.get("goalEvents") or []
        step["condition"] = {
            "label": raw.get("name"),
            "branches": [
                {"label": b.get("name"), "next_id": b.get("nextStepId"),
                 "expression": b.get("expression")}
                for b in branches
            ],
        }
    return step


def normalize_trigger(raw: dict) -> dict:
    return {
        "id": raw.get("id"),
        "type": raw.get("type") or raw.get("eventType"),
        "filters": raw.get("filters", []),
        "raw": raw,
    }


def process_workflow(wf_meta: dict) -> dict:
    raw = fetch_workflow(wf_meta["id"])
    body = raw.get("workflow") or raw.get("data") or raw
    triggers = [normalize_trigger(t) for t in
                (body.get("triggers") or body.get("triggerList") or [])]
    raw_steps = body.get("steps") or body.get("nodes") or []
    steps = [normalize_step(s, i) for i, s in enumerate(raw_steps)]

    messages_referenced = []
    sms_count = email_count = wait_count = if_count = 0
    for s in steps:
        if s["type"] == "send_sms":
            messages_referenced.append({"step_id": s["id"], "kind": "sms",
                                        "template_id": s["sms"].get("template_id"),
                                        "template_name": s["sms"].get("template_name")})
            sms_count += 1
        elif s["type"] == "send_email":
            messages_referenced.append({"step_id": s["id"], "kind": "email",
                                        "template_id": s["email"].get("template_id"),
                                        "template_name": s["email"].get("template_name")})
            email_count += 1
        elif s["type"] == "wait":
            wait_count += 1
        elif s["type"] == "if_else":
            if_count += 1

    out = {
        "id": wf_meta["id"],
        "name": wf_meta["name"],
        "folder": wf_meta["folder"],
        "status": wf_meta.get("status", "Published"),
        "version": body.get("version", 1),
        "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "extraction_method": "backend_jwt",
        "triggers": triggers,
        "steps": steps,
        "messages_referenced": messages_referenced,
        "stats": {
            "total_steps": len(steps),
            "send_sms_count": sms_count,
            "send_email_count": email_count,
            "wait_count": wait_count,
            "if_else_count": if_count,
            "terminal_paths": sum(1 for s in steps if s["type"] == "end"),
        },
        "notes": "",
    }
    (STEPS_DIR / f"{wf_meta['id']}.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"  ok {wf_meta['name']}: {len(steps)} steps, {sms_count} SMS, {email_count} email")
    return out


def probe(wf_id: str = "063460e9-68d9-458d-85e0-cb45df4952a2") -> None:
    """Print the first 5000 chars of one workflow's raw backend response."""
    print(json.dumps(fetch_workflow(wf_id), indent=2)[:5000])


def main() -> None:
    STEPS_DIR.mkdir(parents=True, exist_ok=True)
    workflows = json.loads((DATA_DIR / "workflows_to_extract.json").read_text(encoding="utf-8"))
    print(f"Pulling {len(workflows)} workflows via JWT backend...")
    for i, wf in enumerate(workflows, 1):
        print(f"[{i}/{len(workflows)}] {wf['name']}")
        try:
            process_workflow(wf)
        except Exception as e:
            print(f"  FAILED: {e}")
        time.sleep(0.4)

    print("\nPulling message templates...")
    try:
        templates = fetch_message_templates()
        (DATA_DIR / "templates_full.json").write_text(json.dumps(templates, indent=2), encoding="utf-8")
        print(f"  ok {len(templates.get('sms', []))} SMS, {len(templates.get('emails', []))} email")
    except Exception as e:
        print(f"  template pull failed: {e}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "probe":
        probe(*sys.argv[2:])
    else:
        main()
