# -*- coding: utf-8 -*-
"""
Assemble the AS-IS workflow diagrams — the current-state mirror of the to-be set
in public/wf-diagrams.json.

Each diagram here uses the same key as its to-be counterpart so the Diagrams view
can pair them 1:1 (As-Is / To-Be toggle + side-by-side). Same Mermaid vocabulary
and colour palette as the to-be set.

These diagrams document CURRENT REALITY, grounded strictly in ../ghl_data:
  - workflows.json        (136 live workflows: names + published/draft status)
  - folder_workflows.json (the 22 workflows organised into folders 01-04)
  - tag_workflow_refs.json (49 tags -> which workflow adds/removes them)
Names and copy are quoted/summarised as they actually exist today — NOT rewritten
into brand voice. Where a to-be flow has no real counterpart, the as-is diagram
honestly shows the fragmented / draft-only / missing state.

Palette (matches clean set):
  #1e40af trigger   #166534 published-working   #92400e recovery
  #1e3a5f visit/decision   #7c3aed keystone   #0f766e gate
  #374151 draft/inactive   #b91c1c problem/duplication   #b45309 call

Output: public/wf-diagrams-asis.json  ([{key,title,caption,src}])
  python build_asis_wf_diagrams.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# master — current fragmented landscape (mirror of the to-be master journey)
# ---------------------------------------------------------------------------
MASTER = """flowchart TD
    START([Paid and Organic Traffic + Inbound]) --> F1
    subgraph F1 ["01. WP Lead Capture - 8 workflows"]
        LEADS[5 per-location Form and Source with Click ID\n01A-01E published\nplus 3 draft capture copies]
    end
    subgraph F2 ["02. Appointments and Visit Journey - 3 workflows"]
        NB[02. NON BOOKED NEWLEADS published\n02. Qualification Form draft\n02. Missed Call Force Stop draft]
    end
    subgraph F3 ["03. Call Routing and Dispositions - 8 workflows"]
        APPT[03. Appointment Booked published\n03A - 03b - 03c - 03d confirmation chain\nplus 03C draft duplicate]
    end
    subgraph F4 ["04. System Admin and Error Handling - 3 workflows"]
        INTK[04a. Intake Form Response published\nplus 04 and 04b draft intake variants]
    end
    F1 --> F2
    F2 --> F3
    F3 --> F4
    F4 --> VISIT{Clinic visit}
    VISIT --> OUT[05. Clinic Appt Outcome\n2 competing copies - published and draft\nplus Clinic Appointment Outcome draft]
    OUT --> POST[Post-visit scattered\n06A and 07 SHOWED - 06B MU - z Post-visit x3\nfeedback survey duplicates]
    POST --> RET[Retention and Nurture\nALL DRAFT - not live\nLong-Term Nurture x3 plus Copy x3]
    UNCAT[~100 more workflows - no folder\nA and D objection x8 - per-location no-show x6\ndispositions - CAPI - ambassador - IVR - referral]
    OUT -.-> UNCAT
    style OUT fill:#b91c1c,color:#fff
    style POST fill:#92400e,color:#fff
    style RET fill:#374151,color:#fff
    style UNCAT fill:#374151,color:#fff
    style VISIT fill:#1e3a5f,color:#fff
    style LEADS fill:#166534,color:#fff
    style NB fill:#166534,color:#fff
    style APPT fill:#166534,color:#fff
    style INTK fill:#166534,color:#fff
"""

# ---------------------------------------------------------------------------
# wf01 — Lead Capture and Attribution (5 published per-location workflows)
# Grounded in tag_workflow_refs: 01A-01E add lead_source_*, paid_click,
# location_*, funnel_entry_*. Duplicate draft capture workflows sit alongside.
# ---------------------------------------------------------------------------
WF01 = """flowchart TD
    T([Form Submitted - one of 5 location forms]) --> ROUTE
    ROUTE{Which location form?}
    ROUTE -->|Home| A[01A. Home Form and Source with Click ID]
    ROUTE -->|Richmond| B[01B. Richmond Form and Source with Click ID]
    ROUTE -->|VA Beach| C[01C. VA Beach Form and Source with Click ID]
    ROUTE -->|Newport News| D[01D. NPN Form and Source with Click ID]
    ROUTE -->|Consultation| E[01E. Consultation Form and Source with Click ID]
    A --> TAG
    B --> TAG
    C --> TAG
    D --> TAG
    E --> TAG
    TAG[Add tags - lead_source_meta - paid_click\nlead_source_google or bing or organic\nlocation_npn or rva or vba - funnel_entry_x]
    TAG --> DUP[Also present - draft duplicates\n01. WP Lead Capture\n01. NON BOOKED NEWLEADS mega-merge\n01. MWC Missed Call Text-Back latest]
    TAG --> NEXT([Hand-off is manual - no unified\nOpportunity-create or speed-to-lead step])
    style T fill:#1e40af,color:#fff
    style A fill:#166534,color:#fff
    style B fill:#166534,color:#fff
    style C fill:#166534,color:#fff
    style D fill:#166534,color:#fff
    style E fill:#166534,color:#fff
    style DUP fill:#b91c1c,color:#fff
    style NEXT fill:#92400e,color:#fff
    style ROUTE fill:#0f766e,color:#fff
"""

# ---------------------------------------------------------------------------
# wf02 — Non-Booked Recovery (mirror). Today: no unified 10-touch sequence.
# ---------------------------------------------------------------------------
WF02 = """flowchart TD
    T([Lead did not book]) --> NB
    NB[02. NON BOOKED NEWLEADS - published\nthe only live non-booked follow-up]
    NB --> Q1
    Q1[02. Qualification Form - draft\nadds funnel_qualified - funnel_abandon_p2\nnobook_paid - loc_richmond or newport or vabeach]
    Q1 --> OTHER
    OTHER[Overlapping drafts - not consolidated\nNo Book Paid - 48 Hour Recovery\n02. Missed Call Text Back Force Stop\nClicked Calendar but Did Not Book]
    NB -.-> NOTE([No documented 5 SMS + 4 email + voicemail\ncadence - copy and timing not extracted])
    style T fill:#92400e,color:#fff
    style NB fill:#166534,color:#fff
    style Q1 fill:#374151,color:#fff
    style OTHER fill:#374151,color:#fff
    style NOTE fill:#b91c1c,color:#fff
"""

# ---------------------------------------------------------------------------
# preappt — WF03/04 area (Call Routing and Dispositions + Intake).
# Grounded in folder 03 (8 workflows) + folder 04 (3 workflows) + tags:
# appt_confirmed, funnel_consultation_booked, unconfirmed_appt,
# auto_noshow_unconfirmed, intake_step_1..7, intake_complete.
# ---------------------------------------------------------------------------
PREAPPT = """flowchart TD
    START([Appointment Booked]) --> AB
    AB[03. Appointment Booked - published\nadds appt_confirmed - funnel_consultation_booked\nlocation and per-location appt tags]
    AB --> UNC
    UNC{Confirmed?}
    UNC -->|Unconfirmed| U1
    UNC -->|Confirmed| INTAKE
    U1[03b. Unconfirmed Appointment - Confirmation Required\npublished - adds auto_noshow_unconfirmed]
    U1 --> U2[03c. Unconfirmed Reply Handler - published\nremoves unconfirmed_appt on reply]
    U2 --> U3[03d. Update Appointment Status - published]
    U1 -.-> DUPC[Draft duplicates - 03A Unconfirmed\n03B Trigger link - 03C mega-merge\n03. Round Robin Masterfile]
    U3 --> INTAKE
    subgraph F4 ["04. Intake - System Admin folder"]
        INTAKE[04a. Intake Form Response - published] --> ISTEPS
        ISTEPS[04. Intake mega-merge - draft\nadds/removes intake_step_1..7\nintake_partial - intake_complete]
        ISTEPS -.-> IDUP[04b. Typeform Intake Response - draft]
    end
    INTAKE --> APPT([Appointment day - no unified\nreminder cadence extracted])
    style START fill:#1e40af,color:#fff
    style AB fill:#166534,color:#fff
    style U1 fill:#166534,color:#fff
    style U2 fill:#166534,color:#fff
    style U3 fill:#166534,color:#fff
    style INTAKE fill:#166534,color:#fff
    style UNC fill:#0f766e,color:#fff
    style DUPC fill:#b91c1c,color:#fff
    style ISTEPS fill:#374151,color:#fff
    style IDUP fill:#374151,color:#fff
    style APPT fill:#7c3aed,color:#fff
"""

# ---------------------------------------------------------------------------
# wf05 — Clinic Outcome (keystone). The core problem: competing outcome
# workflows, auto-Won behaviour. Grounded in workflows.json names.
# ---------------------------------------------------------------------------
WF05 = """flowchart TD
    T([Appointment attended]) --> WHICH
    WHICH{Which outcome workflow fires?\nMultiple exist}
    WHICH -->|published| P1[05. Clinic Appt Outcome\n528b598e published]
    WHICH -->|draft copy| P2[05. Clinic Appt Outcome\n264c74ce draft - same name]
    WHICH -->|draft| P3[Clinic Appointment Outcome\nbdac918b draft]
    WHICH -->|draft| P4[z SOLD LEADS\ne3ce4e8e draft]
    P1 --> AUTO
    AUTO[Auto-creates / moves Opportunity to Won\nfor attendees - no single PCC-driven writer\nknown source of inflated Won count]
    AUTO --> DOWN[Downstream tags/fields set by automation\nnot by a Sales Form]
    P2 -.-> AUTO
    style T fill:#7c3aed,color:#fff
    style WHICH fill:#b91c1c,color:#fff
    style AUTO fill:#b91c1c,color:#fff
    style P1 fill:#166534,color:#fff
    style P2 fill:#374151,color:#fff
    style P3 fill:#374151,color:#fff
    style P4 fill:#374151,color:#fff
    style DOWN fill:#92400e,color:#fff
"""

# ---------------------------------------------------------------------------
# wf06 — Post-Visit Won: onboarding and review (mirror).
# ---------------------------------------------------------------------------
WF06 = """flowchart TD
    T([Patient showed / marked Won]) --> A
    A[07. POST-VISIT - SHOWED Opportunities\nand For Review/Referral - published]
    A --> B[06A. POST-VISIT - SHOWED ... - draft\nnear-duplicate of 07]
    A --> REV
    REV[Review requests - split and duplicated\nReviews - Positive for CS - published\nReviews - Negative For Sales - draft\nz Post-visit review request - draft]
    A --> MSG[z Post-visit messaging - draft\nz Post-visit A and D - draft]
    A --> SURVEY[Feedback survey - 4 overlapping workflows\nAfter Appointment Feedback Survey Send - published\nplus 3 draft survey variants]
    A --> MU[06B. MU - draft]
    style T fill:#166534,color:#fff
    style A fill:#166534,color:#fff
    style B fill:#b91c1c,color:#fff
    style REV fill:#374151,color:#fff
    style MSG fill:#374151,color:#fff
    style SURVEY fill:#374151,color:#fff
    style MU fill:#374151,color:#fff
"""

# ---------------------------------------------------------------------------
# wf07-08 — No-Sale Nurture + No-Show Recovery (mirror). Heavily duplicated.
# ---------------------------------------------------------------------------
WF0708 = """flowchart LR
    subgraph AD ["No-Sale / Advised and Declined - objection tags"]
        T1([A and D outcome]) --> OBJ
        OBJ[8 objection workflows\nA and D Cost - Fear - Partner - Timing\nplus JJ Cost - Fear - Partner - Timing duplicates]
        OBJ --> DEC[Decision Support and JJ Decision Support\ntag added to objection_decision]
        DEC --> ADZ[z Post-visit A and D - draft\nno consolidated 35-day sequence]
    end
    subgraph NS ["No-Show / Cancel Recovery - per location"]
        T2([No-Show or Cancel]) --> PERLOC
        PERLOC[Per-location drafts\nNewport News - No Show and Cancelled\nRichmond - No Show and Cancelled\nVirginia Beach - No Show and Cancelled]
        PERLOC --> LIVE[Live pieces\nCancelled Appointments - published\nNurture - Missed Clinic Appointment - published]
        LIVE --> NSZ[Follow-ups for no-shows - draft\nCancelled Appointment - Follow Up - draft\nMWC Funnel Page 4 - No-Show Recovery - draft]
    end
    style T1 fill:#92400e,color:#fff
    style T2 fill:#1e3a5f,color:#fff
    style OBJ fill:#b91c1c,color:#fff
    style DEC fill:#374151,color:#fff
    style ADZ fill:#374151,color:#fff
    style PERLOC fill:#b91c1c,color:#fff
    style LIVE fill:#166534,color:#fff
    style NSZ fill:#374151,color:#fff
"""

# ---------------------------------------------------------------------------
# retention — WF09 Retention/Renewals + WF10 Long-Term Nurture (mirror).
# Today: everything is DRAFT — nothing live.
# ---------------------------------------------------------------------------
RETENTION = """flowchart TD
    subgraph R ["Retention and Renewal - all draft"]
        RT([Program nearing renewal]) --> R1
        R1[Retention and Renewal - Follow Ups\ndraft - not live]
        R1 --> RTAG[Tag Added status_nurture_longterm\n- Long Term Follow Up - draft]
    end
    subgraph N ["Long-Term Nurture - all draft - duplicated"]
        NT([No-sale / no-show / lapsed]) --> N1
        N1[Long-Term Nurture COLD - WARM - HOT\n3 draft workflows]
        N1 --> N2[Copy - Long-Term Nurture COLD - WARM - HOT\n3 more draft duplicates]
        N2 --> NEDGE[Tag Added status_nurture_longterm\nrouter - draft]
    end
    RTAG --> NT
    NOTE([No live retention or long-term nurture\nautomation today - drafts only])
    N2 -.-> NOTE
    style RT fill:#374151,color:#fff
    style NT fill:#374151,color:#fff
    style R1 fill:#374151,color:#fff
    style RTAG fill:#374151,color:#fff
    style N1 fill:#374151,color:#fff
    style N2 fill:#b91c1c,color:#fff
    style NEDGE fill:#374151,color:#fff
    style NOTE fill:#b91c1c,color:#fff
"""

# ---------------------------------------------------------------------------
# support — WF11-16 support/infra cluster (mirror). Grounded in workflows.json.
# ---------------------------------------------------------------------------
SUPPORT = """flowchart TD
    subgraph COMP ["Compliance / DND / Errors"]
        C1[2. DNC/wrong number/SMS and Call Errors - published]
        C2[3. Email Bounce - published]
        C3[08. MUT Medically Untreatable - published]
        C4[DND Active - Remove all workflows - draft\nCustomer Replied Stop - Remove all - draft\nz STOP - draft\nTag system_mut - Remove all Workflows - draft]
    end
    subgraph DISP ["Call Disposition - overlapping"]
        D1[4a. Softphone Call Disposition - published\n4b. Disposition active - published]
        D2[4b. Disposition inactive - draft\n4b. Update Last Disposition - draft\nCall Dispo - draft - z Contact Call Disposition - draft]
    end
    subgraph ADS ["Ad Platform Conversions - CAPI"]
        A1[CAPI Send Booked Call Data to Meta - published\nFacebook CAPI Send Booked Call Data - published]
        A2[GHL Form Submitted - Google Ads - published\nGHL Phone Call - Google Ads - published\nGHL Website Chat - Google Ads - published]
    end
    subgraph EDGE ["Comms Edge - missed call / chat / IVR"]
        E1[Chat Widget Out of Office Hours - published\n1. IVR - simultaneous - published]
        E2[MWC Missed Call Text-Back - draft\n01. MWC Missed Call Text-Back latest - draft\nBF Chatbot Inbound - draft - IVR RR - draft]
    end
    subgraph REF ["Ambassador and Referral"]
        F1[Ambassador Enrollment - Onboarding\nPatient Routing - Reward Notification - published\nPCC Referral Lead Routing - published]
        F2[Referral Activation - draft - 09 Referral Activation - draft\nReferral Qualification - draft\nz Referral tracking and rewards - draft]
    end
    style C1 fill:#7f1d1d,color:#fff
    style C2 fill:#7f1d1d,color:#fff
    style C3 fill:#7f1d1d,color:#fff
    style C4 fill:#374151,color:#fff
    style D1 fill:#166534,color:#fff
    style D2 fill:#374151,color:#fff
    style A1 fill:#1e40af,color:#fff
    style A2 fill:#166534,color:#fff
    style E1 fill:#166534,color:#fff
    style E2 fill:#374151,color:#fff
    style F1 fill:#166534,color:#fff
    style F2 fill:#374151,color:#fff
"""

diagrams = [
    {"key": "master",
     "title": "AS-IS: All workflows — current fragmented landscape",
     "caption": "Today there is no single patient journey. 136 workflows exist in the location; only 22 are organised into folders 01-04, and the rest are uncategorised. Green = live/published, gray = draft-only, red = duplicated or broken. Note the split 05 outcome workflows and the fully-draft retention layer.",
     "src": MASTER},
    {"key": "wf01",
     "title": "AS-IS: Lead Capture and Attribution",
     "caption": "Lead capture is split across 5 separate published per-location workflows (01A Home, 01B Richmond, 01C VA Beach, 01D NPN, 01E Consultation), each adding lead_source_*, paid_click, location_*, and funnel_entry_* tags. Three more draft capture workflows overlap. No unified Opportunity-create or speed-to-lead step was extracted.",
     "src": WF01},
    {"key": "wf02",
     "title": "AS-IS: Non-Booked Recovery",
     "caption": "Only '02. NON BOOKED NEWLEADS' is published. '02. Qualification Form' (draft) sets funnel_qualified / funnel_abandon_p2 / nobook_paid / loc_* tags, and several other drafts overlap. No consolidated 10-touch SMS/email/voicemail cadence exists today — step copy and timing were not extractable.",
     "src": WF02},
    {"key": "preappt",
     "title": "AS-IS: Pre-Appointment — booking, confirmation, intake",
     "caption": "Folder 03 (Call Routing and Dispositions) holds the live confirmation chain: 03. Appointment Booked, 03b Confirmation Required, 03c Reply Handler, 03d Update Status (all published), with 03A/03B/03C draft duplicates. Folder 04 has 04a Intake (published) plus a draft mega-merge cycling intake_step_1..7 / intake_complete tags. No unified reminder cadence was extracted.",
     "src": PREAPPT},
    {"key": "wf05",
     "title": "AS-IS: Clinic Outcome (the keystone problem)",
     "caption": "The outcome step is split across competing workflows: two named '05. Clinic Appt Outcome' (one published, one draft), plus 'Clinic Appointment Outcome' and 'z SOLD LEADS' drafts. Automation moves the Opportunity to Won for attendees rather than a single PCC-driven Sales Form — the root cause of inflated Won counts the rebuild targets.",
     "src": WF05},
    {"key": "wf06",
     "title": "AS-IS: Post-Visit Won — onboarding and review",
     "caption": "'07. POST-VISIT - SHOWED Opportunities and For Review/Referral' is published, shadowed by the near-identical '06A' draft. Review requests are split (Reviews Positive published, Reviews Negative draft, z Post-visit review request draft), and feedback survey logic is spread across 4 overlapping workflows. No single NPS-gated onboarding flow.",
     "src": WF06},
    {"key": "wf07-08",
     "title": "AS-IS: No-Sale Nurture + No-Show Recovery",
     "caption": "No-Sale is a pile of per-objection tag workflows: A&D Cost/Fear/Partner/Timing plus duplicate 'JJ' copies, plus Decision Support. No-Show recovery is duplicated per location (Newport News / Richmond / Virginia Beach - No Show and Cancelled drafts), with only 'Cancelled Appointments' and 'Nurture: Missed Clinic Appointment' published. No consolidated sequences.",
     "src": WF0708},
    {"key": "retention",
     "title": "AS-IS: Retention + Long-Term Nurture",
     "caption": "There is no live retention automation today. 'Retention & Renewal → Follow Ups' is draft; Long-Term Nurture exists as COLD/WARM/HOT drafts plus a full duplicate 'Copy - Long-Term Nurture' COLD/WARM/HOT set, routed by the draft 'Tag Added status_nurture_longterm' workflow. Everything in this layer is draft-only.",
     "src": RETENTION},
    {"key": "support",
     "title": "AS-IS: Support and Infrastructure",
     "caption": "Support functions exist but are scattered and half-duplicated. Live: DNC/Errors, Email Bounce, MUT, softphone disposition, Meta+Google CAPI, Chat OOO, IVR, and the Ambassador/PCC-referral set. Draft/overlapping: multiple DND-stop workflows, inactive disposition copies, missed-call text-back variants, and duplicate referral-activation flows.",
     "src": SUPPORT},
]

out = os.path.join(HERE, "public", "wf-diagrams-asis.json")
json.dump(diagrams, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote public/wf-diagrams-asis.json :", len(diagrams), "diagrams")
