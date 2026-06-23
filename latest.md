# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-23T13:04:37+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **111** | 90 |  🔴 **+23.3%** vs baseline |
| Appointments booked | **43** | 43 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **19** | 12 |  🔴 **+58.3%** vs baseline |
| Won revenue | **47899.0 $** | 26000.0 $ |  🔴 **+84.2%** vs baseline |
| Won-with-$0 (data-quality) | **10** | 0 |  🔴 **10 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 19 | 3 | 16 | 0 |
| Virginia Beach | 13 | 0 | 12 | 1 |
| Newport News | 11 | 0 | 10 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $0 | 2 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 17 | $47,899 | 8 |

---
_History: 12 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._