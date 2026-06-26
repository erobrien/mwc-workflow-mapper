# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-26T12:49:37+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **77** | 111 |  🔴 **-30.6%** vs baseline |
| Appointments booked | **31** | 41 |  🔴 **-24.4%** vs baseline |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **15** | 15 |  (+0.0% vs baseline) |
| Won revenue | **36199.0 $** | 36199.0 $ |  (+0.0% vs baseline) |
| Won-with-$0 (data-quality) | **8** | 0 |  🔴 **8 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 15 | 1 | 14 | 0 |
| Virginia Beach | 9 | 1 | 8 | 0 |
| Newport News | 7 | 1 | 5 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $0 | 2 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 13 | $36,199 | 6 |

---
_History: 15 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._