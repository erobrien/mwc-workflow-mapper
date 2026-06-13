# MWC Revenue-Integrity Monitor

A **read-only** (GET-only) watchdog over the live MWC GHL location. It exists to make
every workflow change *observed safe*, not just *designed safe* — it is the runtime
assertion behind the migration plan's gates.

## What it watches (4 metric families, vs a 7-day rolling baseline)

1. **New opportunities** — new business entering the funnel (windowed, reliable).
2. **Appointments booked + show rate** — by booking cohort, per location. The **show-rate
   line is the auto-confirm canary**: it alerts on a ≥5-point drop.
3. **Opportunities Won + Σ revenue** — does money still flow as expected.
4. **Won-with-$0** — the **A&D regression guard**. Any won opportunity with $0 value is the
   signature of the `05` A&D-Won defect. Target after the fix: **0**.

It also breaks Won down by pipeline, so you can watch A&D's fake-win count fall to zero as
slice D ships.

## Run

```bash
python monitor/collect.py            # daily snapshot (24h window) -> appends history, writes report
python monitor/collect.py --hourly   # 1h window — use during cutover windows (capture/conversions)
python monitor/collect.py --report   # regenerate report from history only (no API calls)
```

Output:
- `monitor/reports/latest.md` — newest report (alerts at top)
- `monitor/reports/report-YYYYMMDD-HHMM.md` — dated copy
- `monitor/data/history.jsonl` — append-only snapshot log (the baseline source)

## Reading it

- **Day 1 shows 0% drift** because current == baseline (only one snapshot). Drift becomes
  meaningful after ~3 days of history. The **won-with-$0** alert is absolute, so it fires
  immediately (and currently does — the A&D bug is live).
- 🔴 in the report = a metric breached threshold (10% drift, or 5-pt show-rate drop).
- During the auto-confirm watch, run it **daily** and read the show-rate line + the
  per-cohort table.
- During Slice C (lead capture / conversions cutover), run it **hourly** and watch
  *New opportunities* and *Appointments booked* for a sudden gap = capture break.

## Cadence (recommended)

| Phase | Cadence | Why |
|---|---|---|
| Now (auto-confirm watch) | daily | 2-week show-rate trend |
| Normal operations | daily | drift detection |
| Active cutover slice | hourly | catch a capture/conversion break in minutes, not at close |

To automate, schedule `python monitor/collect.py` once a day (Task Scheduler / cron), and
switch to a 1-hour interval only during an active cutover window.

## Safety

Every HTTP call is `method="GET"`. There is no code path that POSTs, PUTs, PATCHes, or
DELETEs anything. Running this cannot change the GHL account. The token lives in
`config.json` (not committed to any public remote).

## Current readout (first snapshot)

- New opportunities / 24h: **81**
- Appointments booked / 24h: **34** · show rate **62.5%**
- Won / 24h: **21**, **$57,700**
- 🔴 Won-with-$0: **10** — and **17 of 21 wins are A&D-pipeline wins ($47,300, 8 of them $0)**.
  This is the defect producing corrupt wins *right now*; the monitor will show this number
  collapse the day slice D ships.
