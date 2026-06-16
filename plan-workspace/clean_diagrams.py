# -*- coding: utf-8 -*-
"""
Assemble the Mermaid diagrams for the rebuilt workspace.

u, d, p are captured verbatim (no custom-object references). f (target object
model) and m (migration sequence) are rewritten to drop the rejected Lead Source
and Consent Log custom objects: attribution + consent stay canonical on the
Contact, the Opportunity carries an attribution copy, and the schema steps lose
the object-spike branch.

Input : diagrams.raw.json   (extracted verbatim from the deployed bundle)
Output: public/diagrams.json  ([{key,title,caption,src}])
  python clean_diagrams.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
raw = json.load(open(os.path.join(HERE, "diagrams.raw.json"), encoding="utf-8"))

# Target object model — 4 objects, no Lead Source / Consent Log custom objects.
F = """erDiagram
  CONTACT ||--o{ OPPORTUNITY : "has many (1 per deal)"
  CONTACT ||--o| EXTERNAL_EMR : "sync via emr_patient_id"
  OPPORTUNITY ||--o| EMR_VISIT : "per visit (emr_visit_id)"

  CONTACT {
    string id PK
    string first_name
    string last_name
    string email
    string phone
    date dob
    string ambassador_slug "unique"
    string sms_consent_status "canonical, WF 11 owned"
    date sms_consent_updated_at "WF 11 owned"
    string dnd_state "WF 11 owned"
    string utm_source "first/last touch"
    string utm_medium
    string utm_campaign
    string gclid "captured at form"
    string fbclid "captured at form"
    string source_url
    string emr_patient_id FK "EMR sync key"
    string communication_preference
  }
  OPPORTUNITY {
    string id PK
    string contact_id FK
    string emr_visit_id FK "per visit"
    string pipeline_id FK
    string stage_id FK
    string location "single field 4 values"
    string sale_outcome "WF 05 sole writer"
    string sale_type
    string patient_care_consultant_id FK
    monetary monetary_value "= total_program_amount"
    monetary total_program_amount
    monetary consultation_fee
    string product_sold_1
    string product_sold_2
    string product_sold_3
    monetary price_1
    monetary price_2
    monetary price_3
    string utm_source "attribution copy at create"
    string gclid "attribution copy at create"
    string nosale_reason "renamed from ad_reason"
    string nosale_reason_other
  }
  EXTERNAL_EMR {
    string emr_patient_id PK "GHL link only"
    string all_clinical_PHI "stays in EMR"
  }
  EMR_VISIT {
    string emr_visit_id PK
    string visit_data "stays in EMR"
  }
"""

# Migration sequence — no object-spike branch; schema is opp fields + renames.
M = """flowchart TD
  Start(["Now"]) --> P0a["P0a Stop the bleed - Fix WF 05 auto-Won"]
  Start --> P0b["P0b Revenue rec blockers - Dual-write fields"]
  P0a --> S1c["S1c Add fields to Opportunity (incl. attribution copy)"]
  P0b --> S1c
  S1c --> S1e["S1e Rename ad_* to nosale_* + patient_advisor to PCC"]
  S1e --> Step2["Step 2 Revenue backfill - dry-run CSV"]
  Step2 -->|Owner reviews CSV| Step2w["Step 2 Write mode"]
  Step2w --> Step3["Step 3 Build 16 target WFs as drafts"]
  Step3 --> Step5["Step 5 Canary cutover 48h"]
  Step5 -->|CLEAN| Step6["Step 6 Cleanup - retire legacy fields and pipelines"]
  Step5 -->|ISSUES| Hold["Hold + investigate"]
  Step6 --> End(["To-Be"])

  classDef p0 fill:#fee2e2,stroke:#dc2626,color:#991b1b,stroke-width:2px
  classDef schema fill:#dbeafe,stroke:#2563eb,color:#1e40af
  classDef gate fill:#fef3c7,stroke:#d97706,color:#92400e
  classDef terminal fill:#08428c,stroke:#08428c,color:#fff,stroke-width:2px
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#166534

  class Start,End terminal
  class P0a,P0b p0
  class S1c,S1e schema
  class Step2,Step5 gate
  class Step2w,Step3,Step6 ok
  class Hold gate
"""

diagrams = [
    {"key": "u", "title": "Current field model", "caption": "Every custom field hangs off the Contact — sale, attribution, and consent data all overwrite per person.", "src": raw["u"]},
    {"key": "d", "title": "Current pipelines", "caption": "18 pipelines: location clones, status-as-pipeline, and the A&D pipeline that auto-creates 939 false wins.", "src": raw["d"]},
    {"key": "f", "title": "Target object model", "caption": "Four destinations. Contact owns identity, attribution, and consent; Opportunity owns the deal and money (with an attribution copy); EMR stays external. No custom objects.", "src": F},
    {"key": "p", "title": "Target pipelines", "caption": "Sales, Retention & Renewals, Referrals, and the Instagram DM exception — stages with exit statuses, not status-as-pipeline.", "src": raw["p"]},
    {"key": "m", "title": "Migration sequence", "caption": "P0 fixes stop the bleed first; schema is additive opportunity fields plus renames; cutover is gated by a 48-hour canary.", "src": M},
]

json.dump(diagrams, open(os.path.join(HERE, "public", "diagrams.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

blob = json.dumps(diagrams).lower()
print("wrote public/diagrams.json :", len(diagrams), "diagrams")
for t in ("lead_source", "consent_log", "lead source", "consent log", "spike", "mirror", "denorm"):
    print("  contains %-12s : %s" % (t, t in blob))
