# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-17T13:22:15+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **89** | 85 |  (+4.7% vs baseline) |
| Appointments booked | **50** | 33 |  🔴 **+51.5%** vs baseline |
| Show rate (showed / showed+noshow) | **66.7%** | 66.7% |  (+0.0 pts) |
| Opportunities Won | **8** | 20 |  🔴 **-60.0%** vs baseline |
| Won revenue | **1500.0 $** | 55825.0 $ |  🔴 **-97.3%** vs baseline |
| Won-with-$0 (data-quality) | **7** | 0 |  🔴 **7 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow | showed |
|---|---|---|---|---|---|
| Richmond | 20 | 1 | 19 | 0 | 0 |
| Virginia Beach | 19 | 0 | 18 | 0 | 1 |
| Newport News | 11 | 0 | 9 | 1 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $0 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 7 | $1,500 | 6 |

---
_History: 6 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._