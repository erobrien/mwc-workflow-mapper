# -*- coding: utf-8 -*-
"""
Generate plan-workspace/public/wf-diagrams.json from the locked v2 spec.

Reads plan-workspace/public/tobe-detail.json (produced by
build_tobe_v2_detail.py) and writes one Mermaid flowchart per diagram_key
plus a master overview map. The output shape matches WFDiagrams.tsx and
ToBeWorkflow.tsx: [{key, title, caption, src}].

Locked clinics: richmond | virginia-beach | newport-news. Transactional
SMS sends have no quiet hours. Workflows never move Sales stages
(single-writer: Force writes outcomes). Never contacts GHL. Safe to re-run.

Run:
    python plan-workspace/build_tobe_v2_diagrams.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PW_PUBLIC = REPO_ROOT / "plan-workspace" / "public"
TOBE_DETAIL = PW_PUBLIC / "tobe-detail.json"
OUT = PW_PUBLIC / "wf-diagrams.json"

# ---- Palette (boardroom high-contrast) --------------------------------------

C_TRIG = "#0f172a"      # midnight navy
C_STEP = "#1e293b"      # charcoal
C_DECISION = "#0f766e"  # deep teal (guardrail check)
C_WAIT = "#b45309"      # amber for waits
C_MSG = "#1e40af"       # deep blue for messaging steps
C_TAG = "#4c1d95"       # violet for tag ops
C_FIELD = "#065f46"     # forest for field writes
C_OPP = "#7c3aed"       # deep violet for opportunity ops
C_EXIT_GOOD = "#166534" # green exit
C_EXIT_BAD = "#7f1d1d"  # deep red compliance / cancel exit
C_EXIT = "#374151"      # neutral hand-off exit
C_WEBHOOK = "#0369a1"   # deep sky for external webhook

# ---- helpers ----------------------------------------------------------------

def esc(text: str, n: int = 90) -> str:
    """Mermaid-safe label."""
    s = (text or "").replace("\n", " ").replace("\r", " ")
    s = s.replace("&", " and ")
    s = s.replace('"', "'").replace("|", " / ")
    s = s.replace("(", "").replace(")", "")
    s = s.replace("[", "").replace("]", "")
    s = s.replace("{", "").replace("}", "")
    s = s.replace("<", "").replace(">", "")
    s = s.replace(";", ",").replace("#", "no.")
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > n:
        s = s[: n - 1] + "…"
    return s


def prefix_of(step_name: str) -> str:
    return step_name.split(":", 1)[0].strip().upper()


def color_for(action: str, prefix: str) -> str:
    p = prefix
    if p == "TRIGGER":
        return C_TRIG
    if p in ("IF-ELSE", "GUARD", "SPLIT"):
        return C_DECISION
    if p == "WAIT":
        return C_WAIT
    if p in ("SMS", "EMAIL"):
        return C_MSG
    if p in ("ADD-TAG", "REMOVE-TAG"):
        return C_TAG
    if p in ("SET-FIELD", "SET-DND"):
        return C_FIELD
    if p in ("CREATE-OPP", "UPDATE-OPP", "FIND-OPP"):
        return C_OPP
    if p in ("WEBHOOK",):
        return C_WEBHOOK
    if p in ("ADD-TO-WF", "REMOVE-FROM-WF"):
        return C_EXIT
    return C_STEP


def short_name(step_name: str) -> str:
    """Split into title / detail. Title is prefix, detail is the rest."""
    prefix, _, rest = step_name.partition(":")
    return prefix.strip(), rest.strip()


def wf_link_targets(step_name: str) -> list[str]:
    """Return WF-NN keys referenced by ADD-TO-WF / REMOVE-FROM-WF steps."""
    return re.findall(r"WF-(\d{2})", step_name)


# ---- Per-workflow mermaid ---------------------------------------------------

def flow_for_wf(n: str, wf: dict) -> str:
    """Emit a mermaid flowchart for one WF's steps, showing branch labels
    on IF-ELSE decisions and stadium-shaped hand-off nodes for ADD-TO-WF."""
    lines = ["flowchart TD"]
    steps = wf["steps"]
    node_ids: list[str] = []
    styles: list[str] = []

    for idx, s in enumerate(steps):
        title, detail = short_name(s["name"])
        prefix = title.upper()
        node_id = f"S{n}_{s['order']}"
        node_ids.append(node_id)
        label_top = title
        label_bottom = esc(detail, 70) if detail else ""
        label = f"{label_top}<br/>{label_bottom}" if label_bottom else label_top

        if prefix in ("IF-ELSE", "GUARD"):
            lines.append(f"    {node_id}{{{{{label}}}}}")
        elif prefix == "TRIGGER":
            lines.append(f"    {node_id}([{label}])")
        elif prefix in ("ADD-TO-WF", "REMOVE-FROM-WF"):
            lines.append(f"    {node_id}([{label}])")
        else:
            lines.append(f"    {node_id}[{label}]")

        styles.append(f"    style {node_id} fill:{color_for(s['action'], prefix)},color:#fff,stroke:#0f172a,stroke-width:2px")

    # Simple in-order edges. IF-ELSE branches get explicit true/false labels
    # into the immediate next step; the previous step's "false" simply
    # continues.
    for i in range(len(steps) - 1):
        cur = steps[i]
        nxt = steps[i + 1]
        cur_id = node_ids[i]
        nxt_id = node_ids[i + 1]
        cur_prefix = prefix_of(cur["name"])
        if cur_prefix in ("IF-ELSE", "GUARD"):
            # Try to derive branch labels from the step name / config
            name_low = (cur["name"] + " " + cur.get("config", "")).lower()
            if "guard against duplicate" in name_low or "duplicate" in name_low or "guard" in name_low:
                yes_label, no_label = "no open opp", "already exists"
            elif "skip if" in name_low or "already" in name_low:
                yes_label, no_label = "still in flight", "skip / exit"
            elif "wordpress" in name_low:
                yes_label, no_label = "wp origin", "other origin"
            elif "outcome" in name_low or "sale_outcome" in name_low:
                yes_label, no_label = "matched", "next branch"
            elif "channel" in name_low:
                yes_label, no_label = "matched", "next branch"
            else:
                yes_label, no_label = "yes", "no"
            lines.append(f"    {cur_id} -->|{yes_label}| {nxt_id}")
            lines.append(f"    {cur_id} -.->|{no_label}| {nxt_id}_ALT")
            lines.append(f"    {cur_id}_ALT([continue via alt branch])")
            styles.append(f"    style {cur_id}_ALT fill:{C_EXIT},color:#fff,stroke:#0f172a,stroke-width:2px")
        else:
            lines.append(f"    {cur_id} --> {nxt_id}")

    # For ADD-TO-WF at the tail, add explicit exit node so the target is visible
    for i, s in enumerate(steps):
        if prefix_of(s["name"]) in ("ADD-TO-WF",):
            targets = wf_link_targets(s["name"])
            for t in targets:
                exit_id = f"EX_{n}_{s['order']}_{t}"
                lines.append(f"    {node_ids[i]} --> {exit_id}([WF-{t} hand-off])")
                styles.append(f"    style {exit_id} fill:{C_EXIT_GOOD},color:#fff,stroke:#0f172a,stroke-width:2px")

    lines.extend(styles)
    return "\n".join(lines)


def combined_flow(*items: tuple[str, dict]) -> str:
    """Compose 2+ WF flows as sub-sections in one mermaid diagram, chained
    left-to-right with a divider node. Each WF renders as a top-down block."""
    lines = ["flowchart TD"]
    for n, wf in items:
        body = flow_for_wf(n, wf)
        # drop the leading `flowchart TD` header from each block
        for ln in body.splitlines()[1:]:
            lines.append(ln)
        lines.append(f"    LBL_{n}[[WF-{n} · {esc(wf.get('purpose', ''), 40)}]]")
        lines.append(f"    style LBL_{n} fill:#0f172a,color:#f8fafc,stroke:#f59e0b,stroke-width:2px")
        lines.append(f"    LBL_{n} --- S{n}_1")
    return "\n".join(lines)


# ---- Master overview --------------------------------------------------------

def master_flow(workflows: dict) -> str:
    """A single 17-workflow overview map, v2 spec."""
    return "\n".join(
        [
            "flowchart TD",
            "    subgraph ENTRY [Entry channels]",
            "        WEB([Next-lander form / WPCode + Gravity])",
            "        PHONE([Phone / chat / walk-in])",
            "        AMB([Ambassador form + tag])",
            "        PCC([PCC QR utm_source=pcc_qr])",
            "    end",
            "",
            "    WEB --> WF01",
            "    PCC --> WF15",
            "    WF15[WF-15 PCC referral routing<br/>tags pcc-referral -> re-enter WF-01] --> WF01",
            "    AMB --> WF14",
            "    WF14[WF-14 Ambassador program<br/>referred as new contact -> WF-01] --> WF01",
            "    PHONE --> WF16",
            "    WF16[WF-16 Comms edge<br/>IVR + chat widgets -> WF-01] --> WF01",
            "",
            "    WF01[WF-01 Lead Capture<br/>Contact Created + next-lander<br/>create-once Sales opp<br/>stamp current_clinic_* Method 2] -->|24h wait| WF02",
            "    WF02[WF-02 Non-booked recovery<br/>marketing 08:00-21:00 contact TZ]",
            "    WF02 -->|no book| WF09",
            "    WF02 -.->|booked| WF03",
            "",
            "    APPT([Class calendar booking]) --> WF03",
            "    WF03[WF-03 Booking confirmation + reminders<br/>transactional, no quiet hours] --> WF04",
            "    WF04[WF-04 Intake chase]",
            "    WF03 -.->|cancel| WF08",
            "    WF03 -.->|reschedule| WF03",
            "",
            "    WF03 --> VISIT{Visit day}",
            "    VISIT -->|showed| FORCE",
            "    VISIT -->|no-show or cancel| WF08",
            "    VISIT -->|reschedule| WF03",
            "",
            "    FORCE([Force writes outcomes to opp<br/>sale_outcome_v2, sale_type, dollars<br/>trigger ryJLJ1McWWOHlAvBRsI3]) --> WF05",
            "    WF05{{WF-05 Outcome router<br/>reads opportunity.sale_outcome_v2<br/>never moves stages}}",
            "    WF05 -->|SOLD + new| WF06",
            "    WF05 -->|SOLD + new| WF13",
            "    WF05 -->|SOLD + renewal| WF09",
            "    WF05 -->|AD Advise+Decline| WF07",
            "    WF05 -->|MUT| WF11",
            "    WF05 -.->|MAR pending provider| MARDROP([awaiting resubmit])",
            "    WF05 -.->|no-show / cancel| WF08",
            "    WF05 -.->|reschedule| WF03",
            "",
            "    WF06[WF-06 Post-visit Won<br/>tag v2_status_active<br/>onboarding 3/7/14/21d]",
            "    WF06 -->|T+14| WF10",
            "    WF06 -->|T+21| WF14",
            "    WF06 --> WF09",
            "    WF07[WF-07 A and D nurture<br/>tag v2_outcome_ad -> WF-09]",
            "    WF07 -->|+35d| WF09",
            "    WF08[WF-08 No-show / cancel recovery<br/>REMOVE-FROM-WF WF-03] --> WF09",
            "    WF09[WF-09 Long-term nurture<br/>renewal sub-flow<br/>renewal_date custom-field trigger]",
            "    WF10[WF-10 Feedback survey<br/>sole writer latest_feedback_score]",
            "    WF11[WF-11 Compliance and errors<br/>STOP inbound, sole DND writer<br/>MUT front-gate exit]",
            "    WF12[WF-12 Call disposition handler<br/>tag v2_source_phone<br/>native update-in-place]",
            "    WF12 -.-> WF05",
            "    WF13[WF-13 Ad conversions<br/>SOLD + new only<br/>Sales pipeline Booked/Won]",
            "    WF17[WF-17 Price calculator<br/>writes contact.price_calc_result]",
            "    WF17 -.-> WF13",
            "",
            "    NOTE[[Locked v2 spec · clinics: richmond / virginia-beach / newport-news<br/>Force is the single writer of outcomes · workflows never move stages<br/>transactional SMS = no quiet hours · marketing SMS = 08:00-21:00 contact TZ]]",
            "",
            "    style WF01 fill:#0f172a,color:#f8fafc,stroke:#f59e0b,stroke-width:2px",
            "    style WF05 fill:#7c3aed,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style FORCE fill:#0369a1,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style VISIT fill:#0f766e,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF06 fill:#166534,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF09 fill:#374151,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF10 fill:#1e40af,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF07 fill:#b45309,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF08 fill:#7f1d1d,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF11 fill:#4c1d95,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF12 fill:#065f46,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF13 fill:#0f766e,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF14 fill:#1e293b,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF15 fill:#1e293b,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF16 fill:#1e293b,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF17 fill:#1e293b,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF02 fill:#b45309,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF03 fill:#1e40af,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style WF04 fill:#1e40af,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style MARDROP fill:#374151,color:#fff,stroke:#0f172a,stroke-width:2px",
            "    style NOTE fill:#0f172a,color:#f8fafc,stroke:#f59e0b,stroke-width:2px",
        ]
    )


# ---- Titles + captions ------------------------------------------------------

TITLES = {
    "master": (
        "All 17 v2 workflows — locked target map",
        (
            "The full v2 patient journey. Force writes outcomes to the opportunity, "
            "then WF-05 routes on sale_outcome_v2. Clinics are richmond / "
            "virginia-beach / newport-news. Transactional SMS has no quiet hours; "
            "marketing / recovery sends inside 08:00-21:00 contact TZ. Workflows "
            "never move Sales stages (single-writer)."
        ),
    ),
    "wf01": (
        "WF-01 — Lead Capture",
        (
            "First touch. Trigger is Contact Created + tag next-lander. Guards "
            "against duplicate open Sales opportunity, then creates a New Lead "
            "and stamps current_clinic_* Method 2 fields. Sends the welcome "
            "email + welcome SMS (STOP opt-out), waits 24h and hands off to WF-02."
        ),
    ),
    "wf02": (
        "WF-02 — Non-booked Recovery",
        (
            "Enrolled by WF-01 hand-off. Marketing / recovery burst — quiet hours "
            "08:00-21:00 contact TZ apply. Exits on booking (skip if v2_status_booked) "
            "and terminates into WF-09 long-term nurture after the last touch."
        ),
    ),
    "preappt": (
        "WF-03 + WF-04 — Booking confirmation + intake chase",
        (
            "Owned by the class-calendar booking event. WF-03 sends the booking "
            "confirmation and the reminder cadence (transactional, no quiet hours). "
            "WF-04 chases the intake form on a separate track. Cancellation halts "
            "reminders and routes to WF-08."
        ),
    ),
    "wf05": (
        "WF-05 — Clinic Outcome Router (keystone)",
        (
            "Triggered by Force's inbound webhook (ryJLJ1McWWOHlAvBRsI3). Force is "
            "the sole writer of opportunity outcome fields; WF-05 reads "
            "opportunity.sale_outcome_v2 and routes. Never moves Sales stages."
        ),
    ),
    "wf06": (
        "WF-06 — Post-Visit Won and Onboarding",
        (
            "For SOLD + sale_type=new only. Tags v2_status_active, sends welcome SMS, "
            "then 3d / 7d / 14d / 21d waits forking to WF-10 (feedback) and WF-14 "
            "(ambassador)."
        ),
    ),
    "wf07-08": (
        "WF-07 + WF-08 — A&D Nurture and No-show / Cancel Recovery",
        (
            "WF-07: sale_outcome_v2 = AD (Advise and Decline) — one first-touch SMS, "
            "wait 35d, hand to WF-09. WF-08: no-show / cancel — REMOVE-FROM-WF WF-03, "
            "rebook SMS, wait 7d, hand to WF-09. Reschedule never enters WF-08."
        ),
    ),
    "retention": (
        "WF-09 + WF-10 — Long-Term Nurture and Feedback",
        (
            "WF-09: long-term nurture and the renewal sub-flow — the renewal_date "
            "custom-field trigger is blocked until backfill is complete. WF-10: "
            "feedback survey at T+14 from WF-06; sole writer of "
            "contact.latest_feedback_score."
        ),
    ),
    "support": (
        "WF-11 / WF-13 / WF-14 / WF-15 / WF-16 — Support cluster",
        (
            "Support and signal workflows. WF-11 is the STOP handler and sole "
            "writer of DND / sms_consent_status. WF-13 fires ad-platform "
            "conversions for SOLD + new only. WF-14 (ambassador), WF-15 (PCC "
            "referral routing), and WF-16 (comms edge) all route new contacts back "
            "into WF-01 rather than creating opportunities themselves."
        ),
    ),
    "wf12": (
        "WF-12 — Call Disposition Handler",
        (
            "Single graph keyed on channel (not clinic). Tags v2_source_phone and "
            "runs native update-in-place; never remove-and-recreate the contact "
            "or opp."
        ),
    ),
    "wf17": (
        "WF-17 — Price Calculator",
        (
            "Internal price calculator for consult copy. Reads price-calc component "
            "fields, computes contact.price_calc_result via a math_operation node, "
            "tags v2_price_calc. Never writes opportunity.monetaryValue and never "
            "moves stages."
        ),
    ),
}


# ---- Assembly ---------------------------------------------------------------

# Which WFs contribute to each diagram_key.
KEY_TO_WFS: dict[str, list[str]] = {
    "wf01": ["01"],
    "wf02": ["02"],
    "preappt": ["03", "04"],
    "wf05": ["05"],
    "wf06": ["06"],
    "wf07-08": ["07", "08"],
    "retention": ["09", "10"],
    "support": ["11", "13", "14", "15", "16"],
    "wf12": ["12"],
    "wf17": ["17"],
}


def build() -> list[dict]:
    detail = json.loads(TOBE_DETAIL.read_text())
    wfs = detail["workflows"]

    out: list[dict] = []
    title, caption = TITLES["master"]
    out.append(
        {
            "key": "master",
            "title": title,
            "caption": caption,
            "src": master_flow(wfs),
        }
    )

    for key, ns in KEY_TO_WFS.items():
        title, caption = TITLES[key]
        if len(ns) == 1:
            src = flow_for_wf(ns[0], wfs[ns[0]])
        else:
            src = combined_flow(*[(n, wfs[n]) for n in ns])
        out.append({"key": key, "title": title, "caption": caption, "src": src})
    return out


def main() -> None:
    diagrams = build()
    OUT.write_text(json.dumps(diagrams, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(REPO_ROOT)} ({len(diagrams)} diagrams)")


if __name__ == "__main__":
    main()
