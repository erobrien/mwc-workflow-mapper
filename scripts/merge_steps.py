"""Build mwc-asis/public/app.json from extracted data.

Combines:
  ghl_data/workflows_to_extract.json   (workflow list + folder grouping)
  ghl_data/workflow_steps/*.json        (extracted steps/triggers per workflow)
  ghl_data/sms_templates.json           (SMS template library)
  ghl_data/email_templates.json         (email template library)

Inlines message bodies into send_sms / send_email steps by template id, writes
ghl_data/app.json, and copies it to mwc-asis/public/app.json so the viewer picks
it up on the next build / dev reload.
"""
import json
import os

from auth import DATA_DIR, REPO_ROOT, STEPS_DIR

APP_JSON = DATA_DIR / "app.json"
VIEWER_PUBLIC = REPO_ROOT / "mwc-asis" / "public" / "app.json"


def _load(path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _index_templates(items, kind):
    """Return {id: {id, template_name, from, body|subject/html}} for a template list."""
    out = {}
    for t in items or []:
        tid = t.get("id") or t.get("_id") or t.get("templateId")
        if not tid:
            continue
        if kind == "sms":
            out[tid] = {
                "id": tid,
                "template_name": t.get("name") or t.get("templateName"),
                "from": t.get("from"),
                "body": t.get("body") or t.get("message") or t.get("sms", {}).get("message"),
            }
        else:
            out[tid] = {
                "id": tid,
                "template_name": t.get("name") or t.get("templateName"),
                "from": t.get("from"),
                "subject": t.get("subject"),
                "html": t.get("html") or t.get("body"),
                "plain": t.get("plainText") or t.get("plain"),
            }
    return out


def main() -> None:
    workflows_meta = _load(DATA_DIR / "workflows_to_extract.json", [])
    sms_lib = _index_templates(_load(DATA_DIR / "sms_templates.json", []), "sms")
    email_lib = _index_templates(_load(DATA_DIR / "email_templates.json", []), "email")

    workflows = []
    folders: dict[str, list[str]] = {}
    for meta in workflows_meta:
        wid = meta["id"]
        wf = {
            "id": wid,
            "name": meta.get("name"),
            "folder": meta.get("folder"),
            "status": meta.get("status", "Published"),
            "triggers": [],
            "steps": [],
            "stats": {},
            "extracted": False,
            "extraction_method": None,
            "extracted_at": None,
        }

        step_file = STEPS_DIR / f"{wid}.json"
        if step_file.exists():
            data = json.loads(step_file.read_text(encoding="utf-8"))
            wf["triggers"] = data.get("triggers", [])
            wf["steps"] = data.get("steps", [])
            wf["stats"] = data.get("stats", {})
            wf["extracted"] = bool(wf["steps"])
            wf["extraction_method"] = data.get("extraction_method")
            wf["extracted_at"] = data.get("extracted_at")

            for s in wf["steps"]:
                if s.get("type") == "send_sms" and isinstance(s.get("sms"), dict):
                    tid = s["sms"].get("template_id")
                    if tid in sms_lib and not s["sms"].get("body"):
                        s["sms"]["body"] = sms_lib[tid]["body"]
                elif s.get("type") == "send_email" and isinstance(s.get("email"), dict):
                    tid = s["email"].get("template_id")
                    if tid in email_lib:
                        s["email"].setdefault("subject", email_lib[tid].get("subject"))
                        if not s["email"].get("html"):
                            s["email"]["html"] = email_lib[tid].get("html")

        workflows.append(wf)
        folders.setdefault(wf["folder"] or "Ungrouped", []).append(wid)

    app = {
        "generated_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        "folders": [{"name": k, "workflows": v} for k, v in folders.items()],
        "workflows": workflows,
        "messages": {
            "sms": list(sms_lib.values()),
            "email": list(email_lib.values()),
        },
    }

    APP_JSON.write_text(json.dumps(app, indent=2), encoding="utf-8")
    VIEWER_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    VIEWER_PUBLIC.write_text(json.dumps(app, indent=2), encoding="utf-8")

    extracted = sum(1 for w in workflows if w["extracted"])
    print(f"Built app.json: {len(workflows)} workflows ({extracted} with steps), "
          f"{len(sms_lib)} SMS + {len(email_lib)} email templates "
          f"({os.path.getsize(APP_JSON) // 1024} KB)")
    print(f"  -> {APP_JSON}")
    print(f"  -> {VIEWER_PUBLIC}")


if __name__ == "__main__":
    main()
