"""Second pass, 2026-07-22: update the remaining as-is surfaces (Diagrams,
Flows page chrome, Field Inventory / data.json, Audit Gaps) to reflect the
live re-map, and add two new targeted diagrams isolating the cancel-event
fan-out and the SHOWED-form fan-out. Does not touch the To-Be / Cody /
Cody Neo surfaces.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"

# ---------------------------------------------------------------------------
# 1. data.json: refresh as_is_workflows counts for the 45 live-remapped rows,
#    append new defects D9-D12, bump generated_at.
# ---------------------------------------------------------------------------
data = json.loads((PUB / "data.json").read_text())
asis_detail = json.loads((PUB / "asis-detail.json").read_text())
live_by_id = {w["id"]: w for w in asis_detail["workflows"]}

updated = 0
for row in data["as_is_workflows"]:
    lw = live_by_id.get(row["id"])
    if not lw:
        continue
    counts = lw["step_counts"]
    row["status"] = lw["status"]
    row["updated_at"] = lw["updated_at"]
    row["steps"] = lw["n_steps"]
    row["sms"] = lw["sms"]
    row["email"] = lw["email"]
    row["wait"] = counts.get("wait", 0)
    row["branch"] = counts.get("decision", 0)
    row["tag"] = counts.get("tag", 0)
    row["opp"] = counts.get("opportunity", 0)
    row["triggers"] = [{"name": t["name"], "type": t["type"], "active": t["active"]} for t in lw["triggers"]]
    updated += 1
print(f"data.json: refreshed counts for {updated}/{len(live_by_id)} live workflows in as_is_workflows.")

NEW_DEFECTS = [
    {
        "id": "D9", "title": "Cancel event has 3 independent opportunity/sheet writers",
        "severity": "Critical",
        "evidence": "Live 2026-07-22 re-map: '05. Clinic Appt Outcome', '03d. Update Appointment "
                     "Status', and 'Cancelled Appointments' all trigger on Appointment Status = "
                     "Cancelled independently. 05 and Cancelled Appointments both run create_opportunity "
                     "(not update) into the same per-clinic lost pipeline/stage.",
        "impact": "A single cancellation can mint 2+ duplicate Lost opportunities plus a sheet row, "
                   "with no Modified-By gating or single-writer coordination between the three workflows.",
    },
    {
        "id": "D10", "title": "Reschedules logged as No-Show in the operational report",
        "severity": "High",
        "evidence": "Live 2026-07-22 re-map: in '03d. Update Appointment Status', the 'PA reported Px "
                     "Rescheduled' branch's next step is named 'Update Outcome to No Show' and writes "
                     "the same 'Yes' flag into the single 'Outcome' column of the 'Appt Report Raw' sheet "
                     "used for genuine no-shows -- a copy-pasted, never-renamed node.",
        "impact": "No-show rate and reschedule rate are indistinguishable in the operational report; "
                   "reschedule volume is silently inflating the reported no-show rate.",
    },
    {
        "id": "D11", "title": "Reschedule trigger-link on the outcome router is orphaned",
        "severity": "Medium",
        "evidence": "Live 2026-07-22 re-map: '05. Clinic Appt Outcome' declares a 'PA reported PX "
                     "Rescheduled' trigger-link trigger, but no step in its graph references that "
                     "trigger-link id -- zero downstream action.",
        "impact": "A staff-reported reschedule via that specific path does nothing: no opportunity "
                   "re-open, no notification, no sheet update.",
    },
    {
        "id": "D12", "title": "Duplicate disposition + outcome routers racing on shared triggers",
        "severity": "High",
        "evidence": "Live 2026-07-22 re-map: '4a. Softphone Call Disposition' and '4b. Disposition "
                     "(active)' encode the same 9 call_status dispositions twice (softphone vs dialer "
                     "channel). '05. Clinic Appt Outcome', '07. POST-VISIT - SHOWED...', and '08. MUT' "
                     "all independently trigger on the same 'PA reported PX SHOWED' form submission; "
                     "07 alone carries 78 opportunity-write steps.",
        "impact": "A disposition-rule change must be made twice (4a/4b) and a single Showed form submit "
                   "fans out into 3 competing opportunity-writers (05/07/08) with no execution ordering "
                   "guarantee -- the leading contributor to the account-wide duplicate/false-win volume.",
    },
]
existing_ids = {d["id"] for d in data["defects"]}
for d in NEW_DEFECTS:
    if d["id"] not in existing_ids:
        data["defects"].append(d)
print(f"data.json: defects now {len(data['defects'])} (added {len(NEW_DEFECTS)}).")

data["generated_at"] = "2026-07-22"
(PUB / "data.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
print("Wrote data.json.")

# ---------------------------------------------------------------------------
# 2. gaps.json: append new findings G11-G14 mirroring the same defects,
#    keyed to the Gaps-page severity vocabulary (Critical/High/Medium/Low)
#    and Open/Ready/Mitigated/Acknowledged status vocabulary.
# ---------------------------------------------------------------------------
gaps = json.loads((PUB / "gaps.json").read_text())
NEW_FINDINGS = [
    {
        "id": "G11", "severity": "Critical", "area": "Cancel event has 3 independent writers (live, 2026-07-22)",
        "evidence": "Direct re-extraction of '05. Clinic Appt Outcome', '03d. Update Appointment Status', "
                     "and 'Cancelled Appointments' confirms all three trigger on Appointment Status = "
                     "Cancelled today. Two use create_opportunity into the same per-clinic Lost "
                     "pipeline/stage instead of updating the opportunity created at booking.",
        "recommendation": "Designate ONE cancel-handling workflow (fold into 05 per the target WF-05/06 "
                           "consolidation), switch to find_opportunity + update_opportunity, and retire "
                           "'Cancelled Appointments' and the duplicate cancel branch in '03d'.",
        "status": "Open",
    },
    {
        "id": "G12", "severity": "High", "area": "Reschedules recorded as No-Show (live, 2026-07-22)",
        "evidence": "'03d. Update Appointment Status': the Rescheduled branch's next step is literally "
                     "named 'Update Outcome to No Show' and writes into the same Outcome column used "
                     "for genuine no-shows in the 'Appt Report Raw' sheet.",
        "recommendation": "Rename the node and give it a distinct write value (e.g. 'Rescheduled'); "
                           "add a real enum column to the sheet instead of a single Yes/blank flag.",
        "status": "Open",
    },
    {
        "id": "G13", "severity": "Medium", "area": "Orphaned reschedule trigger-link on the outcome router",
        "evidence": "'05. Clinic Appt Outcome' declares the 'PA reported PX Rescheduled' trigger-link "
                     "as a trigger, but no step in the graph references it -- confirmed via raw step-graph "
                     "inspection, zero downstream nodes.",
        "recommendation": "Wire the branch to re-open the existing opportunity (never close it) or "
                           "remove the dead trigger so the builder doesn't imply reschedule handling "
                           "exists where it doesn't.",
        "status": "Open",
    },
    {
        "id": "G14", "severity": "High", "area": "Racing/duplicate routers on shared triggers (live, 2026-07-22)",
        "evidence": "4a (softphone) and 4b (dialer) disposition workflows encode the same 9 call-status "
                     "branches twice. 05, 07 (78 opportunity-write steps), and 08 all independently fire "
                     "on the same 'PA reported PX SHOWED' form submission with no ordering guarantee.",
        "recommendation": "Merge 4a/4b into one disposition workflow parameterized by channel. Collapse "
                           "05/07/08 into a single outcome router with MUT and review/referral as internal "
                           "branches or sub-flows, not top-level workflows competing for the same trigger.",
        "status": "Open",
    },
]
existing_gap_ids = {f["id"] for f in gaps["findings"]}
for f in NEW_FINDINGS:
    if f["id"] not in existing_gap_ids:
        gaps["findings"].append(f)
gaps["crawled_at"] = "2026-07-22"
gaps["method"] = ("Read-only live GHL API sweep (2026-06-16) plus a full backend-API re-extraction of "
                   "45 production workflows on 2026-07-22, focused on Won/Lost and cancel/reschedule "
                   "handling. Findings G11-G14 are net-new from the 2026-07-22 pass; G1-G10 remain from "
                   "the earlier sweep.")
(PUB / "gaps.json").write_text(json.dumps(gaps, indent=2), encoding="utf-8")
print(f"Wrote gaps.json ({len(gaps['findings'])} total findings, +{len(NEW_FINDINGS)}).")

print("\nDone with data.json + gaps.json.")
