# MWC Migration Database

A SQLite database (`db/mwc.db`) that is the **single source of truth** for executing the
38→16 workflow consolidation. The message library lives here — every SMS and email is
**preserved and versioned in the DB before any legacy workflow is paused**, so nothing
is lost in the cutover. Scripts read/write this DB; they never juggle loose JSON.

## Why a database

The pressure test flagged that the migration *itself* is the risk surface. A DB makes the
plan **stateful and auditable**: what maps to what, which message came from where, which
gates passed, what's been built. You can answer "did we preserve the Richmond reminder
copy?" with a query instead of trusting a screenshot.

## Tables

| Table | What it holds |
|---|---|
| `messages` | **The message library.** Every SMS/email, with `origin` = `spec` (authored), `captured` (copied verbatim from a legacy workflow before it's paused), or `builder` (email-builder template). Versioned with `status` + `brand_ok`. |
| `target_workflows` | The 16 consolidated workflows + their build slice and `build_status`. |
| `source_workflows` | The 38 published workflows, each mapped to a target with a disposition (merge/retire/keep). |
| `email_builder_templates` | The 7 email-builder templates pulled live, preserved raw. |
| `stage_map` | Old→new opportunity stage/status mapping for the backfill. |
| `gates` | Every gate from the prompt guide; nothing advances until its gate passes. |
| `frozen_tags` | The dormant engine's tag surface — never rename/delete. |
| `audit_log` | Append-only record of every mutation the app makes. |

## Setup / refresh

```bash
python db/seed.py        # creates + seeds db/mwc.db (idempotent; safe to re-run)
```

Seeds from: the build-book data model (16 targets + sources + message copy), the live API
snapshots in the repo (`audit/workflows.json`, `db/email_builders.json`), and the frozen tags.

## CLI

```bash
python db/mwc.py status                  # dashboard: build status + message counts + gates
python db/mwc.py wf 03                    # one workflow: sources it combines + its messages
python db/mwc.py messages --nn 04         # full message bodies
python db/mwc.py lint                     # brand-voice check (writes brand_ok per message)
python db/mwc.py export db/export         # dump messages.md + messages.csv

# preserve a legacy message before pausing its workflow (THE key safety step):
python db/mwc.py capture 03 sms "T-24h reminder" "exact body..." --from "03. Appointment Booked"

python db/mwc.py approve 12               # mark a message approved
python db/mwc.py set-status 03 built      # advance a workflow's build status
python db/mwc.py gate slice-B pass "1wk soak, show rate +1pt"   # record a gate decision
python db/mwc.py gates                    # gate board
```

## The capture discipline (don't skip)

During each browser build slice, before pausing any legacy workflow, **capture its live
message copy into the DB** with `mwc.py capture ... --from "<workflow>"`. That row is the
proof the copy was preserved. The cutover checklist for a slice is not complete until every
absorbed workflow's messages are either captured or explicitly marked superseded by a `spec`
message. This is how "pause the old workflow" becomes safe.

## Brand-voice lint

`mwc.py lint` enforces the engine's rules (no "free"/"patient"/"clinic", no em-dashes, plain
URLs, no urgency theatre, required footer). It already caught and fixed 15 spec messages that
used em-dashes before the footer — those are now periods. Re-run after any `capture` to keep
the whole library compliant before publish.

## Current state

- 16 target workflows · 38 sources mapped · **26 messages** (21 SMS, 5 email), all brand-clean
- 7 email-builder templates preserved · 12 frozen engine tags · 12 gates pending
- Exports: `db/export/messages.md`, `db/export/messages.csv`

## Note on what's NOT yet in the DB

The legacy workflows' **internal message bodies** are not auto-extractable (GHL has no
workflow-read API, and the earlier extraction returned 0 steps). Those get added via
`mwc.py capture` during the browser build pass — which is exactly when you're looking at
them on the canvas anyway. The DB holds the *target* copy now; it accumulates the *captured*
legacy copy as each slice is built.
