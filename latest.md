# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-25T12:52:51+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## 🔴 ALERTS
- Show rate: 0.0% (down 100.0 pts vs 100.0%)

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **115** | 111 |  (+3.6% vs baseline) |
| Appointments booked | **49** | 43 |  🔴 **+14.0%** vs baseline |
| Show rate (showed / showed+noshow) | **0.0%** | 100.0% |  🔴 **−100.0 pts** (auto-confirm watch) |
| Opportunities Won | **10** | 12 |  🔴 **-16.7%** vs baseline |
| Won revenue | **15600.0 $** | 26000.0 $ |  🔴 **-40.0%** vs baseline |
| Won-with-$0 (data-quality) | **7** | 0 |  🔴 **7 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow |
|---|---|---|---|---|
| Richmond | 28 | 3 | 25 | 0 |
| Virginia Beach | 16 | 0 | 15 | 1 |
| Newport News | 5 | 0 | 5 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $0 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 9 | $15,600 | 6 |

---
_History: 14 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._