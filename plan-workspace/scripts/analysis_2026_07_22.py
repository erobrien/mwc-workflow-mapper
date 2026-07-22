"""Eric-requested engineering analysis, keyed by live workflow name, added on
top of the 2026-07-22 live re-extraction. Each entry becomes the `analysis`
object rendered as a new section on the as-is WorkflowDetail page, under the
workflow title, per Eric's instruction: "add your description of the workflow
... include what is wrong with the workflow or how it could be improved or
consolidated, or even how it could be refactored."

Severity: critical | major | minor | none (informational only)
"""

ANALYSIS: dict[str, dict] = {

"05. Clinic Appt Outcome": {
    "summary": "The keystone outcome router. Fires on 7 triggers (a PCC-submitted "
        "'Px Showed' form, 2 staff trigger-links for Cancelled/Rescheduled, a "
        "trigger-link for No-show, and 3 per-clinic native calendar 'appointment "
        "cancelled' triggers) and, across 60 steps, sets the calendar appointment "
        "status, emails the member, and writes an Opportunity for the outcome.",
    "severity": "critical",
    "findings": [
        "Auto-Won on attendance, not on a sale. The 'PA reported PX SHOWED' branch "
            "ends in a step literally named \"A&D pipeline: Closed, status: WON - "
            "hide from a&D opportunity\" -- a create_opportunity node with "
            "opportunity_status=won and monetary_value={{contact.total_program_amount}}. "
            "This fires for every member who simply attends, before any PCC has "
            "recorded whether they bought anything. If total_program_amount is unset "
            "(the normal case before disposition), the deal is Won at $0. The vendor's "
            "own inline comment on the node -- \"hide from a&D opportunity\" -- shows this "
            "was known to be a workaround, not a designed outcome path.",
        "Duplicate 'lost' writers for the same cancellation. Two independent branch "
            "families create a lost opportunity in the same per-clinic pipeline/stage for "
            "a cancel event: one keyed off the staff trigger-link ('PA reported PX "
            "Cancelled') and one keyed off the native calendar trigger ('Px Cancelled "
            "calendar Appt: <clinic>'). Both use create_opportunity (not "
            "update/find-then-update), so a single cancellation that both a staff member "
            "logs AND the calendar reports can mint two separate Lost deals for one visit.",
        "The 'PA reported PX Rescheduled' trigger is wired but orphaned. It is declared "
            "as a trigger on this workflow, but no step in the graph references that "
            "trigger-link id -- a reschedule reported this way does nothing. There is no "
            "reschedule handling anywhere in this workflow.",
        "Sale outcome and revenue still key off Contact fields ({{contact.total_program_amount}}), "
            "consistent with the account-wide D2 finding (135/135 custom fields on Contact, "
            "not Opportunity) -- so a member's second visit overwrites the first visit's "
            "revenue before this workflow ever reads it.",
    ],
    "recommendation": "Split responsibilities: (1) attendance should only ever set "
        "appt_status=showed and stop there -- it must never write a pipeline stage or "
        "Won/Lost status; (2) sale outcome (Won/A&D/MUT) must be written exactly once, "
        "by the PCC Sales Form via an update_opportunity against the opportunity created "
        "at booking, never a fresh create_opportunity from this workflow; (3) collapse "
        "the two cancel paths (trigger-link + native calendar) into the native Appointment "
        "Status trigger only, filtered by Modified By, and make the write an "
        "update_opportunity/find_opportunity pair, not create_opportunity, so a contact "
        "can't accumulate duplicate Lost deals; (4) either wire the orphaned Rescheduled "
        "branch to a real action (typically: re-open the existing opportunity, do not "
        "close it) or remove the unused trigger.",
},

"4b. Disposition – Workflow (active)": {
    "summary": "Call-disposition router with 9 call_status triggers (Not Qualified, "
        "DNC, Hung up, Not Interested, No answer/Voicemail, Follow Up Needed, "
        "Requested appointment, etc.). For every disposition it removes the contact "
        "from whatever pipeline/stage they were previously in and creates a new "
        "opportunity in either the open Disposition pipeline or the Lost pipeline.",
    "severity": "major",
    "findings": [
        "Remove-then-create instead of update. Every branch pairs a "
            "remove_opportunity (from pipeline GeT92kRjikpLMRu3EgKT) with a fresh "
            "create_opportunity in a different pipeline. This destroys the original "
            "opportunity's history (source, created date, prior notes/attribution) on "
            "every disposition change instead of moving one persistent record through "
            "pipeline stages -- the opposite of the 'one record per deal' model needed "
            "for clean revenue and funnel reporting.",
        "No find_opportunity guard before the write. If two dispositions land close "
            "together (e.g. a callback re-dispositioned before the first write settles), "
            "there's no lookup to confirm which opportunity is being removed, which "
            "is the exact 'read-after-write race' pattern flagged in the platform "
            "best-practices as needing a Wait buffer -- none is present here.",
        "9 near-duplicate remove/create branch pairs. Not Qualified, DNC, Hung up, "
            "Not Interested, No answer/Voicemail, etc. all run the same two-step "
            "remove+create shape differing only in the destination stage id -- a "
            "textbook case for one parameterized branch driven by a disposition-to-stage "
            "lookup instead of 9 hand-cloned branches.",
    ],
    "recommendation": "Replace remove_opportunity + create_opportunity with "
        "find_opportunity + update_opportunity against the opportunity created at "
        "booking, so disposition changes move one record through pipeline stages "
        "instead of destroying and recreating it. Consolidate the 9 branches into a "
        "single disposition-to-stage mapping (a lookup table, not 9 workflow branches).",
},

"03d. Update Appointment Status": {
    "summary": "Logs PCC-reported appointment outcomes (Showed / Cancelled / No "
        "Show / Rescheduled) into the 'Appt Report Raw' Google Sheet via a "
        "lookup-then-update-row pattern.",
    "severity": "major",
    "findings": [
        "Reschedule is logged as No-show. The 'PA reported Px Rescheduled' branch's "
            "very next step is named \"Update Outcome to No Show | Workflow: Appointment "
            "Report | Sheet: Appt Report Raw\" -- copy-pasted from the No-show branch and "
            "never renamed. It writes 'Yes' into the sheet's single 'Outcome' column "
            "(columns B-M, value index 11), so a rescheduled appointment is "
            "indistinguishable in the reporting sheet from an actual no-show, and the "
            "step name actively misleads anyone auditing the workflow. This is a direct, "
            "confirmed answer to the 'are we handling reschedules properly' question: no, "
            "reschedules are being recorded as no-shows in the operational report.",
        "The 'Outcome' column is a single boolean-ish cell ('Yes') shared across Showed / "
            "Cancelled / No-show / Rescheduled -- the sheet has no way to distinguish "
            "which outcome actually happened once written, only that some outcome was "
            "recorded. Reporting built on this sheet cannot separate no-show rate from "
            "reschedule rate.",
        "This workflow and '05. Clinic Appt Outcome' both react to overlapping PCC-reported "
            "outcome signals and both write outcome state (one to a Sheet, one to "
            "Opportunities) with no single source of truth between them.",
    ],
    "recommendation": "Fix the mislabeled node immediately -- it is a one-line rename "
        "plus a distinct write value (e.g. 'Rescheduled') instead of reusing the No-show "
        "write. Give the sheet a real enum column (showed/no_show/cancelled/rescheduled) "
        "instead of a single Yes/blank Outcome flag. Long-term, retire the parallel "
        "Google Sheet as the outcome ledger in favor of the Opportunity (single writer, "
        "per the D2 finding) and keep the sheet as a read-only export.",
},

"Cancelled Appointments": {
    "summary": "Per-clinic (Richmond / Newport / VA Beach) native Appointment Status "
        "trigger that removes the contact from the two active booking workflows and "
        "creates a 'lost' opportunity in the clinic's pipeline.",
    "severity": "major",
    "findings": [
        "Fourth independent writer on the same cancel event. Combined with "
            "'05. Clinic Appt Outcome' (2 separate cancel paths) and '03d. Update "
            "Appointment Status' (sheet-only), a single calendar cancellation can now "
            "fire in up to 3 workflows simultaneously, minting up to 2-3 Lost "
            "opportunities and 1 sheet row, with no coordinating 'Modified By' filter "
            "or single-writer designation between them.",
        "Per-clinic cloned trigger/branch structure (Richmond / Newport / VA Beach as "
            "three near-identical if/else branches with hardcoded pipeline ids) -- a "
            "direct instance of the DRY violation the account is already flagged for: "
            "one parameterized branch on opportunity.location would replace all three.",
        "create_opportunity again, not update -- same anti-pattern as 4b: a fresh "
            "Lost deal is minted instead of transitioning the existing opportunity that "
            "was created at booking.",
    ],
    "recommendation": "This workflow's entire responsibility (cancel -> mark Lost) "
        "duplicates work already attempted in 05 and 03d. Retire it and consolidate all "
        "cancel handling into one workflow with a single native Appointment Status "
        "trigger (Modified By: Customer vs Staff vs API distinguished, per clinic handled "
        "via opportunity.location, not 3 cloned branches).",
},

"03. Appointment Booked": {
    "summary": "102-step booking-confirmation workflow: 5 triggers across virtual and "
        "3 physical clinics, tagging, 4 opportunity writes, 13 waits, and 21 messages "
        "(reminders/confirmations).",
    "severity": "minor",
    "findings": [
        "35 decision nodes and 12 gotos in one workflow substantially exceeds "
            "HighLevel's own 'fits on one screen' sizing guidance and the account's "
            "documented target of splitting confirmation/reminder logic into WF-03 "
            "cleanly -- this workflow is doing booking confirmation, reminders, AND "
            "some opportunity bookkeeping in one place.",
        "4 opportunity writes inside a booking-confirmation workflow raises the same "
            "single-writer question as 05/4b/Cancelled Appointments -- worth confirming "
            "these are create-at-booking only (expected, one time) and not also "
            "touching stage/status later in the flow.",
    ],
    "recommendation": "Verify the 4 opportunity nodes are all a one-time create-at-booking "
        "(stamping attribution + opening the deal) and not overlapping with outcome "
        "writes owned elsewhere. If confirmed clean, this workflow's size is the main "
        "issue -- candidate to split reminders into their own workflow per the target "
        "spec's WF-03 boundary.",
},

"03b. Unconfirmed Appointment – Confirmation Required": {
    "summary": "199-step, 3-trigger (per-clinic Customer Booked Appointment) chase "
        "sequence: 63 decisions, 23 waits, 33 messages, 13 opportunity writes, 8 "
        "appointment-status writes, 14 exits.",
    "severity": "major",
    "findings": [
        "Largest workflow in the priority extraction by step count and decision count. "
            "199 steps / 63 decisions is far past a one-screen, auditable size and is a "
            "direct instance of the 'oversized monolith' anti-pattern -- troubleshooting "
            "a single confirmation-chase bug means navigating dozens of nested branches.",
        "13 opportunity writes plus 8 appointment-status writes inside a workflow whose "
            "name suggests it should only be chasing a confirmation reply -- this is "
            "likely where some of the outcome-writer sprawl seen in 05/4b/Cancelled "
            "Appointments actually originates from, since an unconfirmed appointment can "
            "resolve to Cancelled or No-show mid-chase.",
    ],
    "recommendation": "This is the top candidate for the 'Merge into WF-03 Booking "
        "Confirmation and Reminders' decision already locked in the target spec (Decision "
        "2) -- confirm during rebuild that its opportunity/appointment-status writes are "
        "removed here and centralized in the single outcome router, leaving this workflow "
        "as pure messaging/chase logic.",
},

"4a. Softphone Call Disposition – Workflow": {
    "summary": "9-trigger call_status router (mirrors 4b's disposition set) with 9 "
        "opportunity writes and 10 field writes, apparently a softphone-specific twin "
        "of 4b's dialer-based disposition router.",
    "severity": "major",
    "findings": [
        "Near-duplicate of 4b. Disposition – Workflow (active) -- same 9 call_status "
            "trigger names (Not Qualified, DNC, Hung up, Not Interested, No answer/"
            "Voicemail, Follow Up Needed, Requested appointment, Call Completed), "
            "same opportunity-write shape, different channel (softphone vs. dialer). "
            "Two workflows independently encode the same disposition-to-pipeline-stage "
            "business rule -- a change to that mapping today has to be made twice, "
            "and the two are already at risk of drifting (4a has 9 opportunity writes "
            "across 40 steps, 4b has 16 across 95 steps).",
    ],
    "recommendation": "Consolidate 4a and 4b into one disposition workflow with the "
        "phone channel (softphone vs. dialer) as a value on the trigger/contact, not a "
        "second cloned workflow. This is the same DRY violation the account is already "
        "flagged for at the per-location level, just applied to per-channel instead.",
},

"07. POST-VISIT - SHOWED Opportunities and For Review/Referral": {
    "summary": "135-step workflow triggered by the same 'PA reported PX SHOWED' form "
        "submission that also triggers 05 and 08 -- 78 of its 135 steps are opportunity "
        "operations, plus review/referral logic.",
    "severity": "critical",
    "findings": [
        "Same trigger as 05. Clinic Appt Outcome and 08. MUT. Three separate workflows "
            "independently react to one PCC form submission and each writes its own "
            "opportunity state with no visible ordering guarantee or shared guard -- this "
            "is the single largest source of the 939-false-win/duplicate-opportunity "
            "problem already quantified account-wide. A single 'Px Showed' form submit "
            "can fan out into 3 workflows racing to write outcome data.",
        "78 opportunity-write steps in one workflow is an extreme outlier even among "
            "already-flagged offenders (4b has 16, Cancelled Appointments has 3) -- "
            "almost certainly per-clinic and per-outcome cloning of the same handful of "
            "operations rather than 78 genuinely distinct business rules.",
    ],
    "recommendation": "This workflow, 05, and 08 should not all listen to the same form "
        "submission independently. Collapse into one outcome router (05, per the target "
        "spec) that reads the PCC form once, branches on the reported outcome, and calls "
        "review/referral and MUT logic as sub-flows via 'Add to Workflow' rather than "
        "three top-level trigger-competing workflows. The 78-step opportunity block is "
        "the single highest-value target for the location-parameterization refactor.",
},

"08. MUT (Medically Untreatable)": {
    "summary": "16-step workflow, same 'PA reported PX SHOWED' form trigger as 05 and "
        "07, handling the Medically Untreatable disposition specifically.",
    "severity": "major",
    "findings": [
        "Third workflow on the same trigger (see 07's finding) -- MUT-specific logic "
            "could be a branch inside the single outcome router instead of a fully "
            "separate workflow racing on the same event.",
    ],
    "recommendation": "Fold into the consolidated outcome router as an MUT branch "
        "(this is exactly what the target spec's WF-05/WF-06 consolidation already plans).",
},

"02. NON BOOKED NEWLEADS": {
    "summary": "87-step nurture workflow for leads that entered a funnel but never "
        "booked, triggered by 6 per-clinic/per-funnel 'Funnel Entry' tags plus a "
        "'React App' contact_tag trigger.",
    "severity": "minor",
    "findings": [
        "6 near-identical Funnel Entry triggers (Home, Consultation, Richmond, VA Beach, "
            "Newport News + React App) feeding one workflow body is reasonable "
            "consolidation, but confirm the 32 decisions inside aren't re-deriving "
            "per-location values (address/phone/booking link) that should instead be "
            "stamped once at lead capture and read from contact fields downstream, per "
            "the account's Locations-object pattern.",
    ],
    "recommendation": "Spot-check the 32 decision nodes for hardcoded per-location "
        "strings; if present, migrate to the current_booking_url / current_clinic_* "
        "generic fields already created for this purpose.",
},

"01A. Home Form and Source with Click ID": {
    "summary": "302-step lead-capture workflow (the largest by node count in the "
        "extraction) parsing form submissions, tagging lead source (Meta/Google/direct), "
        "and branching per clinic for click-ID and UTM capture.",
    "severity": "minor",
    "findings": [
        "302 steps for a single form's lead-capture logic is large, but this and its "
            "siblings (01B/01C/01D/01E, each 92-302 steps) are the account's own "
            "documented per-location clone pattern for source/click-ID capture -- "
            "consistent with the already-known D4 finding (0/11,077 contacts have "
            "gclid/fbclid populated) despite this workflow's explicit job being to "
            "capture exactly that.",
    ],
    "recommendation": "Given D4 is already confirmed account-wide, the fix belongs at "
        "the capture mechanism (is the click-ID actually present in the inbound webhook "
        "payload before this workflow runs, or is the field mapping wrong downstream) "
        "rather than in this workflow's branching logic, which looks structurally correct.",
},

}
