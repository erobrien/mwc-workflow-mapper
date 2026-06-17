# Revenue Backfill Map — contact → opportunity

Source of truth for moving the live sale/visit data off the Contact and onto the
Opportunity (where revenue is recognized). Generated from the live field crawl
2026-06-16. Direction: **copy contact value → matching opportunity field on that
contact's opportunity, then freeze the contact field.** Never delete a contact
field before its data is backfilled.

Set `opportunity.monetaryValue = Total Program Amount` at the same time (that is
the number GHL sums for revenue).

## Direct copies (no value translation)
| Contact field | → Opportunity field | Type |
|---|---|---|
| `contact.total_program_amount` (1,033) | `opportunity.total_program_amount` + `monetaryValue` | money |
| `contact.treatment_cost` "Price Item 1" (582) | `opportunity.price__item_1` | money |
| `contact.price__item_2` (9) / `price__item_3` (0) | `opportunity.price__item_2` / `__item_3` | money |
| `contact.consultation_fee` (505) | `opportunity.consultation_fee` | money |
| `contact.patient_advisor` (4,237) | `opportunity.patient_care_consultant_pcc` | text |
| `contact.provider_making_recommendation` (1,046) | `opportunity.provider_making_recommendation` | text |
| `contact.term_length__item_1/2/3` (579/16/0) | `opportunity.term_length__item_1/2/3` | confirm option parity |
| `contact.preferred_appointment_date` (8) | `opportunity.preferred_appointment_date` | date |
| `contact.cancellation_reason` (9) | `opportunity.cancellation_reason` | dropdown (confirm) |
| `contact.service_interested_in` (4) | `opportunity.service_interested_in` | multi (confirm) |
| `contact.preferred_appointment_time` (4) | `opportunity.preferred_appointment_time` | dropdown (confirm) |

## Dropdown value-translations (REQUIRE decisions)
The June-14 opportunity dropdowns were created with generic slug options that do
**not** match the business vocabulary already on the Contact. Either (a) redefine
the opportunity option sets to the real vocabulary (recommended — closer to 1:1),
or (b) translate per the tables below. Flagged rows need your decision.

### Sale Outcome — `contact.sale_outcome` → `opportunity.sale_outcome`
| Contact value | → Opportunity |
|---|---|
| Sold | `sold` |
| A&D (Advised and Declined) | `no_sale` |
| MUT (Medically Untreatable) | `mut` |
| MAR (Medical Approval Required) | `undecided`  ⚠ confirm (or add an `mar` option) |

### No-Sale Reason — `contact.ad_reason` (426) → `opportunity.nosale_reason`
| Contact value | → Opportunity |
|---|---|
| Cost / Price Objection | `nosale_cost` |
| Not Ready / Think it Over / Sleep On It | `nosale_timing` |
| Not Interested | `nosale_decision` |
| Not Qualified / MU | `nosale_medical` |
| Others / Type an option | `nosale_other` |
| (no contact source) | `nosale_fear`, `nosale_partner` exist on opp but unused ⚠ |

### Pay Type — `contact.pay_type` (577) → `opportunity.pay_type`  ⚠ BIGGEST DECISION
Neither the contact options nor the opp options match your daily sheet
(**PIF / SF / CARE / MAG**). Recommend redefining `opportunity.pay_type` options to:
`PIF, SF (SoFi/financing), CARE (CareCredit), MAG (Magwitch), Cash, Credit Card, UMC, Other`
then translate:
| Contact value | → Opportunity |
|---|---|
| Magwitch | `MAG` |
| SFC | `SF` |
| CARECredit | `CARE` |
| UMC | `UMC` |
| Cash | `Cash` |
| Credit Card | `Credit Card` |
| Other | `Other` |
| **PIF** | not captured on Contact — where does PIF come from today? ⚠ |

### Product Sold — `contact.treatment_type` (561) → `opportunity.product_sold__item_1`
Opp options are coarse buckets; contact carries specific programs. Decide whether
to keep buckets or expand the opp options to the real program names.
| Contact value | → Opportunity (bucket) |
|---|---|
| TRT / THRT | `trt` |
| ED RX | `ed` |
| Semaglutide / Tirzepatide / MEB Weight Loss | `weight_mgmt` |
| Medication Management Program / MEB Energy Boost | `supplements` ⚠ confirm |
| ICP | `other` ⚠ confirm |
| Other / "- -" | `other` |
(`contact.product_sold__item_2/3` → opp `__item_2/3`, same map)

### Sale Type — `contact.sale_type` (35) → `opportunity.sale_type`
| Contact value | → Opportunity |
|---|---|
| New | `new` |
| Renewal | `renewal` |
| CancelNo-Show | ⚠ not a sale type — route to Sale Outcome / disposition instead |

### Primary Concern — `contact.primary_concern` (35) → `opportunity.primary_concern`
| Contact value | → Opportunity |
|---|---|
| Low Energy / Fatigue | `fatigue` |
| Low Sex Drive / ED | `ed` |
| Weight Gain / Difficulty Losing Weight | `weight` |
| Other | `other` |

## Open decisions before the dry-run
1. **Pay Type** — confirm the canonical option set (PIF/SF/CARE/MAG/Cash/Credit/UMC/Other) and where **PIF** is sourced from today.
2. **Sale Outcome** — MAR → `undecided` or add an `mar` option?
3. **Product Sold** — keep coarse buckets or expand opp options to real program names?
4. **Sale Type** — what to do with `CancelNo-Show` (it's an outcome, not a sale type).
5. **Which opportunity** — when a contact has multiple opps, which one receives the backfill (most recent in a sales pipeline? matched by appointment date?).

Once these are decided, the next step is an **idempotent dry-run** that writes a
per-opportunity CSV of proposed changes (no writes), reconciled so
Σ before = Σ after, for human review — exactly as the plan's Step 2 specifies.
