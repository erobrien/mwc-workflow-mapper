# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-18T13:16:33+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## 🔴 ALERTS
- Show rate: 50.0% (down 16.7 pts vs 66.7%)

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **64** | 81 |  🔴 **-21.0%** vs baseline |
| Appointments booked | **45** | 33 |  🔴 **+36.4%** vs baseline |
| Show rate (showed / showed+noshow) | **50.0%** | 66.7% |  🔴 **−16.7 pts** (auto-confirm watch) |
| Opportunities Won | **1** | 10 |  🔴 **-90.0%** vs baseline |
| Won revenue | **2500.0 $** | 20800.0 $ |  🔴 **-88.0%** vs baseline |
| Won-with-$0 (data-quality) | **0** | 0 |  ✅ clean |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow | showed |
|---|---|---|---|---|---|
| Richmond | 20 | 1 | 19 | 0 | 0 |
| Virginia Beach | 16 | 1 | 13 | 1 | 1 |
| Newport News | 9 | 0 | 9 | 0 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 0 | $0 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 1 | $2,500 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 0 | $0 | 0 |

---
_History: 7 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._