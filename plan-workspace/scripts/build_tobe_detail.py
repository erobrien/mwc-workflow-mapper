#!/usr/bin/env python3
"""Generate public/tobe-detail.json: SOP-grade build guides for all 16 to-be workflows.
Grounded strictly in data.json (copy/absorbs), wf-diagrams.json (src), and the enum contract.
Run from plan-workspace/: python scripts/build_tobe_detail.py
"""
import json, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(HERE, "public")

PIPELINE = 'Sales - Lead to Close (id Vt8cPz51C3i87moo73gQ)'
STAGES = "New Lead, Disqualified, Engaged, Booked, Confirmed, No-Show, Cancelled, Showed, A&D, MUT, Won"
FOLDER = '-Target Deployment folder'
QUIET = "Time Window 8:00 AM to 9:00 PM, Contact Timezone, all 7 days. Set under Workflow Settings, not per action."

# Each workflow: purpose, diagram_key, trigger, prerequisites[], build_steps[], messages[], settings{}, test[], depends_on[]
# build_steps: {order, action, name, config, branches?[]}
WF = {}

WF["01"] = {
  "purpose": "First touch. Capture every lead, stamp attribution onto the Opportunity at create, and run speed-to-lead outreach.",
  "diagram_key": "wf01",
  "trigger": {
    "type": "Form Submitted (and/or Inbound Webhook for paid funnels)",
    "filters": ["Form is any of the MWC lead-capture forms", "or Inbound Webhook from the funnel with gclid/fbclid/UTM in the payload"],
    "target": "The live MWC lead forms. BUILD DECISION NEEDED: confirm the exact form ids / webhook to listen on."
  },
  "prerequisites": [
    "Contact fields: gclid_value, fbclid_value, utm_source, utm_campaign, utm_medium, utm_content, utm_term, lead_source, lead_source_detail (Wave 0 creates these)",
    f"Opportunity pipeline {PIPELINE}, New Lead stage",
    "Opportunity attribution fields (utm_*, gclid, fbclid, lead_source) to receive the copy at create"
  ],
  "steps": [
    {"order": 1, "action": "Update Contact Field", "name": "Fields: Capture gclid/fbclid/UTM", "config": "Write inbound values to contact.gclid_value, contact.fbclid_value, contact.utm_source, utm_campaign, utm_medium, utm_content, utm_term. For webhook triggers reference the real {{inboundWebhookRequest.N}} indices (read them back from the saved trigger first)."},
    {"order": 2, "action": "Update Contact Field", "name": "Fields: Set lead source", "config": "Set contact.lead_source and contact.lead_source_detail. Confirm whether native contact.source is used instead (per as-is reference workflow)."},
    {"order": 3, "action": "Create/Update Opportunity", "name": "Opp: Create in New Lead", "config": f"Create Opportunity in {PIPELINE}, stage New Lead. Copy attribution onto the Opp at create: utm_source, utm_campaign, gclid, fbclid, lead_source. This is the single moment attribution lands on the Opp, so wins AND losses carry it."},
    {"order": 4, "action": "Send Email", "name": "Email: Welcome (instant)", "config": "Send immediately. Exempt from quiet hours (email, not SMS). Fires even at night."},
    {"order": 5, "action": "Send SMS", "name": "SMS: Speed-to-Lead (T+0, quiet-hours)", "config": "Send instantly if inside 8a-9p contact TZ; if outside, the quiet-hours window queues it to 8:00 AM contact TZ (TCPA-safe)."},
    {"order": 6, "action": "Wait", "name": "Wait: 2 minutes", "config": "Wait 2 minutes."},
    {"order": 7, "action": "Internal Notification", "name": "Notify: Staff new lead", "config": "Internal notification to the setter team with lead + attribution summary."},
    {"order": 8, "action": "Wait", "name": "Wait: 5 minutes from entry", "config": "Wait until 5 minutes after entry."},
    {"order": 9, "action": "Assign User / Manual Call", "name": "Call: Speed-to-Lead (T+5)", "config": "Create a call task / auto-call to the setter team."},
    {"order": 10, "action": "Wait", "name": "Wait: 24 hours", "config": "Wait 24 hours from entry to evaluate booking."},
    {"order": 11, "action": "If/Else", "name": "If: Appointment booked within 24h?", "config": "Branch on whether an appointment now exists for the contact.", "branches": [
      {"label": "Yes - booked", "condition": "Appointment exists", "path": "Exit to WF-03 Booking Confirmation and Reminders"},
      {"label": "No - not booked", "condition": "No appointment", "path": "Exit to WF-02 Non-Booked Recovery"}
    ]}
  ],
  "messages": [
    {"step": "Email: Welcome", "channel": "Email", "body": "Subject: Welcome to Men's Wellness Centers. Body: Thanks for reaching out, {{contact.first_name}}. A Men's Wellness Centers team member will call you within one business hour to schedule your no-cost 60-minute in-person consultation at your local clinic. BUILD DECISION NEEDED: paste final approved welcome copy."},
    {"step": "SMS: Speed-to-Lead", "channel": "SMS", "body": "Hi {{contact.first_name}}, this is Men's Wellness Centers. Thanks for reaching out. What is the best time today for a quick call to book your no-cost 60-minute in-person consultation? Reply STOP to opt out."}
  ],
  "settings": {
    "quiet_hours": QUIET,
    "allow_reentry": "No. A contact should run lead-capture once per lead. Re-entry would double-create opportunities.",
    "stop_on_response": "Optional on the SMS nurture portion; not on the create/attribution steps.",
    "reentry_caveat": "Fallback reconcile (form submissions vs opportunities every 15 min) catches any submission that did not create an Opportunity.",
    "status": "Draft. Do not publish without sign-off."
  },
  "test": [
    "Create a test contact via each lead form with fake gclid/UTM params in the URL.",
    "Verify the Opportunity is created in New Lead with attribution copied onto the Opp (not just the contact).",
    "Verify welcome email fires instantly and SMS respects quiet hours (submit a late-night test to confirm the SMS queues to 8 AM).",
    "Leave it unbooked 24h and confirm exit to WF-02; book within 24h and confirm exit to WF-03."
  ],
  "depends_on": [PIPELINE, "Contact + Opportunity attribution fields (Wave 0)", "WF-02 and WF-03 to receive exits"]
}

WF["02"] = {
  "purpose": "Recover leads that never booked: a 10-touch sequence over 16 days, exit instantly on booking.",
  "diagram_key": "wf02",
  "trigger": {"type": "Contact Tag or workflow hand-off from WF-01", "filters": ["Entered when WF-01 finds no booking 24h after the lead"], "target": "Hand-off from WF-01 (no separate GHL trigger needed if WF-01 adds to this workflow)."},
  "prerequisites": ["WF-01 built and handing off", "WF-09 built to receive the 16-day exit", "SMS consent + DND gate (WF-11)"],
  "steps": [
    {"order": 1, "action": "Manual Call", "name": "Call: Speed-to-Lead (T+5m)", "config": "Call task, 5 minutes from no-book entry."},
    {"order": 2, "action": "Wait", "name": "Wait: 2 hours", "config": "Then SMS 1."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Follow-Up 1 (T+2h)", "config": "Follow-up. Quiet hours apply."},
    {"order": 4, "action": "Wait", "name": "Wait: to +4h", "config": "Then Email 1."},
    {"order": 5, "action": "Send Email", "name": "Email: Health Education 1 (T+4h)", "config": "Educational email."},
    {"order": 6, "action": "Send SMS", "name": "SMS: Re-Engagement 2 (T+1d)", "config": "Appointment/consult-logistics framing, no symptom detail. Quiet hours apply."},
    {"order": 7, "action": "Send Email", "name": "Email: Physician-Led Process 2 (T+2d)", "config": "Physician-led process email."},
    {"order": 8, "action": "Manual Call", "name": "Call: Voicemail Drop (T+3d)", "config": "Ringless voicemail."},
    {"order": 9, "action": "Send SMS", "name": "SMS: Availability 3 (T+5d)", "config": "Availability nudge."},
    {"order": 10, "action": "Send Email", "name": "Email: Testimonial 3 (T+7d)", "config": "Return-to-self testimonial email (written, no before/after)."},
    {"order": 11, "action": "Send SMS", "name": "SMS: Re-Engagement 4 (T+10d)", "config": "Re-engagement."},
    {"order": 12, "action": "Send Email", "name": "Email: Urgency 4 (T+14d)", "config": "Urgency email."},
    {"order": 13, "action": "Send SMS", "name": "SMS: Empathetic Breakup 5 (T+16d)", "config": "Final message."},
    {"order": 14, "action": "Go To", "name": "Exit: to WF-09", "config": "After 16 days hand off to WF-09 Long-Term Nurture."}
  ],
  "messages": [
    {"step": "SMS: Follow-Up 1", "channel": "SMS", "body": "Hi {{contact.first_name}}, following up from Men's Wellness Centers. Ready to book your no-cost 60-minute in-person consultation? Reply with a day that works. Reply STOP to opt out."},
    {"step": "SMS: Empathetic Breakup 5", "channel": "SMS", "body": "{{contact.first_name}}, we will step back for now. When you are ready to book your consultation at Men's Wellness Centers, we are here. Reply STOP to opt out."}
  ],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "No while active; the sequence is one pass per lead.", "stop_on_response": "Yes - a reply should pause automated sends for setter handling.", "reentry_caveat": "Booking at any point triggers the early exit below.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Enter a test contact from WF-01 with no booking.", "Verify each touch fires on schedule and inside quiet hours.", "Book mid-sequence and confirm immediate exit to WF-03.", "Let it run 16 days and confirm hand-off to WF-09."],
  "depends_on": ["WF-01 (entry)", "WF-03 (early exit on booking)", "WF-09 (16-day exit)", "WF-11 consent gate"]
}

WF["03"] = {
  "purpose": "Confirm the booking and run all pre-appointment reminders on the new class calendars.",
  "diagram_key": "preappt",
  "trigger": {"type": "Appointment (Customer booked appointment) on the class calendars", "filters": ["Calendar is one of the 3 per-clinic class calendars"], "target": "BUILD DECISION NEEDED: the 3 new per-clinic class calendar ids (Richmond, Virginia Beach, Newport News), created in Wave 0. 60-min slots, 60-min interval, 6 seats per slot, 'Show seats per slot' OFF (Decision 12)."},
  "prerequisites": ["3 class calendars created (Decision 12)", "Intake form", "WF-08 built for cancel routing", "WF-05 fires on appointment day"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Booking Confirmation (T+0)", "config": "Instant on booking."},
    {"order": 2, "action": "Send Email", "name": "Email: Booking Confirmation (T+0)", "config": "Instant on booking."},
    {"order": 3, "action": "Internal Notification", "name": "Notify: Staff booking", "config": "Instant staff notification."},
    {"order": 4, "action": "Wait", "name": "Wait: 1 hour", "config": "Then intake reminder."},
    {"order": 5, "action": "Send SMS", "name": "SMS: Intake Reminder (T+1h)", "config": "Prompt to complete intake."},
    {"order": 6, "action": "If/Else", "name": "If: Intake completed?", "config": "Branch on intake form completion.", "branches": [
      {"label": "Yes", "condition": "Intake complete", "path": "Skip chase, go to Reminders block"},
      {"label": "No", "condition": "Intake not complete", "path": "Run intake chase (WF-04 owns chasing; see WF-04)"}
    ]},
    {"order": 7, "action": "Send Email", "name": "Email: 3-Day Prep (T-3d)", "config": "3 days before appointment. Use appointment-relative wait with 'if date already passed' fallback."},
    {"order": 8, "action": "Send SMS", "name": "SMS: 1-Day Reminder (T-1d)", "config": "1 day before appointment."},
    {"order": 9, "action": "Send Email", "name": "Email: 1-Day Prep (T-1d)", "config": "1 day before appointment."},
    {"order": 10, "action": "Send SMS", "name": "SMS: Morning-Of (8 AM)", "config": "8 AM on the day of the appointment."},
    {"order": 11, "action": "Send SMS", "name": "SMS: 2-Hour Intake Prompt (T-2h)", "config": "2 hours before appointment."},
    {"order": 12, "action": "Go To", "name": "Exit: appointment day", "config": "On appointment day WF-05 fires from the PCC Sales Form. A cancellation at any point halts reminders and routes to WF-08."}
  ],
  "messages": [
    {"step": "SMS: Booking Confirmation", "channel": "SMS", "body": "You are booked, {{contact.first_name}}. Your 60-minute in-person consultation at Men's Wellness Centers is {{appointment.start_time}}. Reply STOP to opt out."},
    {"step": "SMS: Morning-Of", "channel": "SMS", "body": "Good morning {{contact.first_name}}. We look forward to seeing you today at {{appointment.start_time}} for your 60-minute in-person consultation at Men's Wellness Centers."}
  ],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "One run per appointment. Note the appointment/status re-entry caveat: appointment-triggered workflows re-enter once per appointment regardless of the toggle.", "stop_on_response": "Reminders can pause on reply for staff handling.", "reentry_caveat": "Appointment-relative waits must use the 'if date already passed' fallback so a same-day booking does not skip all reminders unexpectedly.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Book a test appointment on each class calendar.", "Confirm instant confirmation SMS + email + staff notification.", "Verify T-3d/T-1d/morning/T-2h reminders fire relative to the appointment.", "Cancel a test appointment and confirm reminders halt and it routes to WF-08."],
  "depends_on": ["3 class calendars (Decision 12)", "Intake form", "WF-04 (intake chase)", "WF-05 (appointment day)", "WF-08 (cancel routing)"]
}

WF["04"] = {
  "purpose": "Own all medical intake chasing for booked members who have not completed intake.",
  "diagram_key": "preappt",
  "trigger": {"type": "Runs inside the WF-03 pre-appointment sequence (intake-not-complete branch)", "filters": ["Intake form not completed after the T+1h reminder"], "target": "Hand-off from WF-03's intake gate."},
  "prerequisites": ["WF-03 built", "Intake form", "SMS consent + DND gate (WF-11)"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Intake Chase 1 (T+4h)", "config": "First chase."},
    {"order": 2, "action": "Send Email", "name": "Email: Confirmation Chase (T+12h)", "config": "Chase email."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Urgency Chase 2 (T+24h)", "config": "Urgency chase."},
    {"order": 4, "action": "Manual Call", "name": "Call: Voicemail Drop (T+36h)", "config": "Voicemail if still incomplete."},
    {"order": 5, "action": "Go To", "name": "Exit: to reminders", "config": "Return to the WF-03 reminder block. Standalone 'Intake Reminder' workflow is retired at cutover (Decision 9)."}
  ],
  "messages": [{"step": "SMS: Intake Chase 1", "channel": "SMS", "body": "{{contact.first_name}}, to make the most of your 60-minute in-person consultation at Men's Wellness Centers, please complete your intake form here: {{custom_values.intake_link}}. Reply STOP to opt out."}],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "One pass per appointment.", "stop_on_response": "Pause on completion (intake done exits the chase).", "reentry_caveat": "Exits as soon as intake is completed.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Book a test appointment and leave intake incomplete.", "Confirm chase cadence fires.", "Complete intake mid-chase and confirm exit."],
  "depends_on": ["WF-03", "Intake form", "WF-11 consent gate"]
}

WF["05"] = {
  "purpose": "THE KEYSTONE. Route on the outcome the PCC Sales Form wrote. WF-05 never writes outcomes.",
  "diagram_key": "wf05",
  "trigger": {"type": "Opportunity or Contact update from the PCC Sales Form submission", "filters": ["Fires when the PCC Sales Form is submitted (it is the sole writer of sale_outcome, sale_type, appt_status, value)"], "target": "The PCC Sales Form / the Opportunity record the PCC edits."},
  "prerequisites": ["PCC Sales Form live and writing sale_outcome (sold|ad|mut|mar), sale_type (new|renewal), appt_status (showed|no-show|cancel|reschedule), value, term_1", "Opportunity fields renewal_date, outcome_processed_at", f"{PIPELINE} with Won / A&D / MUT stages", "WF-06, WF-07, WF-08, WF-09, WF-13 built to receive exits"],
  "steps": [
    {"order": 1, "action": "If/Else", "name": "If: appt_status gate", "config": "Read opportunity.appt_status FIRST.", "branches": [
      {"label": "no-show or cancel", "condition": "appt_status = no-show OR appt_status = cancel", "path": "Exit to WF-08 No-Show and Cancel Recovery"},
      {"label": "reschedule", "condition": "appt_status = reschedule", "path": "Exit to WF-03 Booking Confirmation and Reminders"},
      {"label": "showed", "condition": "appt_status = showed", "path": "Continue to idempotency check"}
    ]},
    {"order": 2, "action": "If/Else", "name": "If: outcome_processed_at set?", "config": "Idempotency guard.", "branches": [
      {"label": "Yes", "condition": "opportunity.outcome_processed_at is not empty", "path": "Update fields only. No re-route, no CAPI. End."},
      {"label": "No", "condition": "outcome_processed_at empty", "path": "Continue to outcome router"}
    ]},
    {"order": 3, "action": "If/Else", "name": "If: sale_outcome router", "config": "Read opportunity.sale_outcome (written by the form).", "branches": [
      {"label": "sold", "condition": "sale_outcome = sold", "path": "Sold branch (step 4)"},
      {"label": "ad", "condition": "sale_outcome = ad (A&D, Advise and Decline)", "path": "Move Opp to Lost, ad_reason already on Opp, stamp outcome_processed_at, tag ad + outcome_ad, exit to WF-07"},
      {"label": "mut", "condition": "sale_outcome = mut", "path": "Move Opp to Lost - MUT, stamp outcome_processed_at, tag mut + outcome_mut, suppress future automation via WF-11"},
      {"label": "mar", "condition": "sale_outcome = mar", "path": "Keep Opp Open, open a PCC/provider task, tag outcome_mar. On approval the form is resubmitted with a final outcome and WF-05 re-runs."}
    ]},
    {"order": 4, "action": "Create/Update Opportunity", "name": "Opp: Set Won", "config": "Sold branch: Move Opp to Won. monetary_value = net collected. Require sale_type (new|renewal) from the form. Set renewal_date = Won date + term_1. Stamp outcome_processed_at. Tag sold + outcome_sold."},
    {"order": 5, "action": "Wait", "name": "Wait: 60 seconds", "config": "Let value commit before the ad conversion reads it (read-after-write race)."},
    {"order": 6, "action": "Webhook", "name": "Webhook: Signal WF-13 once", "config": "Signal WF-13 Ad Conversions once (Booked + Won) to Google and Meta. Guarded by outcome_processed_at so it fires once per opportunity."},
    {"order": 7, "action": "If/Else", "name": "If: sale_type branch", "config": "Branch on sale_type.", "branches": [
      {"label": "new", "condition": "sale_type = new", "path": "Exit to WF-06 Post-Visit Won and Onboarding"},
      {"label": "renewal", "condition": "sale_type = renewal", "path": "Exit to WF-09 Renewal Reminders sub-flow"}
    ]}
  ],
  "messages": [{"step": "n/a", "channel": "n/a", "body": "WF-05 sends no member messages. It only routes. A 'no form by end of appointment day' chaser nags the PCC internally and writes no outcome."}],
  "settings": {"quiet_hours": "Not a messaging workflow.", "allow_reentry": "Yes - must re-run on form resubmission (MAR approval path), but the outcome_processed_at stamp prevents duplicate routing/CAPI.", "stop_on_response": "n/a", "reentry_caveat": "An edit or duplicate submit updates fields but never re-fires routing or the ad conversion (idempotency).", "status": "Draft. Do not publish without sign-off. This is the P0 fix: remove auto-Won (Decision 10)."},
  "test": ["Submit the PCC form as showed+sold+new: confirm Won, renewal_date set, tag sold, CAPI fires once, exit to WF-06.", "Submit as no-show: confirm routes to WF-08, no outcome written.", "Resubmit the same sold form: confirm fields update but no second CAPI (outcome_processed_at held).", "Submit as mar: confirm Opp stays Open and a PCC task opens."],
  "depends_on": ["PCC Sales Form (sole writer)", "WF-13 (CAPI)", "WF-06/07/08/09 (exits)", "Opportunity fields renewal_date + outcome_processed_at"]
}

WF["06"] = {
  "purpose": "New-patient post-visit onboarding, NPS survey, conditional review request, negative-NPS alert.",
  "diagram_key": "wf06",
  "trigger": {"type": "Opportunity Status Changed to Won (from WF-05 sold + new path)", "filters": ["Opportunity Won", "sale_type = new", "renewal_date already set by WF-05"], "target": f"{PIPELINE} Won stage."},
  "prerequisites": ["WF-05 built", "WF-10 feedback survey", "opportunity.visit_feedback_score field", "WF-12 for negative-NPS alert", "WF-14 + WF-09 exits"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Welcome (T+1h)", "config": "Welcome the new member."},
    {"order": 2, "action": "Send Email", "name": "Email: Welcome and Onboarding (T+1h)", "config": "Onboarding email."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Check-In (T+3d)", "config": "Day-3 check-in."},
    {"order": 4, "action": "Send Email", "name": "Email: Week 1 Progress (T+7d)", "config": "Week-1 progress."},
    {"order": 5, "action": "Go To", "name": "Trigger: WF-10 Survey (T+14d)", "config": "Trigger WF-10 Feedback Survey at 14 days."},
    {"order": 6, "action": "If/Else", "name": "If: NPS branch", "config": "Read opportunity.visit_feedback_score (written by WF-10).", "branches": [
      {"label": "8 or above", "condition": "visit_feedback_score >= 8", "path": "Google review request (step 7)"},
      {"label": "Below 7", "condition": "visit_feedback_score < 7", "path": "Internal negative-NPS alert, WF-12 notified, PCC follows up manually"}
    ]},
    {"order": 7, "action": "Send SMS", "name": "SMS: Google Review Request (T+14d, conditional)", "config": "Only on NPS 8+."},
    {"order": 8, "action": "Send SMS", "name": "SMS: Referral Activation (T+21d)", "config": "Then exit to WF-14 Ambassador Program and WF-09 Renewal Reminders sub-flow."}
  ],
  "messages": [{"step": "SMS: Google Review Request", "channel": "SMS", "body": "{{contact.first_name}}, it means a lot to hear your visit went well. Would you share a quick review of Men's Wellness Centers? {{custom_values.review_link}} Reply STOP to opt out."}],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "One onboarding pass per Won opportunity.", "stop_on_response": "Yes.", "reentry_caveat": "New path only; renewals route to WF-09 instead. WF-05 owns renewal_date, WF-06 does not set it.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Win a test opportunity (new): confirm onboarding cadence.", "Set visit_feedback_score >= 8: confirm review request fires.", "Set score < 7: confirm negative-NPS internal alert and no review request."],
  "depends_on": ["WF-05", "WF-10", "WF-12", "WF-14", "WF-09", "opportunity.visit_feedback_score"]
}

WF["07"] = {
  "purpose": "A&D (Advise and Decline) objection-handling nurture, 11 touches over 35 days.",
  "diagram_key": "wf07-08",
  "trigger": {"type": "Hand-off from WF-05 (sale_outcome = ad)", "filters": ["Opportunity moved to Lost with ad_reason set"], "target": "WF-05 ad branch."},
  "prerequisites": ["WF-05 built", "ad_reason field on Opportunity", "WF-09 exit", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: No-Pressure 1 (T+2h)", "config": "Open with no pressure."},
    {"order": 2, "action": "Send Email", "name": "Email: Objection Handling (T+1d)", "config": "Targets the declared ad_reason."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Labs on File 2 (T+3d)", "config": "Labs on file."},
    {"order": 4, "action": "Send Email", "name": "Email: Testimonial (T+7d)", "config": "Written testimonial."},
    {"order": 5, "action": "Send SMS", "name": "SMS: Encouragement 3 (T+14d)", "config": "Encouragement."},
    {"order": 6, "action": "Send Email", "name": "Email: Labs Expiring (T+21d)", "config": "Labs expiring."},
    {"order": 7, "action": "Send SMS", "name": "SMS: Final Reminder 4 (T+30d)", "config": "Final reminder."},
    {"order": 8, "action": "Send SMS", "name": "SMS: Empathetic Breakup 5 (T+35d)", "config": "Then exit to WF-09."}
  ],
  "messages": [{"step": "SMS: No-Pressure 1", "channel": "SMS", "body": "{{contact.first_name}}, no pressure at all. If any questions came up after your consultation at Men's Wellness Centers, I am here to help. Reply STOP to opt out."}],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "One pass per A&D outcome.", "stop_on_response": "Yes.", "reentry_caveat": "ad_reason drives the objection targeting; it is already on the Opp from the form.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Set a test opportunity to sale_outcome=ad via the form.", "Confirm the 11-touch cadence over 35 days and exit to WF-09."],
  "depends_on": ["WF-05", "ad_reason field", "WF-09", "WF-11"]
}

WF["08"] = {
  "purpose": "No-show and cancel recovery, 8 touches over 7 days, exit instantly on rebook.",
  "diagram_key": "wf07-08",
  "trigger": {"type": "Hand-off from WF-05 (no-show/cancel) or WF-03 (cancellation)", "filters": ["appt_status = no-show OR cancel", "or WF-03 cancellation"], "target": "WF-05 appt_status branch / WF-03 cancel route."},
  "prerequisites": ["WF-05 and WF-03 built", "WF-03 to receive rebook exit", "WF-09 exit", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Recovery 1 (T+15m)", "config": "Fast recovery."},
    {"order": 2, "action": "Send Email", "name": "Email: Physician Recovery (T+1h)", "config": "Physician-led recovery."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Availability 2 (T+1d)", "config": "Availability."},
    {"order": 4, "action": "Send Email", "name": "Email: Benefits Pivot (T+3d)", "config": "Benefits pivot."},
    {"order": 5, "action": "Send SMS", "name": "SMS: Re-Engagement 3 (T+3d)", "config": "Re-engagement."},
    {"order": 6, "action": "Send SMS", "name": "SMS: Scarcity 4 (T+5d)", "config": "Scarcity."},
    {"order": 7, "action": "Manual Call", "name": "Call: Voicemail Drop (T+7d)", "config": "Voicemail."},
    {"order": 8, "action": "Send SMS", "name": "SMS: Empathetic Breakup 5 (T+7d)", "config": "Final."},
    {"order": 9, "action": "If/Else", "name": "If: Re-booked?", "config": "Early-exit check present at every step.", "branches": [
      {"label": "Yes - re-booked", "condition": "New appointment exists", "path": "Immediate exit to WF-03"},
      {"label": "No", "condition": "No re-booking after 7 days", "path": "Exit to WF-09"}
    ]}
  ],
  "messages": [{"step": "SMS: Recovery 1", "channel": "SMS", "body": "{{contact.first_name}}, we missed you today at Men's Wellness Centers. Let us get you rescheduled for your 60-minute in-person consultation. What day works? Reply STOP to opt out."}],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "One pass per no-show/cancel.", "stop_on_response": "Yes.", "reentry_caveat": "Rebook early-exit must be checked at every step (goal/condition), not just at the end.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Flag a test contact no-show via the form.", "Confirm the 8-touch cadence.", "Re-book mid-sequence and confirm immediate exit to WF-03.", "No rebook after 7 days confirms exit to WF-09."],
  "depends_on": ["WF-05", "WF-03", "WF-09", "WF-11"]
}

WF["09"] = {
  "purpose": "Long-term nurture (7 touches / 120 days) plus a Renewal Reminders sub-flow for won members.",
  "diagram_key": "retention",
  "trigger": {"type": "Hand-off from WF-02/07/08 (main) and WF-05/06 renewal path (sub-flow)", "filters": ["Main: A&D, no-show, or lapsed", "Renewal sub-flow: won member approaching opportunity.renewal_date"], "target": "opportunity.renewal_date drives the renewal sub-flow timing."},
  "prerequisites": ["opportunity.renewal_date set by WF-05", "WF-02/07/08 hand-offs", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Send Email", "name": "Email: Energy as Medical Issue (T+30d)", "config": "Main nurture."},
    {"order": 2, "action": "Send SMS", "name": "SMS: CTA (T+45d)", "config": "CTA."},
    {"order": 3, "action": "Send Email", "name": "Email: Sleep and Performance (T+60d)", "config": "Education."},
    {"order": 4, "action": "Send SMS", "name": "SMS: Seasonal Scarcity (T+75d)", "config": "Seasonal."},
    {"order": 5, "action": "Send Email", "name": "Email: Medical Authority (T+90d)", "config": "Authority."},
    {"order": 6, "action": "Send SMS", "name": "SMS: Return to Self (T+105d)", "config": "Re-engage."},
    {"order": 7, "action": "Send Email", "name": "Email: Re-Engage Breakup (T+120d)", "config": "Final main-nurture touch."},
    {"order": 8, "action": "If/Else", "name": "Sub-flow: Renewal Reminders", "config": "For won members: Email 30-day notice, SMS 21-day, Email 14-day, SMS 7-day, SMS expiry-day before renewal_date. If not renewed, Email lapsed (+3d), SMS final (+7d), churn-risk internal alert, then exit to main nurture.", "branches": [
      {"label": "Renewed", "condition": "New renewal opportunity opened", "path": "Retention pipeline - renewed"},
      {"label": "Not renewed", "condition": "No renewal by expiry", "path": "Lapsed sequence then back to Long-Term Nurture"}
    ]}
  ],
  "messages": [{"step": "SMS: 7-Day Urgency (renewal)", "channel": "SMS", "body": "{{contact.first_name}}, your Men's Wellness Centers program renews in 7 days. Reply here to confirm and we will take care of the rest. Reply STOP to opt out."}],
  "settings": {"quiet_hours": QUIET, "allow_reentry": "Contacts can re-enter long-term nurture across lifecycle stages.", "stop_on_response": "Yes.", "reentry_caveat": "Renewal sub-flow keys off opportunity.renewal_date; ensure it is set (WF-05) before a won member reaches it.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Enter a test contact from WF-08.", "Confirm 120-day cadence.", "For a won member, set renewal_date near-term and confirm the renewal reminder ladder fires."],
  "depends_on": ["WF-05 (renewal_date)", "WF-02/07/08 hand-offs", "WF-11"]
}

WF["10"] = {
  "purpose": "Feedback survey. Writes opportunity.visit_feedback_score that drives the WF-06 NPS branch.",
  "diagram_key": "retention",
  "trigger": {"type": "Triggered by WF-06 at T+14d (survey send) and Survey Submitted (writes score)", "filters": ["Survey submission event"], "target": "The feedback survey / form."},
  "prerequisites": ["opportunity.visit_feedback_score field", "WF-06 built", "survey form", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Survey Invite", "config": "Invite to the survey (keep good as-is bodies)."},
    {"order": 2, "action": "Update Contact Field", "name": "Opp: Write visit_feedback_score", "config": "On submission write opportunity.visit_feedback_score for the WF-06 NPS branch."}
  ],
  "messages": [{"step": "SMS: Survey Invite", "channel": "SMS", "body": "{{contact.first_name}}, how was your visit to Men's Wellness Centers? One quick tap: {{custom_values.survey_link}} Reply STOP to opt out."}],
  "settings": {"quiet_hours": "8a-9p contact TZ, all sends filter on sms_consent_status + native DND (WF-11 gate).", "allow_reentry": "One survey per visit.", "stop_on_response": "Yes.", "reentry_caveat": "Score must be written to the Opportunity, not the Contact, so WF-06 can read it.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Trigger from WF-06.", "Submit the survey and confirm visit_feedback_score lands on the Opportunity.", "Confirm WF-06 branches correctly on the written score."],
  "depends_on": ["WF-06", "survey form", "opportunity.visit_feedback_score", "WF-11"]
}

WF["11"] = {
  "purpose": "The single DND and consent authority. Every send checks it. Also handles bounces and MUT suppression.",
  "diagram_key": "support",
  "trigger": {"type": "Consulted by every messaging workflow; plus event triggers for DNC, Email Bounce, MUT", "filters": ["sms_consent_status = opted_in AND not DND AND inside 8a-9p contact TZ"], "target": "canonical sms_consent_status field + native DND."},
  "prerequisites": ["sms_consent_status field (canonical)", "native DND", "audit trail / Google Sheet for bounces"],
  "steps": [
    {"order": 1, "action": "If/Else", "name": "If: Send gate", "config": "For every SMS/voicemail send: allow only if sms_consent_status = opted_in AND not DND AND inside 8a-9p contact TZ; otherwise hold.", "branches": [
      {"label": "Pass", "condition": "consent + not DND + in window", "path": "Allow send"},
      {"label": "Hold", "condition": "any check fails", "path": "Do not send"}
    ]},
    {"order": 2, "action": "Update Contact Field", "name": "DNC: Set DND + halt", "config": "On DNC flag: set DND on the contact and halt all automation."},
    {"order": 3, "action": "Update Contact Field", "name": "Bounce: Remove from email", "config": "On email bounce: remove from email sends and log to the audit trail."},
    {"order": 4, "action": "Update Contact Field", "name": "MUT: Suppress automation", "config": "On MUT outcome: suppress all future automation for the contact."}
  ],
  "messages": [{"step": "n/a", "channel": "n/a", "body": "WF-11 sends nothing. It gates and suppresses. Assume-consent for the 11,077 total historical contacts is an accepted risk (Decision 8)."}],
  "settings": {"quiet_hours": "This workflow enforces quiet hours for all others.", "allow_reentry": "n/a (gate).", "stop_on_response": "n/a", "reentry_caveat": "Every other messaging workflow must filter on this gate rather than re-implementing consent logic.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Set a test contact to DND and confirm no sends go out.", "Flag a bounce and confirm email removal + audit log.", "Set MUT and confirm all automation suppresses."],
  "depends_on": ["sms_consent_status field", "native DND", "audit trail"]
}

WF["12"] = {
  "purpose": "Handle call dispositions; write opportunity.call_disposition; route negative-NPS follow-ups. Never writes sale fields.",
  "diagram_key": "wf12",
  "trigger": {"type": "Call ends on softphone / disposition workflow fires", "filters": ["Inbound/outbound call disposition event"], "target": "softphone integration / disposition tags."},
  "prerequisites": ["opportunity.call_disposition field", "patient_care_consultant_id (written only by the PCC Sales Form)", "WF-06 negative-NPS flag"],
  "steps": [
    {"order": 1, "action": "If/Else", "name": "If: Call disposition", "config": "Branch on the disposition.", "branches": [
      {"label": "Connected", "condition": "disposition = connected", "path": "Write call_disposition = connected, read patient_care_consultant_id"},
      {"label": "No answer", "condition": "disposition = no_answer", "path": "Write call_disposition = no_answer"},
      {"label": "Voicemail", "condition": "disposition = voicemail", "path": "Write call_disposition = voicemail"},
      {"label": "Bad number", "condition": "disposition = bad_number", "path": "Write call_disposition = bad_number, flag for data cleanup"}
    ]},
    {"order": 2, "action": "If/Else", "name": "If: Negative-NPS follow-up?", "config": "Flagged by WF-06?", "branches": [
      {"label": "Yes", "condition": "negative-NPS flagged", "path": "Assign task to owning PCC for a manual follow-up call"},
      {"label": "No", "condition": "not flagged", "path": "Disposition recorded, end"}
    ]}
  ],
  "messages": [{"step": "n/a", "channel": "n/a", "body": "WF-12 never writes sale_outcome, sale_type, or value. That is the PCC Sales Form only (H5 single-writer guardrail). It only reads patient_care_consultant_id."}],
  "settings": {"quiet_hours": "n/a (internal).", "allow_reentry": "Yes, once per call.", "stop_on_response": "n/a", "reentry_caveat": "Reads but never writes the PCC id; do not let it write sale fields.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Fire each disposition and confirm call_disposition writes correctly.", "Flag a negative-NPS from WF-06 and confirm a PCC task is created.", "Confirm no sale fields are ever written by this workflow."],
  "depends_on": ["opportunity.call_disposition", "patient_care_consultant_id (form-owned)", "WF-06"]
}

WF["13"] = {
  "purpose": "Fire Booked and Won conversions to Google and Meta. Exclude A&D. Do not key off ad_* fields.",
  "diagram_key": "support",
  "trigger": {"type": "Opportunity Booked event and Opportunity Won event (signaled by WF-05)", "filters": ["Booked", "Won", "EXCLUDE sale_outcome = ad"], "target": "Google Ads + Meta CAPI endpoints."},
  "prerequisites": ["CAPI/Google Ads conversion endpoints configured", "WF-05 signals Won once", "WF-13 fires once per opportunity"],
  "steps": [
    {"order": 1, "action": "Webhook", "name": "Webhook: Booked Conversion", "config": "On Appointment Booked, fire the Booked conversion to Google Ads and Meta CAPI."},
    {"order": 2, "action": "Webhook", "name": "Webhook: Won Conversion", "config": "On Opportunity Won, fire the Won conversion. Signaled once by WF-05, guarded by outcome_processed_at."}
  ],
  "messages": [{"step": "n/a", "channel": "n/a", "body": "GUARDRAIL: sale_outcome's AD value and the ad_reason field are named for 'Advise and Decline', NOT advertising. Do not key conversion logic off ad_* fields or tags, or lost consultations will be reported as fake conversions to Meta and Google."}],
  "settings": {"quiet_hours": "n/a", "allow_reentry": "Once per opportunity per event.", "stop_on_response": "n/a", "reentry_caveat": "Fire once per opportunity; the WF-05 idempotency stamp prevents duplicate Won conversions.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Book a test opportunity and confirm one Booked conversion.", "Win it and confirm one Won conversion.", "Set A&D and confirm NO conversion fires.", "Resubmit the form and confirm no duplicate Won conversion."],
  "depends_on": ["WF-05 (signal)", "CAPI endpoints", "outcome_processed_at guard"]
}

WF["14"] = {
  "purpose": "Post-sale ambassador activation: invitation, welcome, reward confirmation. Referrals go through WF-15.",
  "diagram_key": "support",
  "trigger": {"type": "Hand-off from WF-06 (referral activation step)", "filters": ["Won new member reaching the referral activation step"], "target": "WF-06 exit."},
  "prerequisites": ["WF-06 built", "WF-15 for referral routing", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Send SMS", "name": "SMS: Ambassador Invitation", "config": "Invite the member."},
    {"order": 2, "action": "Send Email", "name": "Email: Program Welcome", "config": "Program welcome."},
    {"order": 3, "action": "Send SMS", "name": "SMS: Reward Confirmation", "config": "Confirm reward. Referred contacts are always created NEW and routed through WF-15."}
  ],
  "messages": [{"step": "SMS: Ambassador Invitation", "channel": "SMS", "body": "{{contact.first_name}}, know a man who could use his edge back? Refer him to Men's Wellness Centers and we will take care of you both. {{custom_values.referral_link}} Reply STOP to opt out."}],
  "settings": {"quiet_hours": "8a-9p contact TZ, filters on sms_consent_status + native DND (WF-11 gate).", "allow_reentry": "One activation per won member.", "stop_on_response": "Yes.", "reentry_caveat": "Referred contacts must be created as NEW contacts, never merged, and routed to WF-15.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Reach the referral step from WF-06.", "Confirm invitation, welcome, reward cadence.", "Submit a referral and confirm it creates a NEW contact into WF-15."],
  "depends_on": ["WF-06", "WF-15", "WF-11"]
}

WF["15"] = {
  "purpose": "Route PCC-submitted referrals into the tracking-only Referrals pipeline; referred contact goes back to WF-01.",
  "diagram_key": "support",
  "trigger": {"type": "Referral form / PCC referral submission", "filters": ["PCC-submitted referral"], "target": "Referrals pipeline, Submitted stage."},
  "prerequisites": ["Referrals pipeline (tracking-only, no monetary value)", "WF-01 to receive the referred contact", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Create/Update Opportunity", "name": "Opp: Referrals Submitted", "config": "Create a tracking opportunity in the Referrals pipeline, Submitted stage. NO monetary value (revenue lives on the Sales opportunity)."},
    {"order": 2, "action": "Send SMS", "name": "SMS: Referred-Lead Welcome", "config": "Welcome the referred lead."},
    {"order": 3, "action": "Send Email", "name": "Email: Referred-Lead Welcome", "config": "Welcome email."},
    {"order": 4, "action": "Internal Notification", "name": "Notify: Routing alert", "config": "Internal routing alert."},
    {"order": 5, "action": "Go To", "name": "Route: to WF-01", "config": "The referred contact is created NEW and routed back to WF-01; its Sales opportunity carries all revenue."}
  ],
  "messages": [{"step": "SMS: Referred-Lead Welcome", "channel": "SMS", "body": "Hi {{contact.first_name}}, you were referred to Men's Wellness Centers. We would love to book your no-cost 60-minute in-person consultation. What day works? Reply STOP to opt out."}],
  "settings": {"quiet_hours": "8a-9p contact TZ, filters on sms_consent_status + native DND (WF-11 gate).", "allow_reentry": "One per referral.", "stop_on_response": "Yes.", "reentry_caveat": "Referrals pipeline is tracking-only; never attach revenue to it.", "status": "Draft. Do not publish without sign-off."},
  "test": ["Submit a PCC referral.", "Confirm a tracking opportunity in Referrals/Submitted with no monetary value.", "Confirm the referred contact enters WF-01 as a NEW contact."],
  "depends_on": ["Referrals pipeline", "WF-01", "WF-11"]
}

WF["16"] = {
  "purpose": "Missed-call text-back plus a simultaneous-ring IVR path and chat out-of-office auto-response.",
  "diagram_key": "support",
  "trigger": {"type": "Inbound Call and Chat OOO", "filters": ["Inbound call", "Chat received out of office"], "target": "phone number(s) + chat widget."},
  "prerequisites": ["Phone numbers per clinic", "chat widget", "scheduling link custom value", "WF-11 consent gate"],
  "steps": [
    {"order": 1, "action": "Manual Call", "name": "IVR: Simultaneous ring", "config": "Ring all locations at once (absorbs '1. IVR - simultaneous')."},
    {"order": 2, "action": "If/Else", "name": "If: Answered?", "config": "Branch on answer.", "branches": [
      {"label": "Yes", "condition": "call answered", "path": "Handled live, end"},
      {"label": "No - missed", "condition": "call missed", "path": "Instant text-back (step 3)"}
    ]},
    {"order": 3, "action": "Send SMS", "name": "SMS: Instant Text-Back (T+0)", "config": "Immediate text-back on a missed call."},
    {"order": 4, "action": "Send SMS", "name": "SMS: Follow-Up (T+30m)", "config": "Follow-up text."},
    {"order": 5, "action": "Send SMS", "name": "Chat: Auto-Response", "config": "On chat OOO, auto-respond with the scheduling link."}
  ],
  "messages": [{"step": "SMS: Instant Text-Back", "channel": "SMS", "body": "Sorry we missed your call to Men's Wellness Centers, {{contact.first_name}}. How can we help? You can book your no-cost 60-minute in-person consultation here: {{custom_values.booking_link}} Reply STOP to opt out."}],
  "settings": {"quiet_hours": "8a-9p contact TZ on outbound sends (WF-11 gate).", "allow_reentry": "Per inbound event.", "stop_on_response": "Yes.", "reentry_caveat": "IVR simultaneous-ring is the intended path (absorbs the legacy IVR workflow).", "status": "Draft. Do not publish without sign-off."},
  "test": ["Place a test call and miss it; confirm instant text-back + 30-min follow-up.", "Confirm simultaneous ring across locations.", "Trigger chat OOO and confirm the auto-response with scheduling link."],
  "depends_on": ["Clinic phone numbers", "chat widget", "booking link custom value", "WF-11"]
}

out = {
  "_note": "SOP build guides for the 16 to-be workflows. Grounded in data.json copy, wf-diagrams.json src, and the enum contract. 'BUILD DECISION NEEDED' marks values the spec does not yet fix. Regenerate with scripts/build_tobe_detail.py.",
  "workflows": WF,
}
with open(os.path.join(PUB, "tobe-detail.json"), "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print("wrote tobe-detail.json with", len(WF), "workflows")
