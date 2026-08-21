# to-be/ - source of truth for MWC GHL rebuild

This folder is the spec-as-code the rest of the repo will diff against.
It is intentionally boring: JSON per workflow, one schema, one contract.

## What lives here

| File | Purpose |
| --- | --- |
| `SPEC.md` | The locked contract. Read first. |
| `schema.json` | JSON schema for one `wf-NN.json`. |
| `wf-01.json` … `wf-17.json` | One file per workflow (17 total). |
| `STAGING.md` | Map from spec file to unpublished staging draft-shell ID. |
| `README.md` | This file. |

## What extract-diff will do (later, not now)

`extract-diff` (added in a follow-up PR) will:

1. Load every `to-be/wf-*.json` and validate against `to-be/schema.json`.
2. Load the current production extract from `ghl_data/workflow_steps/` and
   `ghl_data/workflows.json` (production location
   `Ghstz8eIsHWLeXek47dk`, read-only).
3. Diff each named step by `named_steps[*].name` (exact match on the
   `TYPE: Purpose (qualifier)` string). The step name is the join key,
   the comment is metadata only.
4. Emit a plan describing what must be created, moved, retitled, or
   deleted to reach the to-be shape.
5. Author unpublished drafts in staging location
   `zHKH8aRDdNq47oYmdsN1`, inside folder
   `6039c39d-f82d-4518-998c-749fb1ae57d1`.

Extract-diff never touches production. Extract-diff never publishes.
Publish is a manual step in the GHL UI after human review.

## Rules for authors of files in this folder

- Do not overwrite anything in `ghl_data*/` (production extracts).
- Do not add credentials or PIT/JWT tokens.
- Do not invent new architecture: match `SPEC.md`.
- Do not introduce a `custom_code` action or a new Supabase table.
- New tags must be `v2_*`.
- Never rename live tags: `next-lander`, `LOC_TAGS`, `sms-consent`,
  engine tags, `funnel_entry_*`, `location_*`.
- Every step name must match `^[A-Z][A-Z0-9\-]*:\s.+$` and every step
  must carry a one-line `comment` that states why the step exists and
  what it must not write.

## Validation (local, no GHL API)

Any JSON validator against `schema.json` works. Example with `check-jsonschema`:

```bash
pipx run check-jsonschema --schemafile to-be/schema.json to-be/wf-*.json
```

## Related repo folders

- `ghl_data/` - production extract (read-only reference).
- `ghl_data_build/`, `ghl_data_cody/`, `ghl_data_prod_r1/` - historical
  extracts (also read-only from here).
- `scripts/` - extractors that populate `ghl_data*/` from live GHL. Not
  used by files in this folder.
