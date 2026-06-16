# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-16T13:54:58+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **121** | 81 |  🔴 **+49.4%** vs baseline |
| Appointments booked | **43** | 32 |  🔴 **+34.4%** vs baseline |
| Show rate (showed / showed+noshow) | **66.7%** | 66.7% |  (+0.0 pts) |
| Opportunities Won | **25** | 20 |  🔴 **+25.0%** vs baseline |
| Won revenue | **55825.0 $** | 55825.0 $ |  (+0.0% vs baseline) |
| Won-with-$0 (data-quality) | **13** | 0 |  🔴 **13 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | noshow | showed |
|---|---|---|---|---|---|
| Richmond | 19 | 0 | 17 | 1 | 1 |
| Virginia Beach | 13 | 1 | 11 | 0 | 1 |
| Newport News | 11 | 0 | 11 | 0 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 3 | $5,200 | 2 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 2 | $5,200 | 1 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 20 | $45,425 | 10 |

---
_History: 5 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._