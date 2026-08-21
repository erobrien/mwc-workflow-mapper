# MWC GHL to-be - Named-Step Contract

Source of truth for the MWC GoHighLevel rebuild. Later, `extract-diff` reads the
files in this folder to author unpublished drafts in the staging location.
Nothing in this folder publishes, calls the GHL API, or edits production.

- Staging drafts: location `zHKH8aRDdNq47oYmdsN1`, folder
  `6039c39d-f82d-4518-998c-749fb1ae57d1`.
- Production location `Ghstz8eIsHWLeXek47dk` is read-only from here.
- No credentials in the repo. No `custom_code`. No new Supabase.

## Locked constraints (do not contradict)

- Native GHL only. No `custom_code` action, no new Supabase table, no path that
  requires the Success-At-Close (SAC) leg.
- New tags are `v2_*`. Never rename live tags: `next-lander`, `LOC_TAGS`,
  `sms-consent`, engine tags, `funnel_entry_*`, `location_*`.
- WF-01 enroll = Contact Created **and** tag `next-lander` ONLY. No source
  filter on the trigger. WordPress handoff runs
  `/api/handoff/wordpress` → `/api/qualify` upsert. The source
  `wordpress-form` exists only as an inner branch. Qualify never creates a
  Sales opportunity.
- Clinic slugs: `richmond | virginia-beach | newport-news`. Method 2
  `current_clinic_*` fields are stamped in **WF-01 only**.
- Force writes: `sale_outcome ∈ {SOLD, AD, MUT, MAR}`,
  `sale_type ∈ {new, renewal}`, `appt_status ∈ {showed, no-show, cancel,
  reschedule}`. WF-05 routes only. Workflows never move opportunity stages.
  `MAR` does not fire WF-05.
- Emails use native templates named `EML | WF-NN | Purpose`. SMS bodies are
  inline in the workflow.
- Every step is named `TYPE: Purpose (qualifier)` and carries a one-line
  comment.
- The WordPress CID bridge (WPCode snippet 11461) is not changed.
- Opportunity settings: `Allow Duplicate Opportunities = ON` **plus** a
  create-once guard inside every workflow that creates opps.
- Four pipelines. NEW leads land in `Sales Lead to Close`
  (`Vt8cPz51C3i87moo73gQ`).
- Transactional SMS has no quiet hours (WF-01 welcome, WF-03 confirm and
  reminders, WF-04 intake chase, WF-06 welcome after SOLD, WF-07 and
  WF-08 first logistics texts, WF-11 STOP confirm). Marketing and
  recovery only uses `08:00-21:00` contact timezone, 7 days (WF-02
  non-booked recovery, WF-10 feedback). First SMS in a sequence
  contains `STOP` opt-out language.
- Copy rules: members not patients, clinic not office, no-cost not free,
  no em-dashes, no `guy`.

## File layout

```
to-be/
  SPEC.md              this file
  schema.json          JSON schema for one wf-NN.json
  README.md            how extract-diff consumes this folder
  wf-01.json ...       one file per workflow (WF-01 through WF-17)
```

## Workflow-file shape

```jsonc
{
  "id": "wf-01",
  "name": "Lead Capture",
  "job": "one-line purpose",
  "trigger": {
    "type": "GHL trigger type",
    "filters": ["human-readable filters"]
  },
  "named_steps": [
    { "name": "TYPE: Purpose (qualifier)", "comment": "why + must not write" }
  ],
  "tags_new": ["v2_..."],
  "live_tags_readonly": ["next-lander", "..."]
}
```

- `named_steps[*].name` is the exact step title in GHL. Must start with a
  GHL action `TYPE:` (for example `TRIGGER:`, `WAIT:`, `SMS:`, `EMAIL:`,
  `ADD-TAG:`, `REMOVE-TAG:`, `SET-FIELD:`, `IF-ELSE:`, `CREATE-OPP:`,
  `ADD-TO-WF:`, `REMOVE-FROM-WF:`, `WEBHOOK:`, `FIND-OPP:`, `UPDATE-OPP:`).
- `named_steps[*].comment` states the intent and what the step must not
  write (for example must-not-write dollars, stages, `next-lander`,
  `location_*`).
- `tags_new` is the `v2_*` set this workflow may write.
- `live_tags_readonly` is the set of existing tags the workflow may read
  or branch on but must never rename or remove.

## Naming conventions

- Emails: native template named `EML | WF-NN | Purpose`.
- SMS: inline body, quiet-hours honored, first message contains `STOP`.
- Custom-value refs: `{{ custom_values.mwc_v2.<name> }}`.
- Custom-field refs: `{{ contact.<slug> }}` / `{{ opportunity.<slug> }}`.

## Extract-diff behavior (later, not now)

- Extract-diff will treat each `wf-NN.json` as the desired to-be shape.
- It will author drafts in staging location `zHKH8aRDdNq47oYmdsN1` inside
  folder `6039c39d-f82d-4518-998c-749fb1ae57d1`.
- It will never touch production `Ghstz8eIsHWLeXek47dk`.
- It will never publish. Publish is a human step in the GHL UI.
