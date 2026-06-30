# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-30T12:46:35+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **94** | 94 |  (+0.0% vs baseline) |
| Appointments booked | **45** | 43 |  (+4.7% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **25** | 19 |  🔴 **+31.6%** vs baseline |
| Won revenue | **77397.0 $** | 58600.0 $ |  🔴 **+32.1%** vs baseline |
| Won-with-$0 (data-quality) | **10** | 0 |  🔴 **10 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | confirmed | showed |
|---|---|---|---|
| Richmond | 26 | 25 | 1 |
| Virginia Beach | 10 | 10 | 0 |
| Newport News | 9 | 8 | 1 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 4 | $15,600 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 3 | $15,600 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 18 | $46,197 | 9 |

---
_History: 19 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._