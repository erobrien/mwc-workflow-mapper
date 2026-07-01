# Revenue-Integrity Monitor — 1-day snapshot

_2026-07-01T13:02:18+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **72** | 82 |  🔴 **-12.2%** vs baseline |
| Appointments booked | **34** | 31 |  (+9.7% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **10** | 15 |  🔴 **-33.3%** vs baseline |
| Won revenue | **5200.0 $** | 36199.0 $ |  🔴 **-85.6%** vs baseline |
| Won-with-$0 (data-quality) | **9** | 0 |  🔴 **9 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 17 | 0 | 15 | 2 |
| Virginia Beach | 9 | 1 | 8 | 0 |
| Newport News | 8 | 0 | 8 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $0 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $0 | 1 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 8 | $5,200 | 7 |

---
_History: 20 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._