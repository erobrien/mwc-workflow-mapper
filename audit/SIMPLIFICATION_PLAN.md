# MWC GHL Sub-Account — Audit Validation & Simplification Plan

**Date:** 2026-06-11 · **Location:** Ghstz8eIsHWLeXek47dk · **Method:** Live API crawl (read-only) vs. https://mwc-automation-map-v2.vercel.app/migration

---

## Part 1 — Validation of the Existing Migration Plan

### Claims confirmed by live API data

| Claim (migration page) | Live API result | Verdict |
|---|---|---|
| 135 workflows | 135 workflows | ✅ Exact |
| 26 forms | 26 forms (incl. both retirement candidates) | ✅ Exact |
| 305 tags, mixed conventions | 305 tags: 236 underscore, 54 hyphen, 19 with spaces, 28 colon-prefixed | ✅ Exact |
| 135 contact fields to freeze | 135 custom fields, **all model=contact, zero opportunity fields** | ✅ Confirmed + worse than stated |
| ~6,772 opportunities to backfill | 6,775 opportunities | ✅ (growing daily) |
| 17-stage "mega-pipeline" (MWC Lead Pipeline) | 17 stages confirmed | ✅ Exact |
| A&D pipeline "auto-marked Won, poisoning win-rate reporting" | **A&D pipeline: 939 won / 0 lost.** That's 50% of ALL "won" opps account-wide (1,864 total) | ✅ Confirmed — the single worst data problem |
| Revenue not recognized properly | 57–99% of sampled "won" opps have **$0 monetaryValue**. $0 payment transactions exist in GHL — opportunity fields are the only revenue record, and they're empty | ✅ Confirmed |

### Where the migration plan is wrong or incomplete

1. **Pipeline count: 18, not 14.** The plan misses: `Instagram DM Pipeline`, `JJ Funnel`, `Non Booked` (1 stage, 733 open opps!), `z Call Disposition` (378 opps used as a disposition log), `Ambassador Referrals`, `Referral Rewards`. All must be in the retirement map or opportunities strand.
2. **Workflow status split: 38 published / 97 draft** (plan says 37/50). 97 drafts is nearly double what's documented — the draft graveyard is bigger than believed.
3. **Form consolidation (26→24) is far too timid.** There are ~8 near-duplicate lead-capture/consultation forms (`MWC Consultation Request`, `MWC Consultation Request - bookmwc.com`, `Newport News/Richmond/Virginia Beach/Virtual Consultation`, `New Funnel LP Form`, `New Funnel LP Form - 02`, `MWC - Website Form`, `MWC - GHL WEB FORM`) plus explicit vendor test forms. Target should be ~8–10, not 24.
4. **Tag rename mapping has a bug.** `location:virginia-beach` → `locationvirginia_beach` and `form:lead-intake-smoke-test` → `formlead_intake_smoke_test` drop the namespace separator. Correct: `location_virginia_beach`, `form_lead_intake_smoke_test`. Apply renames from a reviewed CSV, not the generated list as-is.
5. **Virginia Beach pipeline has 1 won opp** (vs Richmond 318, Newport 110) while A&D holds 939 — VA Beach sales were evidently routed into A&D/Sales Production. Any historical by-location revenue report is unrecoverable without the backfill.
6. **The A&D problem is two problems, not one.** Sampling A&D "won" opps: 43% carry real monetary values ($199k in a 100-opp sample) — genuine sales living in a no-sale pipeline — while 57% are $0 no-sales marked Won. The backfill must split these, not blanket-restate all 939.

### Plan recommendations I endorse as-is

- Never move opportunities between pipelines via workflow (GHL wipes opportunity custom fields on transfer) — migrate via API instead.
- Shift revenue fields from contact-level to opportunity-level; freeze the 135 contact fields.
- Single pipeline with a Location opportunity field instead of per-location pipelines (calendars already model this correctly: exactly 3, one per physical location).
- Rule-based snake_case tag registry.

---

## Part 2 — My Simplification Plan

### Target architecture (tighter than the migration page)

**Pipelines: 18 → 3** (the page's 5 keeps too much structure)

1. **Sales — Lead to Close** (one pipeline, ~9 stages):
   `New Lead → Engaged → Booked → Confirmed → Showed → Won` with exit statuses, not stages, for: No-Show, Cancelled, A&D/No-Sale (status=lost + lostReason), MUT (status=abandoned + tag `system_mut`), Disqualified.
   - Location, Sale Outcome, Product/Price/Term ×3, Total Program Amount, Patient Advisor, Provider = **opportunity custom fields**.
   - `monetaryValue` = Total Program Amount, set at Won. **Won requires value > 0** (enforced by workflow validation + weekly exception report).
   - Lost reasons replace the entire Lost/Dead pipeline's 6 stages and the 5 A&D-objection stages (cost/fear/partner/timing/decision → `lostReasonId` + one `objection_*` tag).
2. **Retention & Renewals:** `Onboarding → Active → Renewal Due → Renewed | Churned`. Renewal = a NEW opportunity (Won: Renewal), never reopening the original — keeps revenue recognition per-sale.
3. **Referrals (Ambassador + PCC):** `Submitted → Qualified → Booked → Showed → Rewarded | Invalid`. Referred patients themselves go in the Sales pipeline with `source=referral`; this pipeline tracks only the referrer/reward side.

Retired outright (no replacement structure needed): Instagram DM (→ Sales, source field), JJ Funnel (vendor legacy), Non Booked (→ Sales "New Lead" status), No Show/Cancel (→ statuses), z Call Disposition (dispositions are contact/call data, never opportunities — 378 opps here are noise), Lost/Dead, A&D, Renewals (old), all 4 location pipelines, MWC Lead Pipeline, MWC Sales Production.

**Workflows: 135 → ~16 published, 0 drafts**

| # | Workflow | Absorbs |
|---|---|---|
| 1 | Lead Capture + Attribution (location-branched) | 01A–01E, Home/Richmond/NPN/VB "Form and Source", WP Lead Capture |
| 2 | Non-Booked Recovery | 02 NON BOOKED, No Book Paid 48hr, Clicked-but-didn't-book |
| 3 | Booking Confirmation + Reminders | 03, 03b, 03c, 03d, 3a Auto Confirm, 8AM reminder, Block Duplicate Appt |
| 4 | Pre-Visit Intake | 04a, 04b Typeform, intake variants |
| 5 | Appointment Outcome Router | 05, Clinic Appointment Outcome — sets opportunity fields, the ONLY workflow that touches Sale Outcome |
| 6 | Post-Visit: Won (review/referral/onboarding) | 06A, 07, review requests |
| 7 | Post-Visit: No-Sale nurture | A&D objection ×5 + JJ duplicates ×5 + Decision Support → one workflow branched on lostReason |
| 8 | No-Show / Cancelled Recovery | 3 per-location No-Show + 3 per-location Cancelled + Nurture: Missed Clinic Appt + Cancelled Appointments |
| 9 | Long-Term Nurture | HOT/WARM/COLD ×2 (copies) → one, branched on tag |
| 10 | Feedback Survey | send + submitted pair |
| 11 | Compliance & Errors (STOP, DNC, bounce, MUT) | 4 workflows |
| 12 | Call Disposition Handler | 4a, 4b ×3, z Contact Call Disposition, Dispo tag-adders |
| 13 | Ad-Platform Conversions (Meta CAPI + Google Ads) | 2 CAPI + 3 Google Ads |
| 14 | Ambassador Program | 4 ambassador workflows |
| 15 | PCC Referral Routing | as-is |
| 16 | Comms Edge (IVR, chat widget OOO, missed-call text-back, ManyChat/BF inbound) | 6 workflows |

Plus: delete `New Workflow : 1780243709697` (unnamed, published!) after inspecting its trigger.

**Forms: 26 → ~9.** One lead-capture form (location as hidden/param field), one qualification, one intake (v2), one clinic appt form, one cancellation feedback, one ambassador, one PCC, one contact-center, one social callback. Retire all location-specific consultation forms (the Interactive Location Form pattern already proves location-param works) and all vendor/test forms.

**Tags: 305 → ~120 under a registry.** Namespaced snake_case: `source_*`, `location_*`, `funnel_*`, `status_*`, `objection_*`, `system_*`, `form_*`. Many current tags duplicate what should be fields (location, source are opportunity/contact fields — tags only for workflow triggers that need them).

### Execution phases

**Phase 0 — Freeze & snapshot (day 1).** Export all opportunities + contacts with custom fields via API to CSV (raw JSON snapshots from this audit are in `audit/`). No new workflows/pipelines/tags without sign-off. ⚠️ Deleting a GHL pipeline deletes its opportunities — nothing is deleted until Phase 5.

**Phase 1 — Foundation (week 1).** Create the 14 opportunity-level custom fields. Create the 3 new pipelines. Define lost reasons (No-Sale: Cost / Fear / Partner / Timing / Decision / Not Qualified / No Response / Duplicate / Test). Publish tag registry doc.

**Phase 2 — Build parallel (weeks 1–2).** Build the 16 consolidated workflows in draft against the new pipeline. Repoint clones of the 9 surviving forms. Test with smoke-test contacts end-to-end (lead → book → outcome → revenue fields populated → CAPI fires).

**Phase 3 — Data migration (week 2–3, scripted via API, never via workflow).** One script, idempotent, dry-run first:
- Map each of the 6,775 opps: old pipeline+stage → new pipeline+stage+status (mapping table reviewed by a human first).
- **A&D restatement, split by evidence:** monetaryValue > 0 or contact `Sale Outcome=Sold` → status Won (real sale, ~400); else → status Lost + lostReason from objection tag (~540).
- Copy contact revenue fields → opportunity fields; set monetaryValue = Total Program Amount.
- Reconcile: Σ monetaryValue (won) before vs after must match the known sales ledger; produce exception list for manual review.

**Phase 4 — Cutover (one evening).** Repoint live funnels/website/calendars to new forms; publish the 16 new workflows; unpublish all 38 old ones (pause, don't delete). Monitor 72h: every new lead must land in Sales pipeline with attribution.

**Phase 5 — Cleanup (week 4, after 2 clean weeks).** Delete the 97 draft workflows, then old published ones. Delete old pipelines (only after confirming 0 remaining opps in each). Execute tag renames from corrected CSV; rename contact field folder to `zz Legacy (frozen)`. Retire 17 forms.

**Phase 6 — Reporting (ongoing).** Win rate = Won / (Won + Lost) on the Sales pipeline only — expect reported win rate to roughly **halve** when the 939 fake wins are restated; communicate this to leadership *before* dashboards change. Weekly data-quality report: won-with-$0 (should be 0), opps with no location, stage-age outliers.

### Success criteria

- 1 pipeline answers "how much did we sell, by location, by advisor" from opportunity fields alone.
- Zero won opportunities with $0 value going forward.
- Every active automation has exactly one owner workflow per lifecycle event.
- Account objects: 3 pipelines, ~16 workflows, ~9 forms, ~120 tags, 14 opportunity fields.

---

## Part 3 — Browser Crawl: Node-Level Validation (workflow internals)

The public API exposes only workflow names/status. To validate the *logic*, I opened workflows in the GHL builder UI (the canvas streams from Firestore behind an app-scoped token, so REST/iframe scraping is blocked — visual crawl was the viable path).

### CONFIRMED — the A&D win-rate poisoning mechanism (root cause, node-level)

In **`05. Clinic Appt Outcome`** (published), the **SHOWED** branch ends in a *Create Opportunity* action configured as:

- **Action name:** `A&D pipeline: Closed, status: WON - hide from a&d opportunity`
- **In Pipeline:** `07. A & D`
- **Stage:** `Closed`
- **Opportunity Name:** `{{contact.name}} SHOWED`
- **Opportunity Value:** `{{contact.total_program_amount}}`
- **Status:** Won

**Implication:** every patient who simply *shows up* (not necessarily buys) gets an opportunity auto-created in the A&D pipeline marked **Won**. This is the exact mechanism behind the 939 won / 0 lost in pipeline `07. A & D` and the ~50% inflation of account-wide win rate. The value pulls from the **contact** field `total_program_amount` (empty for most → explains the 57–99% $0-value won opps). The migration page's claim "A&D auto-marked Won, poisoning all win-rate reporting" is verified at the configuration level, not just inferred.

`05` is also a single mega-workflow with ~9 triggers and location-branched sub-trees (Newport/Richmond/VA Beach cancellation emails, per-location pipeline moves) — a textbook consolidation target, and the one workflow that should exclusively own Sale Outcome.

### CONFIRMED (with a twist) — the 01A–01E location forms are copies that DIVERGED
All share the same entry: **Trigger → Create Contact → Add location tag → Click ID** (`01A` tags `Funnel_Entry_Home_Page`; `01B` tags `funnel_entry_richmond`). BUT they are not equal copies:
- **`01A. Home`** is a 3-node stub (Create Contact → tag → Click ID) and stops.
- **`01B. Richmond`** carries a massive downstream tree (source-attribution + lead-routing + opportunity-creation branches, ~40+ nodes at 34% zoom).

So the routing logic lives inside *some* location variants and not others — the textbook "repeated but disconnected" problem the user described. Consolidating 01A–01E into one location-branched Lead Capture is correct, but it's a *reconciliation* job (merge the divergent logic), not a simple dedupe — budget effort accordingly.

### Tooling note
The builder canvas freezes the renderer intermittently under automation (the softphone/Twilio widget initializing on reload conflicts with canvas paint). Reliable captures required a fresh browser tab per workflow. A full 135-workflow visual crawl is therefore slow; node-level validation was focused on the highest-impact claims (revenue recognition + A&D), which are now confirmed.

---

## Part 4 — Evaluation of the Human Sprint Proposal + reconciled scope

> **UPDATE (2026-06-13):** The account owner confirmed the AI engine (BotFanatics/Sniper)
> is **installed but NOT live**, and no outside human builders will be involved — execution
> is owner-prompted Fable only. All engine-owner gates and the staging rehearsal day are
> removed from the execution path; the engine's tag surface remains frozen so the
> integration can re-attach later. Risk register items premised on a live engine are void.


**Scope correction:** the system is partially working; **ignore all 97 unpublished workflows and any unpublished assets.** The real target is the **38 published workflows** (API count; the proposal says 24, the migration page said 37 — all three disagree, so the consultant should re-pull live before quoting a number). Everything below is published-only.

### The proposal's one genuinely important contribution: engine-awareness
Neither the migration page nor my own first-pass audit knew there is a **live AI engine (BotFanatics chatbot + "Sniper" dormant-lead reactivation, maintained by an external engine owner)** sitting on top of GHL — handling webchat, SMS, booking, and reactivation. I verified its footprint in the live data: tags `chatbot_lead`, `src:bf-web`, `sniper_unconfirmed`, `sniper_failed_no_response`, and the `funnel_entry_*` family all exist and are written by the engine. **This makes the published workflows an API contract, not free-standing automation** — the engine changes GHL state (tags/stages/contacts/appointments) and those changes fire workflows.

Consequence: **my original "consolidate 135→16" was naive.** Any consolidation must preserve the trigger surface the engine depends on. The proposal's **bot-dependency flag** (Keep/Merge/Remove/Rebuild × Bot-dependent Yes/No/Unknown) is the correct discipline and should be adopted. 14 of its 17 "protected tags" exist verbatim; 3 are imprecise (`funnel_entry` is actually a prefix family, `voice_inbound` doesn't exist, `bf_test` doesn't exist though `src:bf-web` does) — so trust the author's intent but re-derive the protected list from live data, not their list.

### Adopt from the proposal
- Engine-aware **bot-dependency audit** of each published workflow.
- **TCPA/DND gap analysis** (which workflows send without checking DND/STOP) — a real compliance exposure, and absent from my plan.
- **Brand-voice rules** for messaging (no "free"/"patient"/"clinic", plain URLs, required footer) — concrete and engine-enforced.
- **Canary gate** (`bf_test`/`src:bf-web` cohort runs the new path first for 48h) and **joint go-live checklist with the engine owner** before any flip.
- Final **documentation/handoff** artifacts.

### Reject or fix in the proposal
1. **REJECT the central architecture: "rebuild in a staging subaccount, then migrate to production."** GHL does **not** cleanly migrate 6,775 historical opportunities + contact history + attribution + the live engine binding (`GHL_LOCATION_ID`) between subaccounts. The "single env-var swap" trivializes a one-way door. Staging is excellent for **building and QA-ing** new workflows; it is the wrong **migration vehicle** for historical revenue data. Recommend **fix-in-place on the published set with change control**, using staging only to build/test, then rebuild-in-place in production behind the canary — not a wholesale subaccount move.
2. **BIGGEST OMISSION — it doesn't solve the actual brief.** The ask was "sale and revenue recognition is not done properly." This is a **show-rate / messaging** sprint. It never mentions: the **A&D auto-Won corruption** in `05. Clinic Appt Outcome` (the #1 finding), the **contact→opportunity revenue-field migration**, or the **~6,772-opportunity revenue backfill**. You could complete this entire 5-week sprint and your win-rate and revenue dashboards would still be wrong. Revenue remediation must be added as **Priority 0**.
3. **Timeline optimism:** 4–5 weeks @ 4h/day (~80–100h) to audit 133, rebuild core architecture, build a messaging library, QA with the engine, and migrate is thin — driven partly by auditing the ~97 drafts you've told us to ignore. Published-only scope + fix-in-place makes the timeline realistic; staging-migrate makes it slip.
4. **No data/reporting track.** New clean architecture on top of uncorrected history = dashboards still lie. The backfill + win-rate restatement (and the leadership heads-up that reported win rate will ~halve) belong in the plan.
5. **REJECT all proposed new custom objects — Finance/Billing, Lead Source, and the Consent Log "custom object spike."** None are needed. Revenue lives on **opportunity-level custom fields** (Total Program Amount → `monetaryValue`, etc.) on the single Sales pipeline — there is no separate billing object, and the business does not do billing in GHL. Lead source is an **attribution field + `source_*` tag**, not an object. Consent is already carried by GHL's native DND/STOP/compliance state and the `11. Compliance & Errors` workflow — a custom Consent Log object adds schema surface, migration risk, and maintenance for zero reporting gain. Custom objects in GHL are also second-class for pipeline reporting (they don't roll up into opportunity revenue), which is exactly the metric this engagement exists to fix. **Target schema = 3 pipelines + 14 opportunity fields + the frozen contact fields. No custom objects.**

### Reconciled recommendation (merge the two)
Run the proposal's **process** (engine-aware audit → staging build/QA → canary → docs) over the **published-only** set, but:
- **Replace** the staging-subaccount *migration* with **in-place production remediation** behind the `bf_test`/`src:bf-web` canary.
- **Add a Revenue track as Priority 0**, parallel to the show-rate track:
  1. Fix `05. Clinic Appt Outcome` so SHOWED no longer creates a Won A&D opportunity; route outcomes to the single Sales pipeline with a real `Sale Outcome` field.
  2. Stand up the **opportunity-level** revenue fields (Product/Price/Term ×3, Total Program Amount → `monetaryValue`); freeze the 135 contact fields.
  3. **Backfill ~6,772 opportunities** via API (idempotent, dry-run first), splitting the 939 A&D "wins" into real sales vs $0 no-sales by evidence.
  4. Weekly data-quality report: won-with-$0 (target 0), opps with no location.
- Keep the engine constraint central: **no published workflow flagged Bot-dependent: Yes is modified without the engine owner's sign-off.**

**Bottom line:** the proposal is a competent show-rate/cleanup sprint from someone who understands the engine, but it (a) bets on a risky cross-subaccount migration, and (b) doesn't touch the revenue-recognition problem that was the actual reason for this engagement. Adopt its engine-awareness and QA discipline; reject the subaccount migration; bolt on the revenue track as Priority 0.

---

## Part 5 — Target Workflow Naming Spec (published set)

**Naming convention.** Every published workflow is named `NN. Title`, where:
- **`NN`** = two-digit, leading-zero number (`01`–`16`) ordered by the member lifecycle, so the GHL list sorts in lifecycle order automatically.
- **`Title`** = the single responsibility of that workflow. One workflow = one lifecycle event.
- No location, vendor, or person names in workflow titles — location is an opportunity/contact field, not a workflow.
- Drafts/experiments are prefixed `zz ` so they sort to the bottom and never collide with the numbered set.

Two names changed from the earlier list because **calendar auto-confirm is now enabled** (Richmond / Virginia Beach / Newport News all `autoConfirm: true`):
- The old confirmation-chase (`03b/03c/03d Unconfirmed Appointment`) is **obsolete** — appointments confirm on booking. `03` becomes reminders-only.
- That chase capacity is redirected into a new **`04. Medical Intake Chase`** pointing at `bookmwc.com/intake`.

| NN | Workflow name | Trigger (primary) | Absorbs today's flows |
|----|---------------|-------------------|------------------------|
| 01 | Lead Capture & Attribution | Form submit / inbound | 01A–01E, Home/Richmond/NPN/VB "Form and Source", WP Lead Capture |
| 02 | Non-Booked Recovery | Lead, no booking | 02 NON BOOKED, No Book Paid 48hr, Clicked-but-didn't-book |
| 03 | Appointment Reminders | Appointment booked | 03, 3a Auto Confirm, 8AM reminder, Block Duplicate Appt (confirmation-chase 03b/c/d retired — auto-confirm) |
| 04 | Medical Intake Chase | Appointment booked | 04a, 04b Typeform, intake variants — chases `bookmwc.com/intake`, stops on form submit |
| 05 | Appointment Outcome Router | Outcome reported | 05 Clinic Appt Outcome — the ONLY workflow that sets Sale Outcome |
| 06 | Post-Visit Won — Onboarding & Review | Outcome = Sold | 06A, 07, review & referral requests |
| 07 | Post-Visit No-Sale Nurture | Outcome = No-Sale | A&D objection ×5 + JJ duplicates ×5 + Decision Support → branched on lostReason |
| 08 | No-Show & Cancellation Recovery | Status change | 3× per-location No-Show + 3× Cancelled + Missed Clinic Appt + Cancelled Appointments |
| 09 | Long-Term Nurture | Tag `status_nurture_longterm` | HOT/WARM/COLD ×2 (Copies) → one, branched on tag |
| 10 | Feedback Survey | Post-visit | send + submitted pair |
| 11 | Compliance & Errors | STOP / DND / bounce / MUT | 4 workflows |
| 12 | Call Disposition Handler | Softphone disposition | 4a, 4b ×3, z Contact Call Disposition, dispo tag-adders |
| 13 | Ad-Platform Conversions | Stage → Booked / Won | 2× Meta CAPI + 3× Google Ads |
| 14 | Ambassador Program | Ambassador signup | 4 ambassador workflows |
| 15 | PCC Referral Routing | PCC referral | as-is |
| 16 | Comms Edge | IVR / chat / inbound | IVR, chat OOO, missed-call text-back, ManyChat/BF inbound |

**Status: `03` and `04` are live priorities** (auto-confirm shipped; intake chase to build next). The remaining 14 are the consolidation target for the published-only scope.
