#!/usr/bin/env python3
"""Rebuild plan-workspace/public/tobe-detail.json and patch
plan-workspace/public/data.json tobe_workflows[] from the locked v2 spec.

Source of truth: /workspace/to-be/wf-*.json plus the constants in this file.
Never contacts GHL. Never publishes. Safe to re-run.

Run from repo root or from plan-workspace/:

    python plan-workspace/build_tobe_v2_detail.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_HERE = Path(__file__).resolve().parent
# Support the two historic install paths: repo root, or plan-workspace/.
if (_HERE / "to-be").is_dir():
    REPO_ROOT = _HERE
elif (_HERE.parent / "to-be").is_dir():
    REPO_ROOT = _HERE.parent
else:  # last-ditch — original layout expected sibling to plan-workspace/
    REPO_ROOT = _HERE.parents[1]
TOBE = REPO_ROOT / "to-be"
PW_PUBLIC = REPO_ROOT / "plan-workspace" / "public"

# ---- Per-WF metadata (locked) ------------------------------------------------

# Each entry maps to the shape ToBeWorkflow.tsx expects. Steps come from
# to-be/wf-NN.json named_steps but the top-level fields are hard-coded here.

QUIET_TRANSACTIONAL = (
    "None. Transactional SMS sends immediately (no quiet hours)."
)
QUIET_MARKETING = (
    "08:00-21:00 contact timezone, 7 days. Marketing / recovery only."
)
QUIET_INTERNAL = "n/a (internal / system, no SMS)."


WF_META: dict[str, dict] = {
    "01": {
        "purpose": (
            "First touch. Enrolls new next-lander contacts, create-once opens "
            "one Sales opportunity, stamps Method 2 clinic context, sends the "
            "welcome email and welcome SMS, then hands to WF-02 after 24 hours."
        ),
        "diagram_key": "wf01",
        "trigger": {
            "type": "Contact Created + Has Tag next-lander",
            "filters": [
                "Contact has tag next-lander (staging tag id EA2hrrIHTrlFvEEt6RzH)",
                "No source filter on the trigger; wordpress-form is an inner branch only",
                "Empty source defaults to next-lander",
            ],
            "target": (
                "Any Contact Created event that carries the next-lander tag. "
                "WordPress leads land via WPCode snippet 11461 + Gravity Form 1 "
                "posting to https://book.menswellnesscenters.com/api/handoff/wordpress "
                "then /api/qualify upserts the contact. The WP CID bridge is not changed."
            ),
        },
        "prerequisites": [
            "Live tag next-lander (staging id EA2hrrIHTrlFvEEt6RzH); do not rename.",
            "Method 2 contact fields exist: current_clinic_address (a2v4CqA8zXaZ0iu901f6), current_clinic_phone (k7ci7d1rnExhAVtEE768), current_booking_url (W74Kznhixhaq5sJWbk4r), current_review_link (5WQWnA1nuMn0SWwTLxKR).",
            "Staging Sales pipe ASnpfhu1hpSHUv0IFLc7 with New Lead stage 31a81ba6-10c4-4033-8401-4e864ec9495c. Production pipe Vt8cPz51C3i87moo73gQ is not on staging.",
            "Native email template j7C8MVs6cAIuH5zPUjzH: EML | WF-01 | Welcome.",
            "Allow Duplicate Opportunities = ON. WF-01 still create-once guards against a second open Sales opp.",
        ],
        "messages": [
            {
                "step": "Step: EMAIL welcome",
                "channel": "Email",
                "body": "Native template EML | WF-01 | Welcome (j7C8MVs6cAIuH5zPUjzH). Copy respects the locked rules (members not patients, clinic not office, no-cost not free, no em-dashes).",
            },
            {
                "step": "Step: SMS welcome (create path only)",
                "channel": "SMS",
                "body": "Inline SMS. First SMS in the sequence carries Reply STOP to opt out. Transactional; no Time Window.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "No. Create-once via FIND-OPP guard on the staging Sales pipe.",
            "stop_on_response": "Yes. Inbound STOP routes into WF-11 Compliance.",
            "reentry_caveat": "Ambassador and PCC referral contacts re-enter WF-01 as new next-lander contacts (never merged).",
            "status": "Draft v12 on staging shell 869782c6-00d6-4349-ab6e-4e0f2a98bd04. Restored from v10 on 2026-08-21 PT after a stub overwrite. Unpublished.",
        },
        "test": [
            "Create a test contact with tag next-lander. Confirm exactly one open Sales opp on staging pipe ASnpfhu1hpSHUv0IFLc7 with stage New Lead.",
            "Confirm current_clinic_* fields are stamped from the correct slug (richmond, virginia-beach, or newport-news).",
            "Confirm welcome email and SMS fire on the create path only. Duplicate enroll into WF-01 must not create a second opp.",
            "Confirm WF-02 receives the contact after WAIT 24 hour.",
        ],
        "depends_on": ["WF-02 (hand-off after 24h)", "WF-11 (STOP inbound)"] ,
        "variables": {
            "principle": (
                "Clinic slug is the single variable. Slug values are richmond, "
                "virginia-beach, and newport-news. Method 2 stamps four generic "
                "fields on the Contact so downstream templates never branch on clinic."
            ),
            "location_variable": "opportunity.location XbaJOEsDwgxMtudnj5IG holds the display label (Richmond, Virginia Beach, Newport News); do not rewrite these options while 2bv2 is published.",
            "collision_warning": "Do not touch the historical location_* tags or LOC_TAGS. New tags are v2_*.",
            "methods": [
                {
                    "name": "Method 2 stamp arms (this workflow)",
                    "detail": "One IF-ELSE branch on contact.current_clinic_slug writes current_clinic_address, current_clinic_phone, current_booking_url, and current_review_link once. WF-01 is the only workflow that writes these fields.",
                },
            ],
            "custom_values": [
                "GHL_WF05_WEBHOOK_URL (Force config; not stamped from any workflow)",
                "Booking URL pattern: https://book.menswellnesscenters.com/{slug}",
                "Review link stamps use the live per-clinic listing URLs (opaque strings; the workflow just stamps the string).",
            ],
        },
    },
    "02": {
        "purpose": (
            "Non-booked recovery burst for contacts that finished WF-01 but did "
            "not book. Marketing / recovery: quiet hours apply."
        ),
        "diagram_key": "wf02",
        "trigger": {
            "type": "Added by WF-01 (no direct trigger on the shell)",
            "filters": [
                "Enrolled via ADD-TO-WF from WF-01 after WAIT 24 hour",
                "Not funnel_entry_* origins (WF-02 enforces its own exclusion)",
            ],
            "target": "WF-01 hand-off only. There is no form trigger; contacts arrive via ADD-TO-WF.",
        },
        "prerequisites": [
            "WF-01 is live (draft) and hands off correctly.",
            "Native email template bPj39XTcKv2HylGKEUdG: EML | WF-02 | Non-booked 24h.",
        ],
        "messages": [
            {
                "step": "SMS at +3m, +1m, +5m, +15m, and +36h",
                "channel": "SMS",
                "body": "Inline SMS. First SMS carries Reply STOP to opt out.",
            },
            {
                "step": "EMAIL at 24h",
                "channel": "Email",
                "body": "Native template EML | WF-02 | Non-booked 24h (bPj39XTcKv2HylGKEUdG).",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_MARKETING,
            "allow_reentry": "No. One pass per WF-01 enroll.",
            "stop_on_response": "Yes. Inbound STOP routes into WF-11 Compliance.",
            "reentry_caveat": "Contacts who book are dropped from WF-02 by WF-03's REMOVE-FROM-WF step.",
            "status": "Draft v9 on staging shell 5f973b3c-0375-4fc0-ace2-e13d1a1976b9. Restored from v4 on 2026-08-21 PT after a stub overwrite. Unpublished.",
        },
        "test": [
            "Enroll a test contact via WF-01 and confirm the SMS burst fires only inside 08:00-21:00 contact TZ.",
            "Book an appointment mid-burst and confirm WF-03 removes the contact from WF-02.",
            "Confirm hand-off to WF-09 after the final SMS.",
        ],
        "depends_on": ["WF-01", "WF-09"],
    },
    "03": {
        "purpose": (
            "Confirm the appointment and send appointment-relative reminders "
            "across the three consult calendars. Transactional; no quiet hours."
        ),
        "diagram_key": "preappt",
        "trigger": {
            "type": "Appointment Booked on one of the three consult calendars",
            "filters": [
                "Calendar 1Cfy5JnO2A4ggiZlMVvX (richmond)",
                "Calendar 4xmnBGMWJ6TVUKcAPpPb (virginia-beach)",
                "Calendar lBaRbjUpEmesxEloFBME (newport-news)",
                "appt_status != reschedule at trigger time (reschedule never enters as no-show)",
            ],
            "target": "Native Appointment Booked trigger on the three clinic calendars.",
        },
        "prerequisites": [
            "New v2 tag v2_status_booked exists on staging (NR1KZuPH1xzWOuu0pHd4).",
            "Native email templates GUs77konNdAGFS0EFZS2 (EML | WF-03 | Confirm appointment) and QcpX2V3OarwL5jKN6OFE (EML | WF-03 | T-3d reminder).",
        ],
        "messages": [
            {
                "step": "Confirm email + SMS",
                "channel": "Email",
                "body": "Native template EML | WF-03 | Confirm appointment (GUs77konNdAGFS0EFZS2), followed by an inline confirm SMS.",
            },
            {
                "step": "T-3d reminder",
                "channel": "Email",
                "body": "Native template EML | WF-03 | T-3d reminder (QcpX2V3OarwL5jKN6OFE), then an inline T-3d SMS.",
            },
            {
                "step": "T-1d / T-5h / T-2h reminders",
                "channel": "SMS",
                "body": "Inline SMS at each waypoint. Bodies reference contact.current_clinic_address, contact.current_clinic_phone, and contact.current_booking_url only. Do not use {{location.name}}.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes. Each new appointment re-enters this workflow; reschedule re-arms reminders.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "REMOVE-FROM-WF WF-02 fires on entry so recovery does not overlap.",
            "status": "Draft v7 on staging shell ec08cae5-3d1f-48bd-9a0d-444626d9a150. Unpublished.",
        },
        "test": [
            "Book an appointment on each of the three calendars and confirm the appointment-relative waits render at T-3d, T-1d, T-5h, T-2h with appointmentCondition=skip.",
            "Reschedule an appointment and confirm the new appointment carries reminders and the old enrollment exits via the rescheduled goal.",
            "Confirm the T-3d email fires before the T-3d SMS.",
        ],
        "depends_on": ["WF-02 (removes)", "WF-04 (hand-off 1h after confirm)"],
    },
    "04": {
        "purpose": (
            "Chase the medical intake survey after a booking. Exits on submit."
        ),
        "diagram_key": "preappt",
        "trigger": {
            "type": "Added by WF-03 (no direct trigger on the shell)",
            "filters": [
                "Enrolled after the confirm cadence completes (1h after confirm)",
                "v2_status_booked present",
            ],
            "target": "WF-03 hand-off only.",
        },
        "prerequisites": [
            "Intake survey is live in the account.",
            "Note: a dedicated intake URL contact field does not exist yet; WF-04 SMS bodies use contact.current_booking_url as the manage / complete-intake link.",
        ],
        "messages": [
            {
                "step": "SMS Intake chase +4h",
                "channel": "SMS",
                "body": "Inline SMS. First SMS in the sequence carries Reply STOP to opt out.",
            },
            {
                "step": "SMS Intake chase +20h",
                "channel": "SMS",
                "body": "Inline SMS.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "No. One pass per booking.",
            "stop_on_response": "Yes. Exits immediately on survey submit as well.",
            "reentry_caveat": "Reschedule re-enters via WF-03 and re-arms this chase.",
            "status": "Draft v3 on staging shell 4854e1cf-492d-4da8-ba23-5c14a4d04229. Unpublished.",
        },
        "test": [
            "Enroll a test contact via WF-03 and confirm both SMS fire.",
            "Submit the intake survey mid-chase and confirm the workflow exits.",
        ],
        "depends_on": ["WF-03"],
    },
    "05": {
        "purpose": (
            "Central router for Force outcome writes. Reads opportunity.sale_outcome_v2 "
            "and routes downstream. Workflows never move Sales stages here."
        ),
        "diagram_key": "wf05",
        "trigger": {
            "type": "Inbound webhook (Force writes)",
            "filters": [
                "Force posts sale_outcome, sale_type, appt_status, ad_reason to GHL_WF05_WEBHOOK_URL",
                "MAR payloads are dropped at the top of the graph and never fire downstream",
            ],
            "target": "Trigger id ryJLJ1McWWOHlAvBRsI3. The webhook URL is UI-only; copy it from the WF-05 draft in staging and paste it into Force config as GHL_WF05_WEBHOOK_URL. The JWT GET does not return this URL.",
        },
        "prerequisites": [
            "Force is the only writer of sale_outcome (SOLD | AD | MUT | MAR), sale_type (new | renewal), and appt_status (showed | no-show | cancel | reschedule).",
            "opportunity.sale_outcome_v2 is the routing field. Legacy contact.sale_outcome labels are not used.",
            "WF-05 never moves Sales stages (New Lead to Booked to Showed to Won). Force moves stages.",
            "GHL router still ADD-TO-WF WF-13 on SOLD + new. Site cards hide WF-13 (dropped_from_v2) but the router node exists in the shell.",
        ],
        "messages": [{"step": "n/a", "channel": "n/a", "body": "System workflow. No SMS or email."}],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes; every Force write re-enters the router.",
            "stop_on_response": "n/a (no outbound SMS).",
            "reentry_caveat": "MAR always drops; every other outcome routes once.",
            "status": "Draft v5 on staging shell 45a0f21e-244c-4d66-8ee1-232567662624. Unpublished.",
        },
        "test": [
            "Send test webhooks for each sale_outcome value. Confirm SOLD+new adds to WF-06 AND WF-13 (GHL router truth); SOLD renewal adds to WF-09; AD adds to WF-07; MUT adds to WF-11; MAR drops.",
            "Send appt_status=reschedule and confirm the router sends it to WF-03 (not WF-08).",
            "Confirm no workflow moves opp stages.",
        ],
        "depends_on": ["WF-06", "WF-07", "WF-08", "WF-09", "WF-11"],
    },
    "06": {
        "purpose": (
            "Onboard SOLD new members. Sole writer of contact.membership_status "
            "and tag v2_status_active. Schedules WF-10 feedback and WF-14 ambassador."
        ),
        "diagram_key": "wf06",
        "trigger": {
            "type": "Added by WF-05 (SOLD + sale_type=new)",
            "filters": ["sale_outcome_v2 = SOLD", "sale_type = new"],
            "target": "WF-05 hand-off only.",
        },
        "prerequisites": [
            "v2 tag v2_status_active exists on staging (P5yoBUi86hQs0Br5CIqI).",
            "WF-10 and WF-14 are ready to receive the T+14 and T+21 forks.",
        ],
        "messages": [
            {
                "step": "SMS welcome after SOLD",
                "channel": "SMS",
                "body": "Inline SMS. References contact.current_clinic_address and contact.current_clinic_phone. First SMS carries Reply STOP to opt out.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "No. One onboarding per SOLD new event.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "Renewals never enter WF-06 (they go to WF-09).",
            "status": "Draft v3 on staging shell 5d036b8a-4336-47c8-9ebe-77f3439bc95c. Check-in copy between the 3d/7d/14d/21d waits is not authored yet.",
        },
        "test": [
            "Send a SOLD+new Force webhook and confirm v2_status_active + welcome SMS + WF-10 at T+14 + WF-14 at T+21.",
            "Send a SOLD+renewal webhook and confirm WF-06 is not entered.",
        ],
        "depends_on": ["WF-05", "WF-10", "WF-14"],
    },
    "07": {
        "purpose": (
            "Handle sale_outcome=AD (Advise and Decline). Tag v2_outcome_ad, "
            "send the first logistics SMS, wait 35 days, hand to WF-09."
        ),
        "diagram_key": "wf07-08",
        "trigger": {
            "type": "Added by WF-05 (AD)",
            "filters": ["sale_outcome_v2 = AD"],
            "target": "WF-05 hand-off only.",
        },
        "prerequisites": [
            "v2_outcome_ad tag exists on staging.",
            "Objection-branch copy (v2_objection_price/timing/fit/other) is spec-only for now; the on-shell graph is a single lane.",
        ],
        "messages": [
            {
                "step": "SMS After AD first touch",
                "channel": "SMS",
                "body": "Inline SMS. First SMS carries Reply STOP to opt out.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "No.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "AD never fires the Meta pixel or CAPI.",
            "status": "Draft v3 on staging shell 01ca0908-36cf-456c-aa1d-04c999e0a598. Unpublished.",
        },
        "test": [
            "Send AD via Force and confirm the tag lands and the SMS fires.",
            "Confirm hand-off to WF-09 after 35d.",
        ],
        "depends_on": ["WF-05", "WF-09"],
    },
    "08": {
        "purpose": (
            "Handle no-show and cancel. Reschedule never enters. Drops the "
            "contact from WF-03 reminders and tries to rebook."
        ),
        "diagram_key": "wf07-08",
        "trigger": {
            "type": "Added by WF-05 (appt_status no-show or cancel)",
            "filters": [
                "appt_status in (no-show, cancel)",
                "appt_status = reschedule NEVER routes here",
            ],
            "target": "WF-05 hand-off only.",
        },
        "prerequisites": [
            "WF-03 remove-from-workflow guard is in place; no reminders should fire once WF-08 starts.",
            "v2_status_noshow vs v2_status_cancelled tag split now lives on the shell (v4). Both statuses share a single rebook cadence.",
        ],
        "messages": [
            {
                "step": "SMS Rebook after miss and SMS Rebook +7d",
                "channel": "SMS",
                "body": "Inline SMS. First SMS carries Reply STOP to opt out.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes on the next miss.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "If the contact books again mid-recovery, WF-08 exits without further nudge.",
            "status": "Draft v4 on staging shell d35d04ac-0042-4e33-95dd-9253b2847bdf. Unpublished.",
        },
        "test": [
            "Send appt_status=no-show and confirm WF-03 removes the contact and WF-08 sends both SMS.",
            "Send appt_status=reschedule and confirm WF-08 is NOT entered (it goes to WF-03).",
            "Confirm hand-off to WF-09 after 7d if still unbooked.",
        ],
        "depends_on": ["WF-05", "WF-03", "WF-09"],
    },
    "09": {
        "purpose": (
            "Long-tail nurture. Also owns the renewal_date contact-field "
            "sub-flow, which is blocked at the trigger until backfill lands."
        ),
        "diagram_key": "retention",
        "trigger": {
            "type": "Contact renewal_date changed (sub-flow, gated) OR Added by WF-02/07/08/06",
            "filters": [
                "Renewal sub-flow gated until backfill_ready is true",
                "Other entries via ADD-TO-WF only",
            ],
            "target": "Contact custom-field trigger on renewal_date + hand-offs from upstream WFs.",
        },
        "prerequisites": [
            "renewal_date backfill is not done yet; keep the renewal sub-flow gated.",
            "The on-shell graph is a single WAIT 120d right now. Nurture bodies come next.",
        ],
        "messages": [
            {
                "step": "Nurture bodies",
                "channel": "n/a",
                "body": "SMS and email bodies are not authored yet. The shell is a 120-day wait.",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_MARKETING,
            "allow_reentry": "Yes.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "The renewal sub-flow will exit if backfill_ready is false.",
            "status": "Draft v2 on staging shell cbc14e90-4507-42cd-afcc-f7410d7f4554. Unpublished.",
        },
        "test": [
            "Set renewal_date on a test contact and confirm the sub-flow trigger fires but exits on backfill guard.",
            "Confirm long-tail entries from WF-02, WF-07, WF-08 land in WF-09.",
        ],
        "depends_on": ["WF-02", "WF-06", "WF-07", "WF-08"],
    },
    "10": {
        "purpose": (
            "Ask for member feedback and store the score on "
            "contact.latest_feedback_score. Sole writer of that field."
        ),
        "diagram_key": "retention",
        "trigger": {
            "type": "Added by WF-06 at T+14",
            "filters": ["Enrolled from WF-06 onboarding fork"],
            "target": "WF-06 hand-off only.",
        },
        "prerequisites": [
            "Native email template BFhyqVQXEYVasm4hJWvE: EML | WF-10 | Feedback invite.",
            "contact.latest_feedback_score exists.",
            "contact.current_review_link is populated (WF-01 stamp).",
        ],
        "messages": [
            {
                "step": "SMS Feedback invite",
                "channel": "SMS",
                "body": "Inline SMS. References contact.current_review_link. First SMS carries Reply STOP to opt out.",
            },
            {
                "step": "EMAIL Feedback invite",
                "channel": "Email",
                "body": "Native template EML | WF-10 | Feedback invite (BFhyqVQXEYVasm4hJWvE). Also references contact.current_review_link.",
            },
            {
                "step": "SMS Feedback nudge (+3d)",
                "channel": "SMS",
                "body": "Inline SMS.",
            },
        ],
        "settings": {
            "quiet_hours": QUIET_MARKETING,
            "allow_reentry": "No. One feedback ask per onboarding.",
            "stop_on_response": "Yes. Exits on survey submit as well.",
            "reentry_caveat": "Only WF-10 writes contact.latest_feedback_score.",
            "status": "Draft v3 on staging shell 37b1202a-5397-4e08-92da-bb638c862a2a. Unpublished.",
        },
        "test": [
            "Enroll via WF-06 T+14 and confirm invite SMS + email fire only inside 08:00-21:00 contact TZ.",
            "Submit the survey and confirm the score writes and the workflow exits.",
        ],
        "depends_on": ["WF-06"],
    },
    "11": {
        "purpose": (
            "Compliance and errors. Sole writer of DND and "
            "contact.sms_consent_status. STOP inbound plus a MUT front-gate "
            "so MUT routing does not get treated like a STOP."
        ),
        "diagram_key": "support",
        "trigger": {
            "type": "dnd_contact inbound (STOP) + Added by WF-05 (MUT)",
            "filters": [
                "Inbound SMS STOP fires the dnd_contact trigger",
                "WF-05 MUT branch adds contacts here too",
            ],
            "target": "Trigger id gpdYb7c2Dkkt3tYJnClP. targetActionId points at the MUT front-gate IF-ELSE.",
        },
        "prerequisites": [
            "v2 tags v2_status_dnd, v2_email_bounced, v2_bad_number.",
            "contact.sms_consent_status is writable.",
            "MUT front-gate lives at the top so MUT contacts do not receive the STOP confirm or the opted_out write.",
        ],
        "messages": [
            {
                "step": "SMS STOP confirm (false branch only)",
                "channel": "SMS",
                "body": "Inline confirm that the contact is opted out. Not sent to MUT contacts (front-gate true branch).",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes on repeat STOP.",
            "stop_on_response": "n/a (this is the STOP handler).",
            "reentry_caveat": "MUT contacts hit WAIT 1s only. No DND, no opted_out, no STOP confirm.",
            "status": "Draft v4 on staging shell 9aab45f8-6f5b-467a-9f05-6981446c48f2. Unpublished.",
        },
        "test": [
            "Send inbound STOP and confirm DND flips, tags land, and STOP-confirm SMS fires.",
            "Route a MUT contact via WF-05 and confirm the front-gate suppresses the STOP path.",
        ],
        "depends_on": ["WF-05"],
    },
    "12": {
        "purpose": (
            "Single call-disposition graph. Keyed on channel, not clinic. "
            "Tags v2_source_phone. Never remove-and-recreate a contact or opp."
        ),
        "diagram_key": "wf12",
        "trigger": {
            "type": "Call Status changed (channel = phone)",
            "filters": ["Sole call-dispo entry; do not fork per clinic slug"],
            "target": "Native call-status trigger only.",
        },
        "prerequisites": ["v2 tag v2_source_phone exists on staging (HuqiCRyopgdHESALDnKN)."],
        "messages": [
            {
                "step": "Per-disposition SMS",
                "channel": "n/a",
                "body": "Per-disposition copy is not authored yet. The on-shell graph tags v2_source_phone only.",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes on each call.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "Native update-in-place. Never delete-and-recreate the contact.",
            "status": "Draft v2 on staging shell fa1c829c-5c6b-459a-81b9-19b737691a2c. Unpublished.",
        },
        "test": [
            "Change call status on a test contact and confirm the tag lands.",
            "Wrong-number branch routes into WF-11 Compliance.",
        ],
        "depends_on": ["WF-11"],
    },
    "13": {
        "purpose": (
            "Fire native Meta CAPI and Google Ads conversion events on Sales "
            "pipeline Booked and Won, sale_type=new only. Not the clinic pipes."
        ),
        "diagram_key": "support",
        "trigger": {
            "type": "Opportunity Stage changed on Sales Lead to Close",
            "filters": [
                "Pipeline is Sales Lead to Close (Vt8cPz51C3i87moo73gQ in prod; ASnpfhu1hpSHUv0IFLc7 in staging)",
                "Stage in (Booked, Won)",
                "sale_type = new",
                "Excludes clinic pipes jRqb0pvexu04zSACPXmd, 9AZEt2Sw6Zv0nnJJmkE0, rspsjkBMNYGldN3R71ji",
            ],
            "target": "Also enrolled via ADD-TO-WF from WF-05 when SOLD + sale_type=new.",
        },
        "prerequisites": [
            "v2 tag v2_conv_won_new exists on staging (fUVvRU2P4aQl1VKA7muT).",
            "Native Meta CAPI and Google Ads conversion actions are configured in the account (nodes are not authored yet on the shell).",
        ],
        "messages": [{"step": "n/a", "channel": "n/a", "body": "System workflow. No SMS or email."}],
        "settings": {
            "quiet_hours": QUIET_INTERNAL,
            "allow_reentry": "No. Fire once per opportunity.",
            "stop_on_response": "n/a.",
            "reentry_caveat": "Never fire on the clinic pipelines.",
            "status": "Draft v2 on staging shell 9513a9c7-69c5-4f1c-9193-b371ab8d8253. CAPI and Google Ads conversion nodes are not authored yet.",
        },
        "test": [
            "Move a Sales opp to Booked and to Won with sale_type=new. Confirm the tag lands and the (future) CAPI + Google conversion events fire once.",
            "Move a clinic-pipe opp and confirm nothing fires.",
        ],
        "depends_on": ["WF-05"],
    },
    "14": {
        "purpose": (
            "Ambassador referral. The referred contact is created as a new "
            "contact (never merged) and re-enters WF-01. Live tag ambassador-referral."
        ),
        "diagram_key": "support",
        "trigger": {
            "type": "Added by WF-06 at T+21 (also inbound ambassador form)",
            "filters": [
                "Enrolled from WF-06 T+21 or via Contact Created on the ambassador form",
            ],
            "target": "WF-06 hand-off primary; form-created contact for the referred contact path.",
        },
        "prerequisites": [
            "Live tag ambassador-referral exists in the account. Do not rename.",
            "Ambassador form is live.",
        ],
        "messages": [
            {
                "step": "Ambassador invite and referred welcome",
                "channel": "n/a",
                "body": "Full step bodies are not authored yet. The on-shell graph is a 1-step named shell.",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_MARKETING,
            "allow_reentry": "Yes. The referrer can invite multiple people; each referred contact is created fresh.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "Referred contact must never merge with the referrer.",
            "status": "Draft v2 on staging shell 6b090c34-cc66-43bf-8939-2868a6b8436b. Unpublished.",
        },
        "test": [
            "Invite via the ambassador form and confirm the referred contact enters WF-01 as a next-lander.",
            "Confirm the referrer opp is not touched.",
        ],
        "depends_on": ["WF-01", "WF-06"],
    },
    "15": {
        "purpose": (
            "PCC QR referral. utm_source=pcc_qr contacts get the live tag "
            "pcc-referral and re-enter WF-01 as new next-lander leads."
        ),
        "diagram_key": "support",
        "trigger": {
            "type": "Contact Created (utm_source = pcc_qr)",
            "filters": ["utm_source = pcc_qr"],
            "target": "Native Contact Created trigger with the utm_source filter.",
        },
        "prerequisites": ["Live tag pcc-referral. Do not rename."],
        "messages": [
            {
                "step": "PCC referral onboarding",
                "channel": "n/a",
                "body": "Full step bodies are not authored yet. The on-shell graph is a 1-step named shell.",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_INTERNAL,
            "allow_reentry": "No. One PCC-referral tag per contact.",
            "stop_on_response": "n/a.",
            "reentry_caveat": "Referred contact enters WF-01 for the create-once Sales opp.",
            "status": "Draft v2 on staging shell 158edd25-594d-4506-b021-c8acb7943969. Unpublished.",
        },
        "test": [
            "Create a contact with utm_source=pcc_qr and confirm the tag lands and WF-01 receives the contact.",
        ],
        "depends_on": ["WF-01"],
    },
    "16": {
        "purpose": (
            "Comms edge. Inbound IVR +18663444955 and the two chat widgets. "
            "No Sales opportunity is created here."
        ),
        "diagram_key": "support",
        "trigger": {
            "type": "Inbound Call / Chat",
            "filters": [
                "Phone number +18663444955 (IVR)",
                "Chat widget 69337243d355bdcd9c27675e",
                "Chat widget 6952a8536682120c2b2656b9",
            ],
            "target": "Native inbound trigger for the three channels.",
        },
        "prerequisites": [
            "v2 source tags v2_source_ivr and v2_source_chat will be added when copy lands.",
        ],
        "messages": [
            {
                "step": "IVR/chat acknowledgement",
                "channel": "n/a",
                "body": "Full step bodies are not authored yet. The on-shell graph is a 1-step named shell.",
            }
        ],
        "settings": {
            "quiet_hours": QUIET_TRANSACTIONAL,
            "allow_reentry": "Yes on each inbound.",
            "stop_on_response": "Yes.",
            "reentry_caveat": "Must not create a Sales opportunity here; new contacts route to WF-01.",
            "status": "Draft v2 on staging shell e68037b4-a8a2-427e-ba1c-8741ea615a3f. Unpublished.",
        },
        "test": [
            "Simulate an IVR call and a chat submission and confirm the tag lands and new contacts enter WF-01.",
        ],
        "depends_on": ["WF-01"],
    },
    "17": {
        "purpose": (
            "Internal price calculator for consult copy. Never writes "
            "opportunity.monetaryValue. Tags v2_price_calc when done."
        ),
        "diagram_key": "wf17",
        "trigger": {
            "type": "Contact Field changed on price-calc inputs",
            "filters": [
                "Fires when any of the price-calc component fields change",
                "Never fires customer-facing outreach directly",
            ],
            "target": "Native custom-field trigger.",
        },
        "prerequisites": [
            "Price-calc component fields exist; a math_operation node computes the total to contact.price_calc_result.",
            "Must not write opportunity.monetaryValue and must not move Sales stages.",
        ],
        "messages": [{"step": "n/a", "channel": "n/a", "body": "Internal-only calculator. No SMS or email."}],
        "settings": {
            "quiet_hours": QUIET_INTERNAL,
            "allow_reentry": "Yes on each input change.",
            "stop_on_response": "n/a.",
            "reentry_caveat": "Do not write opportunity.monetaryValue anywhere.",
            "status": "Draft v2 on staging shell e5fbb7f4-7fe6-4adf-8bf3-957c395a8495. Unpublished.",
        },
        "test": [
            "Change price-calc component fields on a test contact and confirm contact.price_calc_result is computed and v2_price_calc lands.",
            "Confirm opportunity.monetaryValue is untouched.",
        ],
        "depends_on": [],
    },
}


# Workflows dropped from the v2 spec but retained in tobe-detail.json for
# generator compatibility. These are hidden from the /to-be card grid and
# rendered as a "dropped from v2" page on /to-be/wf/<n>.
DROPPED_FROM_V2: set[str] = {"13"}


# ---- data.json tobe_workflows[].copy (2-3 sentence summary per WF) -----------

TOBE_COPY: dict[str, str] = {
    "01": (
        "First touch. Enrolls Contact Created + tag next-lander only; no source filter. "
        "Create-once opens a Sales opportunity on staging pipe ASnpfhu1hpSHUv0IFLc7, "
        "Method 2 stamps the four current_clinic_* fields for the correct slug "
        "(richmond, virginia-beach, newport-news), sends the welcome email (native template "
        "j7C8MVs6cAIuH5zPUjzH) and welcome SMS with Reply STOP, then hands to WF-02 "
        "after WAIT 24 hour. Transactional; no quiet hours. Draft v12 unpublished "
        "(restored from v10 on 2026-08-21 PT after a stub overwrite)."
    ),
    "02": (
        "Non-booked recovery. Enrolled only via ADD-TO-WF from WF-01. Burst is "
        "SMS +3m / +1m / +5m / +15m, EMAIL EML | WF-02 | Non-booked 24h "
        "(bPj39XTcKv2HylGKEUdG), SMS +36h, then ADD-TO-WF WF-09. Marketing / recovery: "
        "08:00-21:00 contact TZ, 7 days. Draft v9 unpublished (restored from v4 on "
        "2026-08-21 PT after a stub overwrite)."
    ),
    "03": (
        "Booking confirmation and reminders. Trigger is Appointment Booked on the three "
        "consult calendars (richmond 1Cfy5JnO2A4ggiZlMVvX, virginia-beach 4xmnBGMWJ6TVUKcAPpPb, "
        "newport-news lBaRbjUpEmesxEloFBME). Tags v2_status_booked, sends confirm email "
        "(GUs77konNdAGFS0EFZS2) + confirm SMS, T-3d email (QcpX2V3OarwL5jKN6OFE) + T-3d SMS, "
        "and appointment-relative reminders T-1d / T-5h / T-2h with appointmentCondition=skip. "
        "Transactional; no quiet hours. Draft v7 unpublished."
    ),
    "04": (
        "Medical intake chase after confirm. SMS at +4h (STOP) and +20h. Exits on survey "
        "submit. No dedicated intake URL field yet; both SMS use contact.current_booking_url "
        "as the manage / complete-intake link. Transactional; no quiet hours. Draft v3 unpublished."
    ),
    "05": (
        "Outcome router. Inbound webhook from Force (trigger ryJLJ1McWWOHlAvBRsI3; URL is "
        "UI-only, paste into Force GHL_WF05_WEBHOOK_URL). GHL shell name is null. Reads "
        "opportunity.sale_outcome_v2 and routes: SOLD + new -> WF-06 and still WF-13 "
        "(GHL router truth; site cards hide WF-13); SOLD renewal -> WF-09; AD -> WF-07; "
        "MUT -> WF-11; MAR drops. appt_status routes first: no-show / cancel -> WF-08, "
        "reschedule -> WF-03. Workflows never move Sales stages. Draft v5 unpublished."
    ),
    "06": (
        "Post-visit Won and onboarding for SOLD + sale_type=new only. Tags v2_status_active "
        "(P5yoBUi86hQs0Br5CIqI), sends welcome SMS after SOLD, then 3d / 7d / 14d / 21d waits "
        "forking to WF-10 at T+14 and WF-14 at T+21. Check-in copy between the waits is not "
        "authored yet. Transactional; no quiet hours. Draft v3 unpublished."
    ),
    "07": (
        "A&D nurture (sale_outcome_v2 = AD, Advise and Decline). Tags v2_outcome_ad, sends "
        "one first-touch SMS with STOP, waits 35d, then ADD-TO-WF WF-09. Objection branch "
        "copy is spec-only. AD never fires the Meta pixel or CAPI. Transactional; no quiet "
        "hours. Draft v3 unpublished."
    ),
    "08": (
        "No-show and cancel recovery. Reschedule never enters here. REMOVE-FROM-WF WF-03 -> "
        "IF appt_status = no-show -> v2_status_noshow (no-show) or v2_status_cancelled "
        "(cancel) -> SMS Rebook after miss (STOP) -> WAIT 7d -> SMS Rebook +7d -> "
        "ADD-TO-WF WF-09. Both statuses still share a single rebook cadence. Transactional; "
        "no quiet hours. Draft v4 unpublished."
    ),
    "09": (
        "Long-term nurture and the renewal sub-flow. renewal_date custom-field trigger is "
        "blocked until backfill is complete. On-shell graph is a single 120d wait; nurture "
        "and renewal bodies come next. Marketing / recovery: 08:00-21:00 contact TZ. "
        "Draft v2 unpublished."
    ),
    "10": (
        "Feedback survey at T+14 from WF-06 onboarding. SMS invite + EMAIL EML | WF-10 | "
        "Feedback invite (BFhyqVQXEYVasm4hJWvE) referencing contact.current_review_link, then "
        "WAIT 3d and an SMS nudge. Sole writer of contact.latest_feedback_score. Marketing: "
        "08:00-21:00 contact TZ. Draft v3 unpublished."
    ),
    "11": (
        "Compliance and errors. Trigger gpdYb7c2Dkkt3tYJnClP dnd_contact (STOP inbound). "
        "MUT front-gate at the top: MUT branch WAIT 1s and exit (no DND, no opted_out, no "
        "STOP confirm). STOP branch REMOVE-FROM-WF all, SET-DND, tag v2_status_dnd, set "
        "sms_consent_status=opted_out, and send an inline STOP-confirm SMS. Sole writer of "
        "DND and sms_consent_status. Transactional; no quiet hours. Draft v4 unpublished."
    ),
    "12": (
        "Call disposition handler. Single graph keyed on channel (not clinic). Tags "
        "v2_source_phone (HuqiCRyopgdHESALDnKN). Native update-in-place; never "
        "remove-and-recreate the contact or opp. Per-disposition copy is not authored yet. "
        "Draft v2 unpublished."
    ),
    # WF-13 (Ad-platform conversions / Native CAPI + Google) was dropped from
    # the v2 spec. The wf-13.json file is retained so the generator does not
    # break, but no card / summary is surfaced for it in the UI.
    "14": (
        "Ambassador program. Referred contact is created as a new contact (never merged) "
        "and re-enters WF-01. Live tag ambassador-referral. Enrolled at T+21 from WF-06 or "
        "via the ambassador form. Full step bodies are not authored yet; 1-step shell. "
        "Draft v2 unpublished."
    ),
    "15": (
        "PCC referral routing. Fires on Contact Created with utm_source=pcc_qr, adds live "
        "tag pcc-referral, and re-enters WF-01 as a next-lander. 1-step named shell. Draft "
        "v2 unpublished."
    ),
    "16": (
        "Comms edge for inbound IVR +18663444955 and the two chat widgets "
        "(69337243d355bdcd9c27675e, 6952a8536682120c2b2656b9). Never creates a Sales "
        "opportunity; new contacts route to WF-01. 1-step named shell. Draft v2 unpublished."
    ),
    "17": (
        "Internal price calculator for consult copy. Reads price-calc component fields, "
        "computes contact.price_calc_result via a math_operation node, and tags "
        "v2_price_calc. Never writes opportunity.monetaryValue and never moves stages. "
        "1-step named shell. Draft v2 unpublished."
    ),
}


# ---- Step generator ----------------------------------------------------------

TYPE_TO_ACTION = {
    "TRIGGER": "Trigger",
    "WAIT": "Wait",
    "SMS": "Send SMS",
    "EMAIL": "Send Email",
    "ADD-TAG": "Add Contact Tag",
    "REMOVE-TAG": "Remove Contact Tag",
    "SET-FIELD": "Update Contact Field",
    "SET-DND": "Update DND",
    "IF-ELSE": "If/Else",
    "CREATE-OPP": "Create Opportunity",
    "UPDATE-OPP": "Update Opportunity",
    "FIND-OPP": "Find Opportunity",
    "ADD-TO-WF": "Add To Workflow",
    "REMOVE-FROM-WF": "Remove From Workflow",
    "WEBHOOK": "Webhook",
}


def step_from_named(order: int, named: dict) -> dict:
    name = named["name"]
    prefix, _, rest = name.partition(":")
    action = TYPE_TO_ACTION.get(prefix.strip(), prefix.strip().title())
    return {
        "order": order,
        "action": action,
        "name": name,
        "config": named["comment"],
    }


def load_wf(n: str) -> dict:
    path = TOBE / f"wf-{n}.json"
    return json.loads(path.read_text())


def build_detail() -> dict:
    workflows: dict[str, dict] = {}
    for n, meta in WF_META.items():
        spec = load_wf(n)
        steps = [step_from_named(i + 1, s) for i, s in enumerate(spec["named_steps"])]
        entry = {
            "name": spec.get("name", f"WF-{n}"),
            "job": spec.get("job", ""),
            "purpose": meta["purpose"],
            "diagram_key": meta["diagram_key"],
            "trigger": meta["trigger"],
            "prerequisites": meta["prerequisites"],
            "steps": steps,
            "messages": meta["messages"],
            "settings": meta["settings"],
            "test": meta["test"],
            "depends_on": meta["depends_on"],
        }
        if n in DROPPED_FROM_V2:
            entry["dropped_from_v2"] = True
        if "variables" in meta:
            entry["variables"] = meta["variables"]
        workflows[n] = entry
    return {
        "_note": (
            "Locked v2 spec. Rebuilt by build_tobe_v2_detail.py from "
            "/workspace/to-be/wf-*.json. Do not hand-edit; re-run the script. "
            "Nothing in this file publishes or contacts GHL. Entries with "
            "dropped_from_v2=true are retained for generator compatibility but "
            "are hidden from the /to-be card grid."
        ),
        "workflows": workflows,
    }


def patch_data_json(path: Path) -> None:
    data = json.loads(path.read_text())
    by_n = {w["n"]: w for w in data.get("tobe_workflows", [])}
    for n, copy in TOBE_COPY.items():
        spec_name = load_wf(n).get("name", f"WF-{n}")
        if n not in by_n:
            by_n[n] = {"n": n, "name": spec_name, "copy": copy}
        else:
            by_n[n]["copy"] = copy
            # Refresh name from the source of truth (to-be/wf-NN.json).
            by_n[n]["name"] = spec_name
    # Drop workflows removed from the v2 spec (kept in tobe-detail.json for
    # generator compatibility, but never surfaced as a card).
    for n in DROPPED_FROM_V2:
        by_n.pop(n, None)
    data["tobe_workflows"] = [by_n[k] for k in sorted(by_n.keys())]
    path.write_text(json.dumps(data, indent=2) + "\n")


def sync_force_contract() -> None:
    """Copy to-be/force.json into plan-workspace/public/ so the Force page
    can fetch it at build/runtime. The Force writer contract is source of
    truth in to-be/force.json; the public copy is a mirror only.
    """
    src = TOBE / "force.json"
    if not src.exists():
        return
    dest = PW_PUBLIC / "force.json"
    dest.write_text(src.read_text())
    print(f"synced {dest.relative_to(REPO_ROOT)} from to-be/force.json")


def main() -> None:
    detail = build_detail()
    out_detail = PW_PUBLIC / "tobe-detail.json"
    out_detail.write_text(json.dumps(detail, indent=2) + "\n")
    print(f"wrote {out_detail.relative_to(REPO_ROOT)}")
    data_path = PW_PUBLIC / "data.json"
    patch_data_json(data_path)
    print(f"patched {data_path.relative_to(REPO_ROOT)} tobe_workflows[].copy")
    sync_force_contract()


if __name__ == "__main__":
    main()
