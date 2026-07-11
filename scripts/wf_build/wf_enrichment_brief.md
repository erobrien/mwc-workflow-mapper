# MWC GHL Workflow Build — Enrichment Brief and Handoff

Generated 2026-07-11 by Perplexity Computer. Everything here was executed against the LIVE sub-account `Ghstz8eIsHWLeXek47dk`. All 16 target workflows exist as INACTIVE DRAFTS in the `-Target Release` folder (`d15ca26c-3448-4063-a0e5-d4dfa617d76c`). Zero active triggers. Nothing fires.

## 1. What is DONE (proven on live)

Every hard mechanism is solved and validated with working saves. Recipes recorded in `ghl_data/build_ids.json` (`write_api` section).

**Workflow lifecycle**
- Create: `POST /workflow/{loc}`  body `{name, parentId, type:"workflow", status:"draft"}` -> `{id}`
- Update metadata: `PUT /workflow/{loc}/{id}` (must include current `version` int)
- Save steps: `PUT /workflow/{loc}/{id}` with the FULL doc from a GET, then set `workflowData={"templates":[...]}` AND top-level `templates=[...]` AND `createdSteps`/`modifiedSteps`/`deletedSteps` diff arrays AND `version`. Read back via `workflowData.fileUrl`.
- Trigger write: `POST /workflow/{loc}/trigger` body `{workflowId, type (REQUIRED), name, conditions[], actions[], masterType:"highlevel", belongs_to:"workflow", active:false}` -> `{id}`. Update: `PUT /workflow/{loc}/trigger/{triggerId}`.

**Node types validated on live** (exact shapes in build_ids.json and in build_all_wf.py):
- `sms` — `attributes.body`, `attachments:[]`. Valid as a terminal node.
- `email` — `attributes.subject/html/type:"email"`.
- `wait` — `attributes.type:"time", startAfter:{type:"hour"|"day", value, when:"after"}`. NOTE: `minute` is REJECTED; a wait CANNOT be the terminal node (append a closing node).
- `internal_notification` — `attributes.type:"email", email:{userType,to,from_name,from_email,subject,body}`. (Plain `type:"internal_notification"` is rejected.)
- `add_contact_tag` — `attributes.tags:[...]`. Branch children set `parent` AND `parentKey` = branch.id.
- `if_else` — `attributes.branches[].segments[].conditions[]`; condition `{conditionType:"opportunity"|"contact_detail", conditionSubType:<fieldId>, conditionOperator:"=="|"is_any_of"|"is_empty", conditionValue, __conditionId}`. Nesting works (a child if_else with parent=branch.id).
- `internal_create_opportunity` — writes/updates the opportunity: `attributes{pipelineId, type, __customInputFields__:[{value, filterField, valueFieldType}], __customInputs__:{}}`; filterField = `pipelineStageId` | `status` | `name` | `custom_fields.<fieldId>`.
- `webhook` — `attributes{method, url, customData:[], headers:[]}`.

**WF-05 (keystone) is functionally complete**: appt_status gate -> nested sale_outcome router -> Sold writes Won + renewal_date + outcome_processed_at stamp + tag; A&D and MUT move to their lost stages + stamp; MAR tags and leaves the opp open; No-show/Cancel tags for WF-08. This is the P0 auto-Won defect fixed in structure.

## 2. Per-workflow state

See `wf_build_state.json` for the exact node list per workflow as it stands on live right now. Summary:

| WF | Messaging spine | Logic/data nodes | Remaining enrichment |
|----|----|----|----|
| 01 Lead Capture | done | partial | attribution capture (update_contact_field with per-field titles), Locations-object stamp, create_opportunity in New Lead, 24h booking if_else |
| 02 Non-Booked Recovery | done (13) | n/a | booking early-exit goal |
| 03 Booking + Reminders | done (10) | n/a | class-calendar trigger (defer), intake if_else, cancel exit |
| 04 Intake Chase | done | n/a | intake-complete exit |
| 05 Outcome Router | n/a | DONE | confirm merge tokens (won_date, right_now); add CAPI webhook to WF-13; MAR PCC task |
| 06 Post-Visit Won | done (6) | partial | NPS if_else on visit_feedback_score; review-request conditional |
| 07 A&D Nurture | done (8) | n/a | complete |
| 08 No-Show Recovery | done (8) | partial | rebook early-exit if_else |
| 09 Long-Term Nurture | done (7) | partial | renewal sub-flow reminders keyed on renewal_date |
| 10 Feedback Survey | placeholder | TODO | survey invite SMS + write visit_feedback_score |
| 11 Compliance | placeholder | BLOCKED | needs sms_consent_status field (see gaps) |
| 12 Call Disposition | done | DONE | disposition branch tree built |
| 13 Ad Conversions | done | DONE | 2 webhook conversions built |
| 14 Ambassador | done (3) | n/a | complete |
| 15 PCC Referral | done (3) | partial | create tracking opp in Referrals pipeline |
| 16 Comms Edge | done (4) | partial | IVR + missed-call if_else |

## 3. KNOWN GAPS (fix before go-live)

1. **`sms_consent_status` contact field does not exist.** WF-11's consent gate and every messaging workflow's consent filter depend on it. Create it (verify-then-create) as a Wave 0 addendum. Until then WF-11 holds a labeled placeholder.
2. **Merge-token syntax unconfirmed.** WF-05's Won-write uses `{{opportunity.won_date}}` and `{{right_now}}` as best-guess date tokens. Confirm GHL's exact date-merge/`right now` tokens before go-live so renewal_date and outcome_processed_at populate correctly.
3. **WF-01 attribution `{{inboundWebhookRequest.N}}` indices** are unknown until a real trigger exists on WF-01 and its payload is read back (sequencing rule: attach trigger -> read -> wire capture).
4. **Manual Call steps** are SMS placeholders (GHL has no pure API "call task" node captured yet).
5. **Sub-hour waits** were floored to 1 hour (GHL rejects minute waits) — revisit any T+2m/T+15m timings.
6. Triggers are deferred by design: attach all triggers + flip publish in one go-live pass.

## 4. How to continue (recommended: local Claude Code, auto-refresh JWT)

The remainder is repetition of proven patterns, not discovery. In a local session:
1. `python scripts/ensure_jwt.py` (auto-refresh, no manual token).
2. Read `ghl_data/build_ids.json` (all IDs + node recipes) and `wf_build_state.json` (current per-wf nodes).
3. Use `build_all_wf.py` as the messaging-spine builder and the enrichment snippets in this package as the logic-node templates.
4. Enrich remaining logic nodes per the table in section 2, saving via the proven PUT envelope, reading back each time to confirm.
5. Keep everything `status:"draft"`; do NOT attach live triggers or publish until the go-live pass.

## 5. Package contents
- `wf_enrichment_brief.md` (this file)
- `build_all_wf.py` — the 16-workflow messaging-spine builder
- `build_tobe_detail.py` — generates the SOP spec data the builder reads
- `wf_build_state.json` — exact live node state per workflow
- `build_ids.json` — all reference IDs + proven node/endpoint recipes
- `node_shapes.json` — real node shapes extracted from the 28 live production workflows
