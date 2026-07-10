# -*- coding: utf-8 -*-
"""
Integrate the live GHL "Active Workflows" extraction into the repo.

Source of truth (read-only, NOT committed): /home/user/workspace/ghl_extract/
  active_workflows.json      the 28 in-scope workflows (id, name, status, folder)
  full_{id}.json             backend response: workflowData + triggers + dependentAssets
  def_{id}.json              the complete step graph: {"templates": [...]}

For each of the 28 active workflows this writes one merged, sanitised file to
  ghl_data/workflow_steps/{id}.json   = doc metadata + triggers + full step graph
and regenerates
  ghl_data/workflows_to_extract.json  from active_workflows.json (28 entries).

SECURITY: every signed URL / token query string is stripped before writing.
The JWT and any ?token=/Signature=/X-Amz-* query strings never reach the repo.

  python scripts/integrate_ghl_extract.py
"""
import json, os, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = "/home/user/workspace/ghl_extract"
STEPS_DIR = os.path.join(ROOT, "ghl_data", "workflow_steps")
LOC = "Ghstz8eIsHWLeXek47dk"

# query-string markers that indicate a signed / tokenised URL
SIGNED = re.compile(r"(?:token|Signature|X-Amz-[A-Za-z]+|Expires|GoogleAccessId|"
                    r"alt=media|se|sig|sv|sp|sr|st|skoid|sktid|X-Goog-[A-Za-z-]+)=", re.I)


def scrub(v):
    """Recursively strip signed query strings from any URL-ish string value."""
    if isinstance(v, str):
        if "?" in v:
            base, q = v.split("?", 1)
            if SIGNED.search(q):
                return base  # drop the whole (signed) query string
        return v
    if isinstance(v, list):
        return [scrub(x) for x in v]
    if isinstance(v, dict):
        return {k: scrub(x) for k, x in v.items()}
    return v


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    active = load(os.path.join(SRC, "active_workflows.json"))
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # wipe stale stub files so workflow_steps holds exactly the 28 in-scope files
    if os.path.isdir(STEPS_DIR):
        for fn in os.listdir(STEPS_DIR):
            if fn.endswith(".json"):
                os.remove(os.path.join(STEPS_DIR, fn))
    else:
        os.makedirs(STEPS_DIR)

    to_extract = []
    for w in active:
        wid = w["id"]
        full = load(os.path.join(SRC, f"full_{wid}.json"))
        defn = load(os.path.join(SRC, f"def_{wid}.json"))

        wd = dict(full.get("workflowData", {}))
        wd.pop("workflowData", None)     # drop redundant self-nested copy
        wd.pop("permission", None)

        merged = {
            "id": wid,
            "name": w["name"],
            "folder": w["folder"],
            "status": w["status"],
            "updatedAt": w.get("updatedAt", ""),
            "version": wd.get("version"),
            "extracted_at": now,
            "extraction_method": "ghl_backend_api",
            "source": "GHL Active Workflows (live API)",
            "workflowData": scrub(wd),
            "triggers": scrub(full.get("triggers", [])),
            "dependentAssets": scrub(full.get("dependentAssets", {})),
            "templates": scrub(defn.get("templates", [])),
        }
        with open(os.path.join(STEPS_DIR, f"{wid}.json"), "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=1)

        to_extract.append({
            "id": wid,
            "name": w["name"],
            "folder": w["folder"],
            "status": w["status"],
            "url": f"https://app.gohighlevel.com/location/{LOC}/workflow/{wid}",
        })

    to_extract.sort(key=lambda x: (x["folder"], x["name"]))
    with open(os.path.join(ROOT, "ghl_data", "workflows_to_extract.json"), "w",
              encoding="utf-8") as f:
        json.dump(to_extract, f, ensure_ascii=False, indent=2)

    print(f"wrote {len(active)} merged files to ghl_data/workflow_steps/")
    print(f"regenerated ghl_data/workflows_to_extract.json ({len(to_extract)} entries)")
    # sanity: assert no signed tokens survived
    leaks = 0
    for fn in os.listdir(STEPS_DIR):
        txt = open(os.path.join(STEPS_DIR, fn), encoding="utf-8").read()
        for marker in ("token=", "X-Amz-", "Signature=", "GoogleAccessId"):
            if marker in txt:
                leaks += 1
                print("  !! LEAK", marker, "in", fn)
    print("token-leak check:", "clean" if leaks == 0 else f"{leaks} LEAKS")


if __name__ == "__main__":
    main()
