# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-14T12:45:16+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **60** | 81 |  🔴 **-25.9%** vs baseline |
| Appointments booked | **24** | 29 |  🔴 **-17.2%** vs baseline |
| Show rate (showed / showed+noshow) | **None%** | 100.0% | |
| Opportunities Won | **10** | 20 |  🔴 **-50.0%** vs baseline |
| Won revenue | **20800.0 $** | 57700.0 $ |  🔴 **-64.0%** vs baseline |
| Won-with-$0 (data-quality) | **6** | 0 |  🔴 **6 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 12 | 1 | 11 |
| Virginia Beach | 7 | 0 | 7 |
| Newport News | 5 | 0 | 5 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $0 | 2 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 8 | $20,800 | 4 |

---
_History: 3 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._