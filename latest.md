# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-28T12:34:05+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **82** | 89 |  (-7.9% vs baseline) |
| Appointments booked | **27** | 41 |  🔴 **-34.1%** vs baseline |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **27** | 16 |  🔴 **+68.8%** vs baseline |
| Won revenue | **58600.0 $** | 47899.0 $ |  🔴 **+22.3%** vs baseline |
| Won-with-$0 (data-quality) | **16** | 0 |  🔴 **16 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 17 | 0 | 17 | 0 |
| Virginia Beach | 6 | 1 | 4 | 1 |
| Newport News | 4 | 0 | 3 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 6 | $5,200 | 5 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $5,200 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 20 | $48,200 | 11 |

---
_History: 17 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._