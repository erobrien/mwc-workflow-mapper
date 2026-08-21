# to-be/STAGING.md - unpublished staging drafts

Snapshot 2026-08-20 PT of the staging drafts that correspond to
`to-be/wf-01.json` through `to-be/wf-17.json`. All 17 workflows are
`status: draft`. Published in this folder: none.

## Location

- Staging location: `zHKH8aRDdNq47oYmdsN1`
- Folder: `6039c39d-f82d-4518-998c-749fb1ae57d1`
- Production location `Ghstz8eIsHWLeXek47dk` is read-only from this folder.
- Staging Sales pipe: `ASnpfhu1hpSHUv0IFLc7`. Production Sales pipe
  `Vt8cPz51C3i87moo73gQ` must never appear in a staging draft.

## Send-window rule (Eric lock 2026-08-20 PT)

- Transactional SMS has no quiet hours. WF-01 welcome, WF-03 confirm
  and reminders, WF-04 intake chase, WF-06 welcome after SOLD, WF-07
  and WF-08 first logistics texts, and WF-11 STOP confirm all send
  immediately. Those drafts carry `window=None`.
- Marketing / recovery only uses the `08:00-21:00` contact timezone
  window, 7 days. Applies to WF-02 non-booked recovery and WF-10
  feedback.
- First SMS in a sequence includes Reply STOP to opt out.

## Draft-shell ID map

| Spec file | Staging draft name | Staging draft ID | Draft version | Summary |
| --- | --- | --- | --- | --- |
| `wf-01.json` | WF-01 Lead Capture and Attribution | `869782c6-00d6-4349-ab6e-4e0f2a98bd04` | v10 | trigger + find/create-once + slug stamps + welcome email + STOP SMS + 24h + WF-02; window=None (transactional) |
| `wf-02.json` | WF-02 Non-Booked Recovery | `5f973b3c-0375-4fc0-ace2-e13d1a1976b9` | v4 | SMS +3m/+1m/+5m/+15m + EML | WF-02 | Non-booked 24h + SMS 36h; ADD-TO-WF WF-09; window 08:00-21:00 contact TZ |
| `wf-03.json` | WF-03 Booking Confirmation and Reminders | `ec08cae5-3d1f-48bd-9a0d-444626d9a150` | v7 | 3 appointment triggers + tag v2_status_booked + confirm email + confirm SMS + appointment-relative reminders T-3d (EMAIL + SMS) / T-1d / T-5h / T-2h; window=None (transactional) |
| `wf-04.json` | WF-04 Medical Intake Chase | `4854e1cf-492d-4da8-ba23-5c14a4d04229` | v3 | wait 4h + SMS Intake +4h (STOP) + wait 20h + SMS Intake +20h; window=None (transactional) |
| `wf-05.json` | WF-05 Clinic Outcome Router | `45a0f21e-244c-4d66-8ee1-232567662624` | v5 | inbound_webhook + sale_outcome_v2 router; SOLD new also ADD-TO-WF WF-13 |
| `wf-06.json` | WF-06 Post-Visit Won and Onboarding | `5d036b8a-4336-47c8-9ebe-77f3439bc95c` | v3 | tag v2_status_active + SMS Welcome after SOLD (STOP) + 3d/7d/14d/21d check-in forks (still empty); window=None (transactional) |
| `wf-07.json` | WF-07 A&D / Post-Visit No-Sale Nurture | `01ca0908-36cf-456c-aa1d-04c999e0a598` | v3 | tag v2_outcome_ad + SMS After AD first touch + 35d + ADD-TO-WF WF-09; window=None (transactional) |
| `wf-08.json` | WF-08 No-Show and Cancel Recovery | `d35d04ac-0042-4e33-95dd-9253b2847bdf` | v3 | REMOVE-FROM-WF WF-03 + SMS Rebook after miss + 7d + SMS Rebook +7d + ADD-TO-WF WF-09; window=None (transactional) |
| `wf-09.json` | WF-09 Long-Term Nurture | `cbc14e90-4507-42cd-afcc-f7410d7f4554` | v2 | wait 120d |
| `wf-10.json` | WF-10 Feedback Survey | `37b1202a-5397-4e08-92da-bb638c862a2a` | v3 | SMS Feedback invite + EML | WF-10 | Feedback invite + WAIT 3d + SMS nudge; window 08:00-21:00 contact TZ (marketing) |
| `wf-11.json` | WF-11 Compliance and Errors | `9aab45f8-6f5b-467a-9f05-6981446c48f2` | v4 | IF sale_outcome_v2=MUT front-gate (true=MUT suppress only; false=STOP path); dnd_contact inbound (STOP) + REMOVE all + DND disable outbound + tag v2_status_dnd + sms_consent_status=opted_out + SMS STOP confirm; window=None (transactional) |
| `wf-12.json` | WF-12 Call Disposition Handler | `fa1c829c-5c6b-459a-81b9-19b737691a2c` | v2 | tag v2_source_phone |
| `wf-13.json` | WF-13 Ad-Platform Conversions | `9513a9c7-69c5-4f1c-9193-b371ab8d8253` | v2 | if sale_type=new tag v2_conv_won_new; no CAPI node yet |
| `wf-14.json` | WF-14 Ambassador Program | `6b090c34-cc66-43bf-8939-2868a6b8436b` | v2 | 1-step named shell |
| `wf-15.json` | WF-15 PCC Referral Routing | `158edd25-594d-4506-b021-c8acb7943969` | v2 | 1-step named shell |
| `wf-16.json` | WF-16 Comms Edge | `e68037b4-a8a2-427e-ba1c-8741ea615a3f` | v2 | 1-step named shell |
| `wf-17.json` | WF-17 Price Calculator | `e5fbb7f4-7fe6-4adf-8bf3-957c395a8495` | v2 | 1-step named shell |

## WF-01 (draft v10)

- Trigger `TRX0iF7txst2FcmA2odq`: `contact_created` + Has Tag
  `next-lander`. GHL stores `trigger.active=true`; the fire-stop is the
  workflow `status=draft`.
- Graph: `WAIT 10s` -> `FIND-OPP` create-once on staging Sales
  `ASnpfhu1hpSHUv0IFLc7` -> Found = last-touch placeholder,
  Not found -> `CREATE-OPP` Sales New Lead stage
  `31a81ba6-10c4-4033-8401-4e864ec9495c` (no monetaryValue) ->
  `IF-ELSE` on `contact.current_clinic_slug` with slug-to-label map for
  `opportunity.location XbaJOEsDwgxMtudnj5IG`:

  | Slug | Display label |
  | --- | --- |
  | `richmond` | `Richmond` |
  | `virginia-beach` | `Virginia Beach` |
  | `newport-news` | `Newport News` |

- Three Method 2 stamp arms. Values are taken from the live location
  pages; booking URLs use `book.menswellnesscenters.com/{slug}`; review
  links use Google Maps CIDs from the live listings.

  | Slug | Address | Phone | Booking URL | Review CID |
  | --- | --- | --- | --- | --- |
  | `richmond` | `4050 Innslake Drive Suite 360 Richmond VA 23060` | `(804) 346-4636` | `https://book.menswellnesscenters.com/richmond` | `2277296049943963626` |
  | `virginia-beach` | `996 First Colonial Road` | `(757) 612-4428` | `https://book.menswellnesscenters.com/virginia-beach` | `5476441419759027703` |
  | `newport-news` | `827 Diligence Drive Suite 206` | `(757) 806-6263` | `https://book.menswellnesscenters.com/newport-news` | `605398627804676801` |

- After the stamp arms, on the create path only, the draft now sends:
  - `EMAIL` welcome using native template
    `j7C8MVs6cAIuH5zPUjzH` (`EML | WF-01 | Welcome`).
  - `SMS` welcome (inline) that carries the `STOP` opt-out.
  - Send window: `None` (transactional; no quiet hours).
- Then `WAIT 24 hour` (GHL unit is singular `hour`, not `hours`) ->
  `ADD-TO-WF` WF-02 `5f973b3c-0375-4fc0-ace2-e13d1a1976b9`.

Method 2 contact field IDs on staging (unchanged from the prior
snapshot):

| Contact field | Staging field ID |
| --- | --- |
| `current_clinic_address` | `a2v4CqA8zXaZ0iu901f6` |
| `current_clinic_phone` | `k7ci7d1rnExhAVtEE768` |
| `current_booking_url` | `W74Kznhixhaq5sJWbk4r` |
| `current_review_link` | `5WQWnA1nuMn0SWwTLxKR` |

Tag `next-lander` on staging: `EA2hrrIHTrlFvEEt6RzH`. Do not rename.
Opportunity field `opportunity.location XbaJOEsDwgxMtudnj5IG` display
labels stay unchanged while 2bv2 is published.

## WF-02 (draft v4)

- No trigger on the shell. Enrollment is `ADD-TO-WF` from WF-01 only.
- Graph: `SMS +3m` (inline) -> `WAIT 3m` -> `WAIT 1m` -> `SMS +1m`
  (inline) -> `WAIT 5m` -> `SMS +5m` (inline) -> `WAIT 15m` ->
  `SMS +15m` (inline) -> `EMAIL` using native template
  `bPj39XTcKv2HylGKEUdG` (`EML | WF-02 | Non-booked 24h`) ->
  `WAIT 12h` -> `SMS 36h` (inline) -> `ADD-TO-WF` WF-09
  `cbc14e90-4507-42cd-afcc-f7410d7f4554`.
- Send window: `08:00-21:00` contact timezone (marketing / recovery).

## WF-03 (draft v7)

- Three appointment triggers, one per consult calendar:

  | Clinic slug | Calendar ID |
  | --- | --- |
  | `richmond` | `1Cfy5JnO2A4ggiZlMVvX` |
  | `virginia-beach` | `4xmnBGMWJ6TVUKcAPpPb` |
  | `newport-news` | `lBaRbjUpEmesxEloFBME` |

- Graph: `REMOVE-FROM-WF` WF-02
  `5f973b3c-0375-4fc0-ace2-e13d1a1976b9` -> `ADD-TAG v2_status_booked`
  (`NR1KZuPH1xzWOuu0pHd4`) -> `EMAIL` confirm using native template
  `GUs77konNdAGFS0EFZS2` (`EML | WF-03 | Confirm appointment`) ->
  `SMS` confirm (inline) -> `WAIT 1h` -> `ADD-TO-WF` WF-04
  `4854e1cf-492d-4da8-ba23-5c14a4d04229` -> appointment-relative
  reminders `T-3d` / `T-1d` / `T-5h` / `T-2h` before appointment, each
  wait followed by an inline SMS.
- All four reminder waits use the 2bv2 shape:
  `type=appointment`, `appointmentStartAfter.when=before`,
  `appointmentStartAfter.type=minutes`, and
  `appointmentCondition=skip` (skip the wait if the appointment is
  already inside the window at enroll):

  | Reminder | Wait value (minutes) | Distributed unit |
  | --- | --- | --- |
  | `T-3d` | `4320` | days |
  | `T-1d` | `1440` | days |
  | `T-5h` | `300` | hours |
  | `T-2h` | `120` | hours |

- Reminder SMS bodies reference the Method 2 stamps only:
  `{{contact.current_clinic_address}}`,
  `{{contact.current_clinic_phone}}`, and
  `{{contact.current_booking_url}}`. Do not use `{{location.name}}`.
- After the `T-3d` wait fires, the draft now sends an `EMAIL` using
  native template `QcpX2V3OarwL5jKN6OFE`
  (`EML | WF-03 | T-3d reminder`) before the existing `T-3d` inline
  SMS. The `T-1d`, `T-5h`, and `T-2h` reminders are SMS-only.
- Appointment-relative wait shape and values (`4320` / `1440` / `300`
  / `120` minutes, `appointmentCondition=skip`) are unchanged.
- Send window: `None` (transactional; no quiet hours). Confirm email
  `GUs77konNdAGFS0EFZS2` and confirm SMS are unchanged.

## WF-04 (draft v3)

- Graph: `WAIT 4h` -> `SMS Intake chase +4h` (inline, carries `STOP`
  opt-out) -> `WAIT 20h` -> `SMS Intake chase +20h` (inline).
- Enrolled by WF-03; no other trigger.
- There is no dedicated intake URL field yet; both SMS use
  `{{contact.current_booking_url}}` as the "manage / complete intake"
  link.
- Send window: `None` (transactional; no quiet hours). Nothing
  published.

## WF-05 (draft v5)

- Trigger `ryJLJ1McWWOHlAvBRsI3`: `inbound_webhook`. Webhook URL is not
  returned by the GHL GET; treat the URL as a secret held on the
  workflow, not on this file.
- Confirmed 2026-08-20 PT: inbound-webhook URLs are not present in the
  JWT GET trigger payload even on published 2bv2 `inbound_webhook`
  workflows. The WF-05 webhook URL is UI-only; stop treating the GET
  response as the source for it.
- Graph: `WAIT 60s` -> `FIND-OPP` (find only, no create) ->
  `IF-ELSE` on `appt_status` first (`no-show` / `cancel` / `reschedule`)
  before outcome routing.
- Outcome routing is keyed on `opportunity.sale_outcome_v2`
  (`SOLD | AD | MUT | MAR`). Do not route on the legacy
  `contact.sale_outcome` labels; those old labels are read-only here.
- `MAR` drops out of the router (does not fire any downstream WF).
- Downstream routing:

  | `sale_outcome_v2` | Extra guard | Route |
  | --- | --- | --- |
  | `SOLD` | `sale_type=new` | `ADD-TO-WF` WF-06 `5d036b8a-4336-47c8-9ebe-77f3439bc95c` + `ADD-TO-WF` WF-13 `9513a9c7-69c5-4f1c-9193-b371ab8d8253` |
  | `SOLD` | else (renewal or unset) | `ADD-TO-WF` WF-09 `cbc14e90-4507-42cd-afcc-f7410d7f4554` |
  | `AD` | - | `ADD-TO-WF` WF-07 `01ca0908-36cf-456c-aa1d-04c999e0a598` |
  | `MUT` | - | `ADD-TO-WF` WF-11 `9aab45f8-6f5b-467a-9f05-6981446c48f2` |
  | `MAR` | - | drop |

## WF-06 (draft v3)

- Graph: `ADD-TAG v2_status_active` (`P5yoBUi86hQs0Br5CIqI`) ->
  `SMS Welcome after SOLD` (inline; references
  `{{contact.current_clinic_address}}` and
  `{{contact.current_clinic_phone}}`; carries `STOP` opt-out) ->
  `WAIT 3d` -> `WAIT 7d` -> `WAIT 14d` -> `ADD-TO-WF` WF-10
  `37b1202a-5397-4e08-92da-bb638c862a2a` -> `WAIT 21d` -> `ADD-TO-WF`
  WF-14 `6b090c34-cc66-43bf-8939-2868a6b8436b`.
- The four check-in waits (`3d`, `7d`, `14d`, `21d`) still have no
  outbound copy between them; only the fork-outs to WF-10 and WF-14 are
  authored.
- Send window: `None` (transactional; no quiet hours). Nothing
  published.

## WF-07 (draft v3)

- Graph: `ADD-TAG v2_outcome_ad` -> `SMS After AD first touch`
  (inline; carries `STOP` opt-out) -> `WAIT 35d` -> `ADD-TO-WF` WF-09
  `cbc14e90-4507-42cd-afcc-f7410d7f4554`.
- No objection-branch copy authored yet (`v2_objection_price`,
  `v2_objection_timing`, `v2_objection_fit`, `v2_objection_other`
  remain spec-only).
- Send window: `None` (transactional; no quiet hours). Nothing
  published.

## WF-08 (draft v3)

- Graph: `REMOVE-FROM-WF` WF-03
  `ec08cae5-3d1f-48bd-9a0d-444626d9a150` -> `SMS Rebook after miss`
  (inline; carries `STOP` opt-out) -> `WAIT 7d` -> `SMS Rebook +7d`
  (inline) -> `ADD-TO-WF` WF-09 `cbc14e90-4507-42cd-afcc-f7410d7f4554`.
- No `v2_appt_no_show` / `v2_appt_cancel` tag split authored yet;
  the graph is a single lane covering both `appt_status` values.
- Send window: `None` (transactional; no quiet hours). Nothing
  published.

## WF-09 (draft v2)

- Graph: `WAIT 120d`. Renewal_date trigger remains blocked until
  backfill (spec in `to-be/wf-09.json`).

## WF-10 (draft v3)

- Graph: `SMS Feedback invite` (inline; references
  `{{contact.current_review_link}}`) -> `EMAIL` invite using native
  template `BFhyqVQXEYVasm4hJWvE` (`EML | WF-10 | Feedback invite`)
  which also uses `{{contact.current_review_link}}` -> `WAIT 3d` ->
  `SMS Feedback nudge` (inline).
- Send window: `08:00-21:00` contact timezone (marketing / feedback).
- Enrolled from WF-06 at T+14; no other trigger. Nothing published.

## WF-11 (draft v4)

- Trigger `gpdYb7c2Dkkt3tYJnClP`: inbound `dnd_contact` (`STOP` inbound
  SMS). GHL stores `trigger.active=true`; the fire-stop is the workflow
  `status=draft`. `targetActionId` retargeted to the new front-gate
  `IF-ELSE` step (see below); the `STOP` path lives on the false branch.
- Front gate (added at the top so WF-05 MUT routing does not get treated
  like a `STOP`): `IF-ELSE sale_outcome_v2 = MUT`.
  - True branch: `WAIT 1s` (MUT suppress only). Must not enable DND, must
    not tag `v2_status_dnd`, must not flip `sms_consent_status`, must not
    send the STOP-confirm SMS.
  - False branch (existing STOP path): `REMOVE-FROM-WF` all workflows ->
    `SET-DND` disable outbound channels -> `ADD-TAG v2_status_dnd` ->
    `SET-FIELD sms_consent_status = opted_out` -> `SMS STOP confirm`
    (inline).
- Reason for the gate: WF-05 enrolls `MUT` outcomes into WF-11, but the
  STOP-confirm SMS and `opted_out` write must not apply to MUT.
- Send window: `None` (transactional; no quiet hours). Nothing
  published.

## WF-12 (draft v2)

- Graph: `ADD-TAG v2_source_phone` (`HuqiCRyopgdHESALDnKN`).

## WF-13 (draft v2)

- Graph: `IF-ELSE sale_type = new` -> `ADD-TAG v2_conv_won_new`
  (`fUVvRU2P4aQl1VKA7muT`). No native Meta CAPI or Google Ads
  conversion node authored yet.

## WF-14..WF-17 (draft v2 each)

- 1-step named shells only. IDs:

  | Spec file | Staging draft ID |
  | --- | --- |
  | `wf-14.json` | `6b090c34-cc66-43bf-8939-2868a6b8436b` |
  | `wf-15.json` | `158edd25-594d-4506-b021-c8acb7943969` |
  | `wf-16.json` | `e68037b4-a8a2-427e-ba1c-8741ea615a3f` |
  | `wf-17.json` | `e5fbb7f4-7fe6-4adf-8bf3-957c395a8495` |

## Tags created on staging

The following `v2_*` tags now exist on staging (WF that authors each
appears in parentheses; some tags exist for future use only):

- `v2_status_booked NR1KZuPH1xzWOuu0pHd4` (WF-03)
- `v2_status_active P5yoBUi86hQs0Br5CIqI` (WF-06)
- `v2_source_phone HuqiCRyopgdHESALDnKN` (WF-12)
- `v2_conv_won_new fUVvRU2P4aQl1VKA7muT` (WF-13)
- `v2_outcome_sold` (WF-05)
- `v2_outcome_ad` (WF-05)
- `v2_outcome_mut` (WF-05)
- `v2_status_noshow` (WF-05 / WF-08 target)
- `v2_status_cancelled` (WF-05 / WF-08 target)
- `v2_status_dnd` (WF-11)
- `v2_email_bounced` (WF-11)
- `v2_bad_number` (WF-11 / WF-12)
- `v2_temp_hot`
- `v2_temp_warm`
- `v2_temp_cold`

## Leftover empty click-draft (do not delete)

| Item | ID |
| --- | --- |
| New Workflow : 1787278740085 | `e53732be-5fe7-4460-bd78-23f46e8d2a63` |

Leave this leftover draft alone. Do not delete, rename, or repurpose it.

## What is and is not built

- **Built**: the 17 shells above, this repo's `to-be/wf-*.json` spec
  files, and the on-shell graphs summarized per workflow.
- **Not built**: SMS or email steps on WF-09; check-in copy between
  the WF-06 3d/7d/14d/21d waits; the WF-07 objection-branch copy
  (`v2_objection_*`); the WF-08 no-show vs cancel tag split; the CAPI
  and Google Ads conversion nodes on WF-13; full step bodies on
  WF-14..WF-17; a dedicated intake URL field (WF-04 currently reuses
  `contact.current_booking_url`).
- **Not built**: `extract-diff`. When it lands, it will read
  `to-be/wf-*.json`, look up the matching shell ID from this file, and
  author steps inside the shell. It will never publish. It will never
  touch production `Ghstz8eIsHWLeXek47dk`.

## Locks reiterated

- Force enums stay `sale_outcome ∈ {SOLD, AD, MUT, MAR}` (AD = Advise &
  Decline). `MAR` does not fire WF-05.
- WF-05 routes on `opportunity.sale_outcome_v2` only; the legacy
  `contact.sale_outcome` labels are not used for routing.
- Clinic slugs stay `richmond | virginia-beach | newport-news`. Method
  2 `current_clinic_*` writes only in WF-01.
- WF-01 trigger stays Contact Created + Has Tag `next-lander`. No
  source filter. `wordpress-form` is only an inner branch. Empty source
  defaults to `next-lander`.
- Staging writes use staging IDs only. Production Sales pipe
  `Vt8cPz51C3i87moo73gQ` must never appear in a staging draft.
- No GHL API writes from this repo. No publish.
