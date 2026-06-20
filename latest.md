# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-20T12:42:34+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **120** | 89 |  🔴 **+34.8%** vs baseline |
| Appointments booked | **37** | 41 |  (-9.8% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 66.7% |  (+33.3 pts) |
| Opportunities Won | **33** | 10 |  🔴 **+230.0%** vs baseline |
| Won revenue | **91848.0 $** | 18298.0 $ |  🔴 **+402.0%** vs baseline |
| Won-with-$0 (data-quality) | **14** | 0 |  🔴 **14 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 17 | 1 | 16 | 0 |
| Virginia Beach | 15 | 1 | 11 | 3 |
| Newport News | 5 | 0 | 4 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 5 | $15,600 | 2 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 3 | $15,600 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 25 | $60,648 | 12 |

---
_History: 9 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._