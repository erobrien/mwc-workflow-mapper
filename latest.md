# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-13T01:45:48+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **81** | 81 |  (+0.0% vs baseline) |
| Appointments booked | **33** | 33 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **62.5%** | 62.5% |  (+0.0 pts) |
| Opportunities Won | **21** | 21 |  (+0.0% vs baseline) |
| Won revenue | **57700.0 $** | 57700.0 $ |  (+0.0% vs baseline) |
| Won-with-$0 (data-quality) | **10** | 0 |  🔴 **10 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow | showed |
|---|---|---|---|---|---|
| Richmond | 16 | 0 | 11 | 1 | 4 |
| Virginia Beach | 5 | 1 | 4 | 0 | 0 |
| Newport News | 12 | 0 | 9 | 2 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $5,200 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 2 | $5,200 | 1 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 17 | $47,300 | 8 |

---
_History: 1 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._