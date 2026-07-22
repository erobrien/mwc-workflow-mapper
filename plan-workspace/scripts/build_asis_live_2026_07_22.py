"""Merge the 2026-07-22 live re-extraction (ghl_data/live_reextract_priority.json)
with the analysis notes (analysis_2026_07_22.py) into the plan-workspace's
public/asis-detail.json + public/asis-flows.json, replacing the prior
2026-05-18 snapshot. Adds an `analysis` object per workflow (summary,
severity, findings[], recommendation) rendered as a new section under the
workflow title on the As-Is detail page.

Scope note: this run covers the 30 workflows under the live "Active Workflows"
folder tree plus 15 additional PUBLISHED, live-firing workflows outside that
folder (Affiliate Marketing, Paid Marketing Attribution, Social Call) that
directly bear on the Won/Lost and cancel/reschedule investigation. The other
~51 draft/JJ-legacy workflows in the location are out of scope for this pass,
consistent with the existing as-is scope boundary.
"""
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analysis_2026_07_22 import ANALYSIS  # noqa: E402

LIVE_PATH = REPO_ROOT / "ghl_data" / "live_reextract_priority.json"
PUB_DIR = REPO_ROOT / "plan-workspace" / "public"
LOCATION_ID = "Ghstz8eIsHWLeXek47dk"

FOLDER_DISPLAY = {
    "Active Workflows / 01. WP Lead Capture": "01. WP Lead Capture",
    "Active Workflows / 02. Appointments & Visit Journey": "02. Appointments & Visit Journey",
    "Active Workflows / 03. Call Routing & Dispositions": "03. Call Routing & Dispositions",
    "Active Workflows / 04. System Admin & Error Handling": "04. System Admin & Error Handling",
    "Active Workflows / AI Call": "AI Call (new, drafts, added 2026-07-21)",
    "Active Workflows / PCC": "PCC",
    "Active Workflows / Vercel": "Vercel",
    "Affiliate Marketing": "Affiliate Marketing (live, outside Active Workflows)",
    "Paid Marketing Attribution": "Paid Marketing Attribution (live, outside Active Workflows)",
    "Social Call": "Social Call (live, outside Active Workflows)",
}


def display_folder(raw_folder_path: str) -> str:
    return FOLDER_DISPLAY.get(raw_folder_path, raw_folder_path)


def count_kinds(steps):
    counts = {}

    def walk(items):
        for s in items:
            counts[s["kind"]] = counts.get(s["kind"], 0) + 1
            for b in (s.get("branches") or []):
                walk(b.get("steps", []))
    walk(steps)
    return counts


def main():
    live = json.loads(LIVE_PATH.read_text())
    print(f"Loaded {len(live)} live-extracted workflows.")

    workflows = []
    matched_analysis = 0
    for w in live:
        folder_disp = display_folder(w["folder"])
        counts = count_kinds(w["steps"]) or w.get("step_counts", {})
        out = {
            "id": w["id"],
            "name": w["name"],
            "folder": folder_disp,
            "status": w["status"],
            "updated_at": w.get("updated_at") or "2026-07-22",
            "version": w.get("version"),
            "location": "",
            "triggers": w["triggers"],
            "steps": w["steps"],
            "step_counts": counts,
            "n_steps": w["n_steps"],
            "n_nodes": w["n_nodes"],
            "sms": w["sms"],
            "email": w["email"],
        }
        analysis = ANALYSIS.get(w["name"])
        if analysis:
            out["analysis"] = analysis
            matched_analysis += 1
        else:
            out["analysis"] = {
                "summary": f"Live-remapped {w['updated_at'] or '2026-07-22'} via the GHL backend API "
                            f"({w['n_steps']} steps, {len(w['triggers'])} trigger(s)). Not yet given a "
                            "full engineering write-up in this pass -- flagged for the next review cycle.",
                "severity": "none",
                "findings": [],
                "recommendation": "",
            }
        workflows.append(out)

    print(f"Matched hand-written analysis for {matched_analysis}/{len(workflows)} workflows.")

    workflows.sort(key=lambda w: (w["folder"], w["name"]))

    folders = []
    seen = {}
    for w in workflows:
        seen[w["folder"]] = seen.get(w["folder"], 0) + 1
    for name, count in seen.items():
        folders.append({"name": name, "count": count})
    folders.sort(key=lambda f: f["name"])

    total_steps = sum(w["n_steps"] for w in workflows)
    total_triggers = sum(len(w["triggers"]) for w in workflows)
    total_sms = sum(w["sms"] for w in workflows)
    total_email = sum(w["email"] for w in workflows)
    published = sum(1 for w in workflows if w["status"] == "published")
    draft = sum(1 for w in workflows if w["status"] != "published")

    detail = {
        "scope": "Live production re-extraction, 2026-07-22: the 30 workflows under "
                 "GHL's 'Active Workflows' folder tree (28 published + 2 new drafts under "
                 "a folder named 'AI Call' created 2026-07-21) PLUS 15 additional PUBLISHED "
                 "workflows outside that folder that are live-firing today and directly bear "
                 "on the Won/Lost and cancel/reschedule investigation (Affiliate Marketing, "
                 "Paid Marketing Attribution, Social Call). 45 workflows total in this pass. "
                 "~51 other draft/legacy workflows in the location (mostly the 'JJ' funnel "
                 "folder and Bot Fanatics/No-Show Monivan folders) remain out of scope, "
                 "consistent with the prior as-is boundary.",
        "extraction_method": "backend_api_jwt_live_2026_07_22",
        "location_id": LOCATION_ID,
        "coverage": {
            "total": len(workflows),
            "published": published,
            "draft": draft,
            "total_steps": total_steps,
            "total_triggers": total_triggers,
            "total_sms": total_sms,
            "total_email": total_email,
            "with_steps": len(workflows),
        },
        "out_of_scope_count": 81 - len(workflows),
        "roster_total": 81,
        "folders": folders,
        "workflows": workflows,
    }

    (PUB_DIR / "asis-detail.json").write_text(json.dumps(detail, indent=2), encoding="utf-8")
    print(f"Wrote {PUB_DIR / 'asis-detail.json'} ({len(workflows)} workflows, {total_steps} steps).")

    # ---- flows (simple auto-generated Mermaid per workflow) ----
    flows = []
    for w in workflows:
        lines = ["flowchart TD"]
        node_ids = {}

        def nid(step_id):
            if step_id not in node_ids:
                node_ids[step_id] = f"N{len(node_ids)+1}"
            return node_ids[step_id]

        def esc(s):
            return (s or "").replace('"', "'").replace("\n", " ")[:60]

        def emit(items, parent_node=None):
            prev = parent_node
            for s in items:
                n = nid(s["id"])
                label = f"{s['kind']} · {esc(s['name'])}"
                shape_open, shape_close = ("[", "]") if s["kind"] != "decision" else ("{", "}")
                lines.append(f'    {n}{shape_open}"{label}"{shape_close}')
                if prev:
                    lines.append(f"    {prev} --> {n}")
                prev = n
                for b in (s.get("branches") or []):
                    bn = f"{n}_{esc(b['label'])[:10].replace(' ', '_')}"
                    if b.get("steps"):
                        emit(b["steps"], n)
            return prev

        emit(w["steps"])
        src = "\n".join(lines) if len(lines) > 1 else "flowchart TD\n    N1[\"No steps\"]"

        n_branches = w["step_counts"].get("decision", 0)
        n_waits = w["step_counts"].get("wait", 0)
        n_gotos = w["step_counts"].get("goto", 0)
        n_opps = w["step_counts"].get("opportunity", 0)

        flows.append({
            "key": w["id"], "id": w["id"], "name": w["name"], "folder": w["folder"],
            "status": w["status"], "n_steps": w["n_steps"], "n_sms": w["sms"], "n_email": w["email"],
            "n_triggers": len(w["triggers"]), "n_branches": n_branches, "n_waits": n_waits,
            "n_gotos": n_gotos, "n_opps": n_opps,
            "title": w["name"],
            "desc": f"{len(w['triggers'])} trigger(s) · {w['n_steps']} steps · {n_branches} branches · "
                    f"{n_gotos} goto · {n_opps} opp moves — live 2026-07-22",
            "src": src,
        })

    flows_out = {"location_id": LOCATION_ID, "folders": folders, "flows": flows}
    (PUB_DIR / "asis-flows.json").write_text(json.dumps(flows_out, indent=2), encoding="utf-8")
    print(f"Wrote {PUB_DIR / 'asis-flows.json'} ({len(flows)} flows).")


if __name__ == "__main__":
    main()
