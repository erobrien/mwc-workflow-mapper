"""Patch the existing wf-diagrams-asis.json master journey diagram (built from
real extracted edges) to highlight the two confirmed multi-writer races, and
add two new zoomed-in diagrams for the cancel-event fan-out and the SHOWED-
form fan-out. Edits are additive/highlighting only -- no invented edges."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"

diagrams = json.loads((PUB / "wf-diagrams-asis.json").read_text())
master = diagrams[0]
assert master["key"] == "master"

# --- 1. Recolor the racing nodes red and move 07/08/4b out of "isolated" framing
#         by explicitly noting the shared SHOWED-form trigger via a comment node.
src = master["src"]

# 07 and 08 currently sit inside the ISO subgraph labeled "no inbound/outbound
# workflow links found" -- true for workflow-to-workflow links, but they DO share
# an external trigger (PA reported PX SHOWED form) with 05, which the caption
# should call out rather than implying independence.
src = src.replace(
    'ISO3["07. POST-VISIT - SHOWED Opportunities a…<br/>published · entry: form_submission"]',
    'ISO3["07. POST-VISIT - SHOWED Opportunities a…<br/>published · entry: form_submission (SAME form as 05)"]',
)
src = src.replace(
    'ISO4["08. MUT Medically Untreatable<br/>published · entry: form_submission"]',
    'ISO4["08. MUT Medically Untreatable<br/>published · entry: form_submission (SAME form as 05)"]',
)
src = src.replace(
    'ISO7["4b. Disposition – Workflow active<br/>published · entry: call_status"]',
    'ISO7["4b. Disposition – Workflow (active)<br/>published · entry: call_status (4a is a near-duplicate)"]',
)

# Recolor the confirmed multi-writer cancel race red: 05 (already purple as
# keystone), 03d (W860ae1349e), and Cancelled Appointments (W69906bf5d2).
src = src.replace(
    "style W860ae1349e fill:#166534,color:#fff",
    "style W860ae1349e fill:#b91c1c,color:#fff",
)
src = src.replace(
    "style W69906bf5d2 fill:#166534,color:#fff",
    "style W69906bf5d2 fill:#b91c1c,color:#fff",
)
src = src.replace(
    "style W528b598ecd fill:#7c3aed,color:#fff",
    "style W528b598ecd fill:#b91c1c,color:#fff",
)
# Recolor 07/08/4b red too (racing/duplicate) inside the ISO subgraph.
src = src.replace("style ISO3 fill:#166534,color:#fff", "style ISO3 fill:#b91c1c,color:#fff")
src = src.replace("style ISO4 fill:#166534,color:#fff", "style ISO4 fill:#b91c1c,color:#fff")
src = src.replace("style ISO7 fill:#166534,color:#fff", "style ISO7 fill:#b91c1c,color:#fff")

master["src"] = src
master["title"] = "AS-IS: Master journey — how the 45 live-remapped workflows actually interconnect (2026-07-22)"
master["caption"] = (
    "Live re-map, 2026-07-22. Every edge is derived from the extracted step graphs — no invented links. "
    "Red nodes are confirmed multi-writer races, verified against the raw step graph on 2026-07-22: "
    "05. Clinic Appt Outcome, 03d. Update Appointment Status, and Cancelled Appointments (red) all "
    "independently write outcome state on the SAME 'Appointment Status = Cancelled' event, two of them "
    "via create_opportunity (not update) into the same per-clinic Lost pipeline/stage — a single "
    "cancellation can mint duplicate Lost deals. Separately, 07. POST-VISIT - SHOWED (78 opportunity-write "
    "steps) and 08. MUT (red, in the isolated cluster) fire on the exact same 'PA reported PX SHOWED' form "
    "submission as 05 — three workflows racing on one form event with no execution-order guarantee. "
    "4a/4b (red) encode the same 9 call-disposition branches twice, once per phone channel. Purple/green "
    "otherwise = live/published without a confirmed race. The isolated cluster still has no derivable "
    "inbound/outbound workflow-to-workflow link, but is no longer independent where it shares an external "
    "trigger with a mapped workflow, as noted inline."
)

# --- 2. New diagram: cancel-event fan-out (zoomed) ---
cancel_fanout = {
    "key": "cancel-fanout",
    "title": "AS-IS: Cancel-event fan-out — 3 independent writers on one Appointment Status = Cancelled event (2026-07-22)",
    "caption": "Confirmed via direct raw step-graph inspection on 2026-07-22. A single calendar "
               "cancellation (any of the 3 clinics) fires all three workflows below independently — there "
               "is no Modified-By gating, no shared guard, and no single-writer designation between them. "
               "05 and Cancelled Appointments both run create_opportunity (not find/update) into the same "
               "per-clinic Lost pipeline + stage id, so one cancel event can produce 2 separate Lost deals "
               "plus a sheet row with no way to reconcile them after the fact.",
    "src": (
        'flowchart TD\n'
        '    CAL(["Calendar: Appointment Status changed to Cancelled<br/>(Richmond / VA Beach / Newport News)"])\n'
        '    W05["05. Clinic Appt Outcome<br/>published · create_opportunity → lost<br/>(per-clinic pipeline/stage)"]\n'
        '    W03d["03d. Update Appointment Status<br/>published · google_sheets write<br/>Outcome column = Yes"]\n'
        '    WCA["Cancelled Appointments<br/>published · create_opportunity → lost<br/>(per-clinic pipeline/stage, SAME target as 05)"]\n'
        '    OPP1[("Lost Opportunity #1<br/>(from 05)")]\n'
        '    OPP2[("Lost Opportunity #2<br/>(from Cancelled Appointments)")]\n'
        '    SHEET[("Appt Report Raw sheet<br/>Outcome = Yes")]\n'
        '    CAL --> W05\n'
        '    CAL --> W03d\n'
        '    CAL --> WCA\n'
        '    W05 --> OPP1\n'
        '    WCA --> OPP2\n'
        '    W03d --> SHEET\n'
        '    OPP1 -.->|"DUPLICATE — same pipeline + stage"| OPP2\n'
        '    style CAL fill:#1e3a5f,color:#fff\n'
        '    style W05 fill:#b91c1c,color:#fff\n'
        '    style W03d fill:#b91c1c,color:#fff\n'
        '    style WCA fill:#b91c1c,color:#fff\n'
        '    style OPP1 fill:#7c2d12,color:#fff\n'
        '    style OPP2 fill:#7c2d12,color:#fff\n'
        '    style SHEET fill:#374151,color:#fff\n'
    ),
}

# --- 3. New diagram: SHOWED-form fan-out (zoomed) ---
showed_fanout = {
    "key": "showed-fanout",
    "title": "AS-IS: 'PX SHOWED' form fan-out — 3 workflows racing on one form submission (2026-07-22)",
    "caption": "Confirmed via direct trigger inspection on 2026-07-22. The PCC-submitted 'PA reported PX "
               "SHOWED' form independently triggers three top-level workflows with no ordering guarantee. "
               "05 also auto-creates a Won opportunity on attendance alone (see D1); 07 alone carries 78 "
               "opportunity-write steps for review/referral logic that could be a branch inside one router "
               "instead of a third competing top-level workflow.",
    "src": (
        'flowchart TD\n'
        '    FORM(["PCC Sales Form: \'PA reported PX SHOWED\'<br/>(single form submission event)"])\n'
        '    W05["05. Clinic Appt Outcome<br/>published · 60 steps<br/>auto-creates WON opportunity on attendance"]\n'
        '    W07["07. POST-VISIT - SHOWED Opportunities<br/>and For Review/Referral<br/>published · 135 steps, 78 opportunity writes"]\n'
        '    W08["08. MUT (Medically Untreatable)<br/>published · 16 steps"]\n'
        '    FORM --> W05\n'
        '    FORM --> W07\n'
        '    FORM --> W08\n'
        '    style FORM fill:#1e3a5f,color:#fff\n'
        '    style W05 fill:#b91c1c,color:#fff\n'
        '    style W07 fill:#b91c1c,color:#fff\n'
        '    style W08 fill:#b91c1c,color:#fff\n'
    ),
}

# Insert the two new diagrams right after the master diagram.
diagrams.insert(1, cancel_fanout)
diagrams.insert(2, showed_fanout)

(PUB / "wf-diagrams-asis.json").write_text(json.dumps(diagrams, indent=2), encoding="utf-8")
print(f"Wrote wf-diagrams-asis.json with {len(diagrams)} diagrams (added cancel-fanout, showed-fanout; "
      f"patched master with red race highlighting).")
