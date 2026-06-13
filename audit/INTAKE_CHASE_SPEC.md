# Build Spec — Medical Intake Chase (replaces confirmation chase)

**Context:** As of 2026-06-12, all 3 calendars (Richmond `1Cfy5JnO2A4ggiZlMVvX`, Virginia Beach `4xmnBGMWJ6TVUKcAPpPb`, Newport News `lBaRbjUpEmesxEloFBME`) have `autoConfirm = true` (changed via API, verified). New bookings are born **Confirmed** — the confirmation chase is obsolete. The chase budget moves to **medical intake completion** at `bookmwc.com/intake`.

---

## New workflow: `04c. Intake Chase — Pre-Visit`

**Trigger:** Customer Booked Appointment — calendar is any of: Book in Richmond / Book in Virginia Beach / Book in Newport News.
(With autoConfirm on, booked = confirmed; no status filter needed.)

**Guard (first If/Else):** contact already has intake done → exit.
- Condition: tag `intake_completed` exists OR Medical Intake survey submitted → **End**.

**Sequence (all times relative to booking; respect 9am–7pm send window):**

| When | Channel | Message |
|---|---|---|
| +15 min | SMS | "Hi {{contact.first_name}}, you're confirmed at Men's Wellness Centers. One step before your visit: please complete your brief medical intake so your provider can prepare. bookmwc