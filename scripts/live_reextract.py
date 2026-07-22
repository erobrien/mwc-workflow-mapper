"""One-shot live re-extraction of Active Workflows for the As-Is workspace.

Run window: JWT is short-lived (~1hr). This script:
  1. Lists all workflows in the location (backend API, folder-recursive).
  2. For each: GET /workflow/{loc}/{id}?includeTriggers=true (JWT) to get
     triggers + workflowData.fileUrl.
  3. Downloads fileUrl (Firebase, no auth needed) -> raw step template graph.
  4. Caches the RAW template list to ghl_data/live_raw/<id>.json so later
     re-normalization passes don't need the API again.
  5. Normalizes into the AsisWorkflow schema consumed by plan-workspace
     (id, name, folder, status, updated_at, version, location, triggers,
     steps[], step_counts, n_steps, n_nodes, sms, email).

Credentials come from env vars GHL_PIT / GHL_JWT (never hardcode in the repo).
"""
import json
import os
import time
from pathlib import Path

import requests

LOCATION_ID = "Ghstz8eIsHWLeXek47dk"
BACKEND = "https://backend.leadconnectorhq.com"

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "ghl_data" / "live_reextract"
RAW_DIR = REPO_ROOT / "ghl_data" / "live_raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

PIT = os.environ.get("GHL_PIT", "")
JWT = os.environ.get("GHL_JWT", "")


def backend_headers():
    return {
        "Authorization": f"Bearer {JWT}", "token-id": JWT, "channel": "APP",
        "source": "WEB_USER", "Version": "2021-07-28", "Accept": "application/json",
    }


def list_all_workflows():
    folder_names, folder_parent, wf_rows = {}, {}, {}
    stack = [None]
    visited_folders = set()
    while stack:
        parent = stack.pop()
        if parent in visited_folders:
            continue
        visited_folders.add(parent)
        offset = 0
        while True:
            params = {"limit": 100, "offset": offset, "sortBy": "name", "sortOrder": "asc"}
            if parent:
                params["parentId"] = parent
            r = requests.get(f"{BACKEND}/workflow/{LOCATION_ID}/list", headers=backend_headers(), params=params, timeout=30)
            if r.status_code == 401:
                raise SystemExit("JWT expired mid-run.")
            r.raise_for_status()
            body = r.json()
            rows = body.get("rows") or body.get("workflows") or body.get("data") or (body if isinstance(body, list) else body.get("items", []))
            for row in rows:
                rid = row.get("id") or row.get("_id")
                if row.get("type") == "directory":
                    folder_names[rid] = row.get("name")
                    folder_parent[rid] = row.get("parentId")
                    stack.append(rid)
                    continue
                row["_folder_id"] = parent
                wf_rows[rid] = row
            if len(rows) < 100:
                break
            offset += 100

    def folder_path(fid):
        parts, cur, guard = [], fid, 0
        while cur and guard < 10:
            parts.append(folder_names.get(cur, cur))
            cur = folder_parent.get(cur)
            guard += 1
        return " / ".join(reversed(parts)) if parts else "(root)"

    out = []
    for rid, row in wf_rows.items():
        row["id"] = rid
        row["folder_path"] = folder_path(row.get("_folder_id"))
        row["folder"] = folder_names.get(row.get("_folder_id"), "(root)")
        row["status"] = "published" if (row.get("status") == "published" or row.get("published")) else row.get("status", "draft")
        out.append(row)
    return out


def fetch_workflow_doc(wf_id: str) -> dict:
    r = requests.get(f"{BACKEND}/workflow/{LOCATION_ID}/{wf_id}", headers=backend_headers(),
                      params={"includeTriggers": "true"}, timeout=30)
    if r.status_code == 401:
        raise SystemExit("JWT expired mid-run.")
    r.raise_for_status()
    return r.json()


def fetch_file_url_templates(file_url: str) -> list:
    if not file_url:
        return []
    r = requests.get(file_url, timeout=30)
    r.raise_for_status()
    return r.json().get("templates", [])


NODE_KIND_MAP = {
    "sms": "message", "email": "message", "internal_email": "message",
    "wait": "wait", "if_else": "decision", "goto": "goto",
    "add_contact_tag": "tag", "remove_contact_tag": "tag",
    "create_opportunity": "opportunity", "update_opportunity": "opportunity",
    "internal_update_opportunity": "opportunity", "find_opportunity": "opportunity",
    "remove_opportunity": "opportunity",
    "update_contact_field": "field", "create_update_contact": "field",
    "update_appointment_status": "appointment",
    "google_sheets": "sheets", "webhook": "webhook",
    "ivr_say": "ivr", "ivr_gather": "ivr", "connect_call": "ivr", "collect_voicemail": "ivr",
    "internal_notification": "note",
    "remove_from_workflow": "exit", "transition": "exit",
    "math_operation": "action",
}


def classify(node_type: str) -> str:
    return NODE_KIND_MAP.get((node_type or "").lower(), "action")


def normalize_node(node: dict, name_by_id: dict) -> dict:
    ntype = node.get("type", "")
    kind = classify(ntype)
    attrs = node.get("attributes") or {}
    name = node.get("name") or ntype
    step = {"id": node.get("id"), "type": ntype, "kind": kind, "name": name}

    if kind == "message":
        if ntype == "sms":
            step["detail"] = {"channel": "sms", "body": attrs.get("message") or attrs.get("body") or ""}
        else:
            step["detail"] = {
                "channel": "email", "subject": attrs.get("subject"),
                "from_name": attrs.get("fromName"), "from_email": attrs.get("fromEmail"),
                "body_text": attrs.get("plainText") or attrs.get("html") or "",
            }
    elif kind == "wait":
        sa = attrs.get("startAfter") or {}
        summary = name if name and name != ntype else "wait {} {}".format(sa.get("value", "?"), sa.get("type", "")).strip()
        step["detail"] = {"summary": summary, "description": attrs.get("waitEventType") or ""}
    elif kind == "goto":
        tid = attrs.get("targetNodeId") or attrs.get("gotoId") or attrs.get("targetId")
        step["detail"] = {"target_id": tid, "target_name": name_by_id.get(tid)}
    elif kind == "tag":
        step["detail"] = {"op": "remove" if "remove" in ntype else "add", "tags": attrs.get("tags") or []}
    elif kind == "opportunity":
        step["detail"] = {
            "op": ntype.replace("_", " "),
            "name": attrs.get("opportunity_name") or attrs.get("name"),
            "status": attrs.get("opportunity_status") or attrs.get("status"),
            "value": attrs.get("monetary_value") or attrs.get("monetaryValue") or attrs.get("value"),
            "pipeline_id": attrs.get("pipeline_id") or attrs.get("pipelineId"),
            "stage_id": attrs.get("pipeline_stage_id") or attrs.get("stageId") or attrs.get("pipelineStageId"),
        }
    elif kind == "field":
        cif = attrs.get("__customInputFields__")
        field_names = []
        if isinstance(cif, list):
            field_names = [f.get("filterField") or f.get("name") for f in cif if isinstance(f, dict)]
        elif isinstance(attrs.get("customFields"), dict):
            field_names = list(attrs.get("customFields").keys())
        step["detail"] = {"action": ntype, "fields": [f for f in field_names if f]}
    elif kind == "appointment":
        step["detail"] = {"status": attrs.get("status_type") or attrs.get("appointmentStatus") or attrs.get("status")}
    elif kind == "sheets":
        act = attrs.get("action")
        act_name = act.get("name") if isinstance(act, dict) else act
        sheet = attrs.get("sheet") or {}
        spreadsheet = attrs.get("spreadsheet") or {}
        step["detail"] = {"action": act_name, "spreadsheet": spreadsheet.get("name"), "sheet": sheet.get("name")}
    elif kind == "webhook":
        step["detail"] = {"method": attrs.get("method"), "url": attrs.get("url")}
    elif kind == "ivr":
        step["detail"] = {"message": attrs.get("message") or attrs.get("text"), "num_digits": attrs.get("numDigits")}
    elif kind == "note":
        step["detail"] = {"body_text": attrs.get("message") or attrs.get("body")}
    elif kind == "exit":
        step["detail"] = {"action": name}
    else:
        step["detail"] = {}

    if kind == "decision":
        step["condition_name"] = name
        branches = attrs.get("branches") or []
        step["branches"] = []
        step["none_branch"] = None
        for b in branches:
            conds = []
            for seg in (b.get("segments") or []):
                for c in (seg.get("conditions") or []):
                    conds.append(str(c.get("conditionValue") or c.get("__conditionId") or ""))
            step["branches"].append({
                "label": b.get("name") or "branch",
                "conditions": conds,
                "is_else": bool(b.get("isElse") or b.get("default") or not b.get("name")),
                "steps": [],
            })
    return step


def build_step_tree(templates: list) -> list:
    name_by_id = {t.get("id"): (t.get("name") or t.get("type")) for t in templates}
    ordered = sorted(templates, key=lambda t: t.get("order", 0))
    return [normalize_node(t, name_by_id) for t in ordered]


def process_one(meta: dict) -> dict:
    doc = fetch_workflow_doc(meta["id"])
    wf_data = doc.get("workflowData") or {}
    file_url = wf_data.get("fileUrl") or doc.get("fileUrl")
    templates = []
    try:
        templates = fetch_file_url_templates(file_url)
    except Exception as e:
        print(f"  ! fileUrl fetch failed for {meta.get('name')}: {e}")

    (RAW_DIR / f"{meta['id']}.json").write_text(json.dumps(templates, indent=2), encoding="utf-8")

    triggers_raw = doc.get("triggers") or []
    triggers = [{
        "id": t.get("id"), "name": t.get("name") or t.get("type", "trigger"),
        "type": t.get("type", ""), "active": bool(t.get("status", "active") == "active" or t.get("active", True)),
        "conditions": [str(c) for c in (t.get("conditions") or t.get("filters") or [])],
    } for t in triggers_raw]

    steps = build_step_tree(templates)
    step_counts: dict = {}
    sms = email = 0
    for s in steps:
        step_counts[s["kind"]] = step_counts.get(s["kind"], 0) + 1
        if s["kind"] == "message":
            if s.get("detail", {}).get("channel") == "sms":
                sms += 1
            else:
                email += 1

    out = {
        "id": meta["id"],
        "name": doc.get("name") or meta.get("name"),
        "folder": meta.get("folder_path", meta.get("folder", "")),
        "status": (doc.get("status") or meta.get("status", "draft")).lower(),
        "updated_at": (doc.get("updatedAt") or doc.get("lastUpdated") or "")[:10],
        "version": wf_data.get("version"),
        "location": meta.get("location", ""),
        "triggers": triggers,
        "steps": steps,
        "step_counts": step_counts,
        "n_steps": len(steps),
        "n_nodes": len(templates),
        "sms": sms,
        "email": email,
    }
    (OUT_DIR / f"{meta['id']}.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"  ok {out['name'][:60]:60s} steps={out['n_steps']:4d} sms={sms} email={email} triggers={len(triggers)} status={out['status']}")
    return out


def main():
    print("Listing all workflows (folder-recursive, backend API)...")
    metas = list_all_workflows()
    print(f"Found {len(metas)} workflow rows total.")
    (REPO_ROOT / "ghl_data" / "live_reextract_roster.json").write_text(json.dumps(metas, indent=2), encoding="utf-8")

    results = []
    t0 = time.time()
    for i, m in enumerate(metas, 1):
        elapsed = time.time() - t0
        print(f"[{i}/{len(metas)}] ({elapsed:.0f}s elapsed) {m.get('name')}")
        try:
            results.append(process_one(m))
        except SystemExit:
            raise
        except Exception as e:
            print(f"  FAILED: {e}")
        time.sleep(0.2)

    (REPO_ROOT / "ghl_data" / "live_reextract_all.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nDone. {len(results)}/{len(metas)} workflows extracted -> ghl_data/live_reextract_all.json")


if __name__ == "__main__":
    main()
