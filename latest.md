# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-21T12:46:06+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **74** | 89 |  🔴 **-16.9%** vs baseline |
| Appointments booked | **41** | 41 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 66.7% |  (+33.3 pts) |
| Opportunities Won | **6** | 8 |  🔴 **-25.0%** vs baseline |
| Won revenue | **26000.0 $** | 18298.0 $ |  🔴 **+42.1%** vs baseline |
| Won-with-$0 (data-quality) | **1** | 0 |  🔴 **1 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 27 | 0 | 27 | 0 |
| Virginia Beach | 9 | 1 | 7 | 1 |
| Newport News | 5 | 0 | 5 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $5,200 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $5,200 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 4 | $15,600 | 1 |

---
_History: 10 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._