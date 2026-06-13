"""Pull the workflow list + message templates from the GHL public REST API.

This uses the location-scoped PIT token (services.leadconnectorhq.com). The public
API can LIST workflows but does NOT expose their internal steps -- that requires the
JWT backend path (extract_via_jwt.py) or the browser fallback (extract_via_browser.py).

Outputs (under ghl_data/):
  workflows.json             raw list of all workflows
  folder_workflows.json      folder -> [workflow ids] (derived from name prefix)
  workflows_to_extract.json  the workflows scoped to the Active Workflows folders
  sms_templates.json         SMS templates with bodies (best effort)
  email_templates.json       email templates with subjects/HTML (best effort)
"""
import json
import sys

import requests

from auth import DATA_DIR, LOCATION_ID, SERVICES, services_headers

# Name prefixes that mark a workflow as belonging to the "Active Workflows" folders.
# The GHL public API does not return folder metadata, so we group by the leading
# code in each workflow name (e.g. "01A. ...", "02. ...", "Onboarding ...").
ACTIVE_FOLDER_PREFIXES = {
    "01": "01. WP Lead Capture",
    "02": "02. Appointments & Visit Journey",
    "03": "03. Call Routing & Dispositions",
    "04": "04. System Admin & Error Handling",
    "onboarding": "Onboarding",
}


def _get(path: str, params: dict | None = None) -> dict:
    url = f"{SERVICES}{path}"
    r = requests.get(url, headers=services_headers(), params=params or {}, timeout=30)
    if r.status_code == 401:
        raise SystemExit("401 Unauthorized. Check the location PIT token (~/.ghl_pit).")
    r.raise_for_status()
    return r.json()


def list_workflows() -> list[dict]:
    data = _get("/workflows/", {"locationId": LOCATION_ID})
    wfs = data.get("workflows") or data.get("data") or []
    print(f"  fetched {len(wfs)} workflows")
    return wfs


def folder_for(name: str) -> str | None:
    n = (name or "").strip().lower()
    if n.startswith("onboarding"):
        return ACTIVE_FOLDER_PREFIXES["onboarding"]
    code = n[:2]
    return ACTIVE_FOLDER_PREFIXES.get(code)


def list_templates() -> tuple[list[dict], list[dict]]:
    """Best-effort pull of SMS + email templates. Endpoint shapes vary; we save
    whatever comes back and split by type."""
    sms, email = [], []
    try:
        data = _get("/conversations/templates", {"locationId": LOCATION_ID, "limit": 200})
        items = data.get("templates") or data.get("data") or []
        for t in items:
            kind = (t.get("type") or t.get("templateType") or "").lower()
            (email if "email" in kind else sms).append(t)
        print(f"  templates: {len(sms)} sms, {len(email)} email")
    except Exception as e:
        print(f"  ! template pull failed ({e}); leaving template files empty")
    return sms, email


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Pulling workflows...")
    workflows = list_workflows()
    (DATA_DIR / "workflows.json").write_text(json.dumps(workflows, indent=2), encoding="utf-8")

    folder_map: dict[str, list[str]] = {}
    to_extract: list[dict] = []
    for wf in workflows:
        folder = folder_for(wf.get("name", ""))
        if not folder:
            continue
        wid = wf.get("id")
        folder_map.setdefault(folder, []).append(wid)
        to_extract.append({
            "id": wid,
            "name": wf.get("name"),
            "folder": folder,
            "status": wf.get("status", "Published"),
            "url": f"https://app.gohighlevel.com/location/{LOCATION_ID}/workflow/{wid}",
        })

    (DATA_DIR / "folder_workflows.json").write_text(json.dumps(folder_map, indent=2), encoding="utf-8")
    (DATA_DIR / "workflows_to_extract.json").write_text(json.dumps(to_extract, indent=2), encoding="utf-8")
    print(f"  -> {len(to_extract)} workflows in Active Workflows folders "
          f"across {len(folder_map)} folders")

    print("Pulling templates...")
    sms, email = list_templates()
    (DATA_DIR / "sms_templates.json").write_text(json.dumps(sms, indent=2), encoding="utf-8")
    (DATA_DIR / "email_templates.json").write_text(json.dumps(email, indent=2), encoding="utf-8")

    print("\nDone. Review ghl_data/workflows_to_extract.json before extracting.")
    if len(to_extract) != 25:
        print(f"  NOTE: expected 25, got {len(to_extract)}. Folder grouping is "
              "heuristic (by name prefix) -- adjust ACTIVE_FOLDER_PREFIXES if needed.",
              file=sys.stderr)


if __name__ == "__main__":
    main()
