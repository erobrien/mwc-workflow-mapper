# Revenue-Integrity Monitor — 1-day snapshot

_2026-07-03T12:42:35+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## 🔴 ALERTS
- Show rate: 66.7% (down 33.3 pts vs 100.0%)

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **95** | 82 |  🔴 **+15.9%** vs baseline |
| Appointments booked | **30** | 31 |  (-3.2% vs baseline) |
| Show rate (showed / showed+noshow) | **66.7%** | 100.0% |  🔴 **−33.3 pts** (auto-confirm watch) |
| Opportunities Won | **22** | 16 |  🔴 **+37.5%** vs baseline |
| Won revenue | **73248.0 $** | 58600.0 $ |  🔴 **+25.0%** vs baseline |
| Won-with-$0 (data-quality) | **7** | 0 |  🔴 **7 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow | showed |
|---|---|---|---|---|---|
| Richmond | 14 | 1 | 12 | 1 | 0 |
| Virginia Beach | 7 | 0 | 7 | 0 | 0 |
| Newport News | 9 | 0 | 7 | 0 | 2 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $10,400 | 0 |
| 02. Newport News | 1 | $0 | 1 |
| 03. Richmond | 2 | $10,400 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 17 | $52,448 | 6 |

---
_History: 22 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._