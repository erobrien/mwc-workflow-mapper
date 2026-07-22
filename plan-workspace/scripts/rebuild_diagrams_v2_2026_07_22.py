"""Rebuild wf-diagrams-asis.json (v2): every diagram gets a structured
issues[] array -- {type, node_ids, note} -- in addition to prose caption,
so the page can render an explicit "Problems in this diagram" panel and
recolor exactly the flagged nodes. Color language:
  red    (#b91c1c) = confirmed defect / multi-writer race / wrong write
  amber  (#b45309) = bottleneck (oversized branch fan-out, excessive waits/gotos)
  slate  (#475569) = data loss / dead-end (orphaned trigger, dropped attribution)
This is additive to the 2026-07-22 live re-map -- no invented edges, only
re-flagging existing real graph structure, plus one new diagram for the
attribution audit's Contact-to-Opportunity data-loss finding.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"

RED = "#b91c1c"
AMBER = "#b45309"
SLATE = "#475569"

diagrams = json.loads((PUB / "wf-diagrams-asis.json").read_text())
by_key = {d["key"]: d for d in diagrams}


def recolor(src: str, node_id: str, color: str) -> str:
    pattern = re.compile(r"style " + re.escape(node_id) + r" fill:#[0-9a-fA-F]{6},color:#fff")
    replacement = "style " + node_id + " fill:" + color + ",color:#fff"
    new_src, n = pattern.subn(replacement, src)
    if n == 0:
        new_src = src.rstrip() + "\n    " + replacement + "\n"
    return new_src


# --- wf05: keystone outcome workflow -- every defect we found has a real node here ---
wf05 = by_key["wf05"]
src = wf05["src"]
src = recolor(src, "N29", SLATE)
src = recolor(src, "N48", RED)
for nid in ["N8", "N11", "N14", "N20", "N23", "N26", "N32", "N36", "N40"]:
    src = recolor(src, nid, RED)
src = recolor(src, "N4", AMBER)
wf05["src"] = src
wf05["issues"] = [
    {"type": "data_loss", "node_ids": ["N29"], "note": "PA reported PX Resched branch has no downstream action -- a staff-reported reschedule through this trigger does nothing (D11 / G13)."},
    {"type": "defect", "node_ids": ["N48"], "note": "Auto-creates a WON opportunity on attendance alone, before any sale is recorded (D1) -- the single highest-impact defect in the account."},
    {"type": "defect", "node_ids": ["N8", "N11", "N14", "N20", "N23", "N26", "N32", "N36", "N40"], "note": "Every Lost-opportunity write on this workflow uses create_opportunity instead of find+update, and duplicates with 03d / Cancelled Appointments outside this diagram (D9) -- a single cancel event can mint 2+ Lost deals."},
    {"type": "bottleneck", "node_ids": ["N4"], "note": "7 triggers converge on one switch that re-implements the same 3-clinic branch 3 separate times instead of reading a single location field once."},
]
wf05["title"] = wf05["title"].rstrip() + " -- 4 confirmed problems flagged"

# --- master: already colored red from the prior pass; add structured issues[] ---
master = by_key["master"]
master["issues"] = [
    {"type": "defect", "node_ids": ["W528b598ecd", "W860ae1349e", "W69906bf5d2"], "note": "05 / 03d / Cancelled Appointments all independently write outcome state on one Appointment Status = Cancelled event (D9)."},
    {"type": "defect", "node_ids": ["ISO3", "ISO4"], "note": "07 and 08 race against 05 on the exact same 'PA reported PX SHOWED' form submission with no ordering guarantee (D12)."},
    {"type": "defect", "node_ids": ["ISO7"], "note": "4a (softphone) and 4b (dialer) encode the same 9 disposition branches twice (D12)."},
]

by_key["cancel-fanout"]["issues"] = [
    {"type": "defect", "node_ids": ["W05", "WCA"], "note": "Both create_opportunity (not find+update) into the SAME per-clinic Lost pipeline/stage -- duplicate Lost deals on one cancel."},
    {"type": "data_loss", "node_ids": ["W03d"], "note": "Writes a bare 'Yes' Outcome flag with no distinguishing enum -- cancel, no-show, and reschedule all collapse to the same value once mislabeled."},
]
by_key["showed-fanout"]["issues"] = [
    {"type": "defect", "node_ids": ["W05"], "note": "Auto-creates a WON opportunity on attendance alone (D1)."},
    {"type": "bottleneck", "node_ids": ["W07"], "note": "78 opportunity-write steps in one workflow -- the largest single write-block in the account, all racing against W05 and W08 on the same trigger."},
]

# --- wf01: lead capture, per-location clone bottleneck ---
wf01 = by_key["wf01"]
src = wf01["src"]
src = recolor(src, "N4", AMBER)
src = recolor(src, "N18", AMBER)
wf01["src"] = src
wf01["issues"] = [
    {"type": "bottleneck", "node_ids": ["N4", "N18"], "note": "This exact click-ID/UTM branch structure is cloned 5 times (01A-01E, one per location/page) instead of being one parameterized workflow -- a DRY violation, and per the attribution audit, gclid_value/fbclid_value still end up empty even after this branching runs (G15)."},
]

# --- wf02: non-booked new leads, per-clinic wait/branch clone ---
wf02 = by_key["wf02"]
wf02["issues"] = [
    {"type": "bottleneck", "node_ids": ["N5", "N7", "N9"], "note": "Same 3-minute wait + 2-step body repeated once per clinic (Richmond/VA Beach/NPN) instead of one branch reading a location field."},
]

# --- preappt cluster: flag 03b size and 03d mislabel at cluster granularity ---
preappt = by_key["preappt"]
src = preappt["src"]
src = recolor(src, "G1", AMBER)
src = recolor(src, "G3", RED)
preappt["src"] = src
preappt["issues"] = [
    {"type": "bottleneck", "node_ids": ["G1"], "note": "03b. Unconfirmed Appointment is 160 steps / 63 decisions -- the largest confirmation-chase workflow in the account, and carries opportunity/appointment-status writes that likely overlap with 05's outcome-writer sprawl."},
    {"type": "defect", "node_ids": ["G3"], "note": "03d's Rescheduled branch writes into the sheet's Outcome column using a step literally named 'Update Outcome to No Show' -- reschedules are recorded as no-shows in the operational report (D10)."},
]

# --- wf06: post-visit showed, duplicate lost/won opp creates + huge branch fan-out ---
wf06 = by_key["wf06"]
src = wf06["src"]
for nid in ["N14", "N16", "N29", "N31"]:
    src = recolor(src, nid, RED)
src = recolor(src, "N6", AMBER)
src = recolor(src, "N21", AMBER)
wf06["src"] = src
wf06["issues"] = [
    {"type": "defect", "node_ids": ["N14", "N16", "N29", "N31"], "note": "Opportunity Won/Lost writes here race against 05's SHOWED-triggered Won write and 03d/Cancelled Appointments' Lost writes -- this is part of the 78-opportunity-write block flagged in the showed-fanout diagram (D12)."},
    {"type": "bottleneck", "node_ids": ["N6", "N21"], "note": "The same 6-branch no-sale-reason switch (Not Ready / Think it Over / Cost / Not Interested / Not Qualified / Others) is repeated once per clinic instead of being one branch parameterized by location."},
]

# --- wf07-08: Cancelled Appointments is the third confirmed cancel-race writer ---
wf0708 = by_key["wf07-08"]
src = wf0708["src"]
src = recolor(src, "G1", RED)
wf0708["src"] = src
wf0708["issues"] = [
    {"type": "defect", "node_ids": ["G1"], "note": "Cancelled Appointments duplicates 05's cancel-handling and 03d's sheet write on the same Appointment Status = Cancelled event -- see the cancel-fanout diagram for the full 3-way race (D9)."},
]

# --- retention: no live counterpart -- keep as a data-loss/gap marker ---
retention = by_key["retention"]
retention["issues"] = [
    {"type": "data_loss", "node_ids": ["SCOPE"], "note": "No retention/renewal or long-term nurture automation exists among the 45 live-remapped workflows -- members who go quiet after a Won or a no-sale have no automated re-engagement path today."},
]

# --- support: 4a/4b duplicate disposition routers ---
support = by_key["support"]
src = support["src"]
src = recolor(src, "G3", RED)
src = recolor(src, "G4", RED)
support["src"] = src
support["issues"] = [
    {"type": "defect", "node_ids": ["G3", "G4"], "note": "4a (softphone, 30 steps) and 4b (dialer, 75 steps) encode the identical 9 call-disposition branches twice -- a disposition rule change has to be made in both places (D12)."},
]

# ---------------------------------------------------------------------------
# NEW diagram: attribution data-loss path (from the 2026-07-22 attribution audit)
# ---------------------------------------------------------------------------
attribution_loss = {
    "key": "attribution-loss",
    "title": "AS-IS: Attribution data loss -- where the paid-media journey disappears before it reaches revenue (2026-07-22)",
    "caption": "From the 2026-07-22 attribution audit (1,500-contact live sample). GHL's native attributions[] array captures the real journey (gclid, fbclid, fbc, fbp, gaClientId, UTMs) automatically on 93.27% of contacts -- but two hard breaks destroy that signal before it reaches revenue reporting: (1) the hand-built gclid_value/fbclid_value custom fields are 100% empty on every contact where the native array has a real click ID, and no workflow in the 45-workflow re-map writes to them, so the write path is outside GHL entirely and broken; (2) when the Opportunity is created, its attributions[] entry is a generic 'Manual/CRM Workflows' stub, not the contact's real first-touch journey -- 95.4% of Opportunities have an attribution stub, 0% have real UTM data in it. The revenue ledger (Monetary Value, 89.2% at $0) has no path back to the ad spend that produced the lead.",
    "src": (
        'flowchart TD\n'
        '    AD(["Google / Meta ad click<br/>gclid / fbclid / gbraid / fbc / fbp attached to URL"])\n'
        '    NATIVE["GHL native attributions[] array<br/>auto-captured on page load + form submit<br/>93.27% of contacts have an entry"]\n'
        '    CF["Custom fields: gclid_value / fbclid_value<br/>utm_source / utm_medium / utm_campaign<br/>(what reports + ad-platform uploads actually read)"]\n'
        '    FIRST["first_utm_source / first_gclid / first_fbclid<br/>first_touch_at / first_landing_page<br/>(designed first-touch governance layer)"]\n'
        '    OPP["Opportunity created at booking<br/>attributions[] = generic Manual/CRM Workflows stub"]\n'
        '    REV["Revenue reporting: Monetary Value<br/>89.2% of sampled Opportunities = $0"]\n'
        '    ADPLAT[("Google Ads / Meta offline conversion upload<br/>reads gclid_value / fbclid_value")]\n'
        '    AD --> NATIVE\n'
        '    NATIVE -->|"BREAK 1: no workflow bridges this -- write path is outside GHL, 100% miss rate"| CF\n'
        '    NATIVE -.->|"designed but never wired, 0% populated"| FIRST\n'
        '    CF --> ADPLAT\n'
        '    NATIVE -->|"BREAK 2: Opportunity gets a placeholder stub, not the real journey"| OPP\n'
        '    OPP --> REV\n'
        '    style AD fill:#1e3a5f,color:#fff\n'
        '    style NATIVE fill:#166534,color:#fff\n'
        '    style CF fill:#b91c1c,color:#fff\n'
        '    style FIRST fill:#475569,color:#fff\n'
        '    style OPP fill:#b91c1c,color:#fff\n'
        '    style REV fill:#b45309,color:#fff\n'
        '    style ADPLAT fill:#374151,color:#fff\n'
    ),
    "issues": [
        {"type": "defect", "node_ids": ["CF"], "note": "gclid_value/fbclid_value are 100% empty on every contact where the native array has a real click ID (166/166 fbclid, 69/69 gclid) -- the write path is outside GHL entirely (G15)."},
        {"type": "data_loss", "node_ids": ["FIRST"], "note": "The entire designed first-touch field layer is 0% populated across the full sample -- built but never wired up (G17)."},
        {"type": "defect", "node_ids": ["OPP"], "note": "95.4% of Opportunities carry an attributions[] stub, but 0% carry real UTM data -- the contact's real journey is dropped at the Contact-to-Opportunity handoff (G16)."},
        {"type": "bottleneck", "node_ids": ["REV"], "note": "89.2% of sampled Opportunities sit at $0 Monetary Value, so even where attribution existed, there is no revenue to attach it to."},
    ],
}

# Insert right after showed-fanout (position 3) so the three "problem" diagrams
# lead the page, ahead of the descriptive per-cluster diagrams.
new_diagrams = [master, by_key["cancel-fanout"], by_key["showed-fanout"], attribution_loss,
                wf01, wf02, preappt, wf05, wf06, wf0708, retention, support]

(PUB / "wf-diagrams-asis.json").write_text(json.dumps(new_diagrams, indent=2), encoding="utf-8")
print("Wrote wf-diagrams-asis.json v2:", len(new_diagrams), "diagrams, all with structured issues[].")
for d in new_diagrams:
    n_issues = len(d.get("issues", []))
    print(f"  {d['key']:18s} issues={n_issues}")
