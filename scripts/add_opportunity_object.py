# -*- coding: utf-8 -*-
"""Inject the Opportunity-object model into folder_redesign.json so the view can lead with it.
Grounded in: field_destinations (Opportunity.adding), the opportunity.sale_type field, the PCC
SalesForm op_* fields, and standard GHL native deal fields. Usage counts (where a field currently
lives on the Contact) come from custom_fields.json to show what is migrating.
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).parent.parent
PUB = ROOT / "plan-workspace" / "public"
w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))

cf = json.load(open(PUB / "custom_fields.json", encoding="utf-8"))
cnt = {f["fieldKey"]: f.get("count", 0) for f in cf["fields"]}
def C(*keys):  # current usage on contact for a source field (max across candidates)
    return max([cnt.get(k, 0) for k in keys] or [0])

opportunity_object = {
    "title": "The Opportunity",
    "subtitle": "The deal record — one per consultation. This is where revenue lives and where New vs Renewal is set.",
    "groups": [
        {
            "name": "Deal (native GHL fields)",
            "note": "Built-in opportunity fields — no custom field needed.",
            "fields": [
                {"label": "Value", "hint": "monetaryValue", "note": "= Total Program Amount — the single revenue truth", "star": False},
                {"label": "Pipeline", "hint": "native", "note": "Sales · Retention & Renewals · Referrals · Instagram"},
                {"label": "Stage", "hint": "native", "note": "deal progress within the pipeline"},
                {"label": "Status", "hint": "native", "note": "Open · Won · Lost"},
                {"label": "Owner", "hint": "native", "note": "the PCC who ran the consult"},
                {"label": "Contact", "hint": "native", "note": "linked person record (supplies the folders below)"},
            ],
        },
        {
            "name": "Consultation type & outcome",
            "note": "Set by the PCC at disposition (see the PCC Sales Form).",
            "fields": [
                {"label": "Sale Type", "hint": "op_sale_type", "note": "New | Renewal — the consultation type. THE backbone.", "star": True, "count": C("contact.sale_type")},
                {"label": "Appointment Status", "hint": "op_appt_status", "note": "Showed · No-Show · Cancel · Reschedule"},
                {"label": "Sale Outcome", "hint": "op_sale_outcome", "note": "Sold · A&D · MUT · MAR", "count": C("contact.sale_outcome")},
                {"label": "Close Type", "hint": "opportunity tag", "note": "Same Day | Come-back — deal velocity tag set when Won; was contact tag booked_same_day"},
                {"label": "No-Sale Reason (+ Other)", "hint": "op_nosale_reason", "note": "was A&D Reason / A&D Other Explanation", "count": C("contact.ad_reason", "contact.ad_other_explanation")},
            ],
        },
        {
            "name": "Program & money",
            "note": "The sale itself — up to 3 products.",
            "fields": [
                {"label": "Product / Term / Price ×3", "hint": "op_product_sold_1..3", "note": "what was sold", "count": C("contact.treatment_type", "contact.product_sold__item_2")},
                {"label": "Total Program Amount", "hint": "op_total_program_amount", "note": "→ writes the deal Value", "count": C("contact.total_program_amount")},
                {"label": "Money Down", "hint": "op_money_down", "note": "collected at signing"},
                {"label": "Pay Type", "hint": "op_pay_type", "note": "PIF · SF · CARE · MAG · Cash · Card", "count": C("contact.pay_type")},
                {"label": "Consultation Fee", "hint": "op_consultation_fee", "note": "", "count": C("contact.consultation_fee", "contact.treatment_cost")},
                {"label": "Discount (% / $)", "hint": "op_discount_value · op_discount_type", "note": "optional"},
            ],
        },
        {
            "name": "People, place & links",
            "note": "Who, where, and the join to clinical records.",
            "fields": [
                {"label": "Patient Care Consultant", "hint": "op_patient_care_consultant_id", "note": "was Patient Advisor", "count": C("contact.patient_advisor")},
                {"label": "Provider", "hint": "op_provider", "note": "Provider Making Recommendation", "count": C("contact.provider_making_recommendation")},
                {"label": "Referred By", "hint": "op_referred_by", "note": "referral attribution — NEW patients only"},
                {"label": "Location (4 values)", "hint": "op_location", "note": "replaces 4 location-clone pipelines", "count": C("contact.location")},
                {"label": "EMR Visit FK", "hint": "op_emr_visit_id", "note": "links the deal to the clinical visit record"},
                {"label": "Consultation Notes", "hint": "op_consult_notes", "note": "free text"},
            ],
        },
    ],
}

doc = json.load(open(PUB / "folder_redesign.json", encoding="utf-8"))
doc["opportunity_object"] = opportunity_object
json.dump(doc, open(PUB / "folder_redesign.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
nfields = sum(len(g["fields"]) for g in opportunity_object["groups"])
w("injected opportunity_object: %d groups, %d fields" % (len(opportunity_object["groups"]), nfields))
