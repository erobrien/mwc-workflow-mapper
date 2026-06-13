# MWC GHL Remediation — Step-by-Step Prompt Guide

Paste each prompt into Claude in order. Every step has a **gate** — do not move to the
next prompt until the gate passes. Prompts are written so each session is self-contained;
point Claude at this repo (`mwc-workflow-mapper`) where noted.

Scope: published assets only · fix-in-place · slice-by-slice · dry-run before every write.
Execution model: **you prompt, Fable executes** — data layer via API, workflow builds via
Fable driving the browser (fresh tab per workflow). No outside builders.
Engine status: the BotFanatics/Sniper integration is **installed but NOT live** — no engine
gates apply; its tag surface stays frozen so it can re-attach later.

---

## PHASE 0 — Instrument first (zero risk, do now)

### Prompt 0.1 — Revenue-integrity dashboard (read-only)
> Build the read-only daily revenue-integrity dashboard against the live GHL API
> (creds in audit/). Four metrics with a 7-day rolling baseline: (1) leads captured,
> (2) appointments booked + show rate by booking cohort, (3) opportunities Won +
> Σ monetaryValue, (4) CAPI/Google conversion events fired. Output a daily markdown
> report to audit/daily/ and flag any metric >10% off baseline. No writes anywhere.

**Gate:** dashboard runs 3 consecutive days with believable numbers.
**Also watching:** the auto-confirm change (already live) — show-rate cohort needs ~2 weeks.

### Prompt 0.2 — Full snapshot + write-scope probe
> Export every GHL object to versioned JSON/CSV under audit/snapshots/{date}/:
> all 6,775+ opportunities with custom fields, contacts with custom fields, pipelines,
> workflows list, tags, forms, calendars. Then probe write scopes: create one throwaway
> custom field via API, verify it, delete it. Report which scopes the token has.

**Gate:** snapshot complete + write scopes confirmed. This is the rollback baseline.

---

## PHASE 1 — Foundation (additive only, invisible to the live system)

### Prompt 1.1 — Create the data layer
> Create in production via API, additive only: (1) the 14 opportunity-level custom
> fields (Sale Outcome, Product/Price/Term ×3, Total Program Amount, Location,
> Patient Advisor, Provider, Appointment Fee, No-Sale Notes); (2) the 3 target
> pipelines — "Sales — Lead to Close", "Retention & Renewals", "Referrals" with the
> stage lists from audit/SIMPLIFICATION_PLAN.md Part 2; (3) the lost-reason set.
> Modify nothing existing. Verify each object by reading it back. Output a creation log.

**Gate:** all objects verified present; existing pipelines/fields untouched (diff vs snapshot).

---

## PHASE 2 — Revenue backfill (the actual fix)

### Prompt 2.1 — Dry run
> Write the idempotent backfill script (no writes this run). For all opportunities:
> map old pipeline+stage → new pipeline+stage+status per the mapping table in
> SIMPLIFICATION_PLAN.md; split the 939 A&D "wins" by evidence (monetaryValue>0 OR
> contact Sale Outcome=Sold → Won; else Lost + lostReason from objection tag);
> copy contact revenue fields → opportunity fields; set monetaryValue = Total Program
> Amount. Output: proposed-changes CSV (one row per opportunity) + reconciliation
> summary (Σ won revenue before vs after, win-rate before vs after) + exception list.

**Gate:** human reviews the CSV — spot-check ≥20 rows including A&D splits both ways.
Reconciliation must balance. Exceptions explained.

### Prompt 2.2 — Write mode
> The dry-run CSV is approved (attached/in audit/). Run the same backfill in write
> mode with batch checkpoints every 500 opps, re-runnable safely. After completion,
> re-run the reconciliation against live data and produce the before/after report.
> Then brief leadership: reported win rate will drop to its true value — draft that
> one-page note.

**Gate:** post-write reconciliation matches the approved CSV exactly. Dashboard (0.1)
shows no anomaly next morning.

---

## PHASE 3 — Workflow slices (browser builds from the build book)

Build order is risk-ordered. For each slice: Fable builds as DRAFT in the browser from
the build book at the diff site (Workflows section), with you watching → verify against
spec → test contact end-to-end → publish behind canary → pause absorbed sources →
1-week soak → next slice. Old workflows stop NEW enrollment when paused but in-flight
contacts drain to completion.

### Prompt 3.1 — Slice A (zero-revenue flows, proves the method)
> Slice A: build 10. Feedback Survey, 11. Compliance & Errors, 12. Call Disposition
> Handler as drafts per the build book, driving the browser yourself (fresh tab per
> workflow) while I watch. Then verify each draft against spec, run a test contact
> through each, and give me the publish/pause checklist.

**Gate:** 1 week soak, dashboard clean, no member complaints.

### Prompt 3.2 — Slice B (booking layer)
> Slice B: build 03. Appointment Reminders and 04. Medical Intake Chase per the build
> book (auto-confirm is already live; 04 chases bookmwc.com/intake and stops on intake
> submit). Verify, test contact, publish behind canary, then pause 03b/03c/03d and
> 3a. Confirm show-rate cohort trend while this soaks.

**Gate:** 1 week soak; show rate within 10% of baseline; intake completion rate visible.

### Prompt 3.3 — Slice C (capture + conversions, parallel-verified)
> Slice C: build 01. Lead Capture & Attribution and 13. Ad-Platform Conversions.
> Run old+new in PARALLEL for 5 days with daily reconciliation: new-path lead count =
> old-path lead count; conversion events deduped by event_id (no double-fire to
> Meta/Google). Only after parallel parity, pause 01A–01E and the 5 old conversion flows.

**Gate:** 5 consecutive days of parity. This is the highest-stakes slice — paid traffic.

### Prompt 3.4 — Slice D (outcome + post-visit)
> Slice D: edit 05 in place — DELETE the "A&D pipeline: Closed, status: WON" create-
> opportunity action, add Sale Outcome field writes per spec. Build 06, 07, 08.
> Verify the regression test: a SHOWED outcome must never create a Won A&D opportunity.

**Gate:** regression test passes; won-with-$0 counter trends to 0 on the dashboard.

### Prompt 3.5 — Slice E (remainder)
> Slice E: build 02, 09, 14 (verify ambassador flows as-is), 15 (rename only),
> 16 (reuse the frozen engine tags, never recreate them). Inspect
> "New Workflow : 1780243709697" and report what it does before we delete it.

**Gate:** 1 week soak, all 16 published, all absorbed sources paused.

---

## PHASE 4 — Dormant-engine check (engine is NOT live)

### Prompt 4.1
> Confirm the BotFanatics/Sniper integration remains off, and verify the frozen tag
> surface (chatbot_lead, src:bf-web, sniper_*, funnel_entry_*) was never renamed or
> deleted by any slice. If the engine is ever switched on later, run a bot-dependency
> audit before re-activation.

**Gate:** tag-surface diff vs snapshot is clean. No third-party sign-off needed.

---

## PHASE 5 — Cleanup (only after 2 clean weeks on the dashboard)

### Prompt 5.1
> Two clean weeks confirmed. Execute cleanup: archive the 97 drafts; delete paused
> source workflows; migrate any straggler opportunities then archive empty old
> pipelines (NEVER delete a pipeline holding opportunities); run tag renames from the
> corrected CSV; rename the contact-field folder to "zz Legacy (frozen)"; retire the
> 17 redundant forms. Produce the final before/after inventory report.

**Gate:** object counts match target (3 pipelines / 16 workflows / ~9 forms / ~120 tags).

### Prompt 5.2 — Standing watch
> Set up the weekly data-quality report as a scheduled task: won-with-$0 (target 0),
> opportunities missing Location, stage-age outliers, tag-registry violations.

---

## Success probabilities (with all gates enforced)

| Outcome | Probability (updated: engine not live, no third-party builders) |
|---|---|
| Revenue recognition fixed & trustworthy (Phases 0–2) | ~90% |
| Booking/intake layer live, show rate held (Slice B) | ~90% (monitor live, tripwire set) |
| Full 16-workflow consolidation completed | ~85% (engine unknown removed; single decision-maker) |
| Zero revenue-impacting incident along the way | ~90% (hourly mode + canary; engine desync risk gone) |
| **Entire plan, end-to-end, no material revenue dip** | **~85%** |
| At least the revenue fix + booking layer (the parts that matter most) | ~92% |

Failure modes are dominated by schedule slip and scope reduction, NOT revenue loss —
the gates are designed so the system fails *closed* (a slice that can't prove parity
just doesn't cut over; the old flow keeps running).
