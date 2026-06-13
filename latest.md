# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-13T12:42:37+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **85** | 85 |  (+0.0% vs baseline) |
| Appointments booked | **29** | 33 |  🔴 **-12.1%** vs baseline |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **20** | 21 |  (-4.8% vs baseline) |
| Won revenue | **57700.0 $** | 57700.0 $ |  (+0.0% vs baseline) |
| Won-with-$0 (data-quality) | **9** | 0 |  🔴 **9 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 12 | 1 | 10 | 1 |
| Virginia Beach | 7 | 1 | 6 | 0 |
| Newport News | 10 | 0 | 10 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $5,200 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $5,200 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 17 | $47,300 | 8 |

---
_History: 2 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._