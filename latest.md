# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-24T12:51:01+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **136** | 90 |  🔴 **+51.1%** vs baseline |
| Appointments booked | **43** | 43 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **None%** | 100.0% | |
| Opportunities Won | **32** | 12 |  🔴 **+166.7%** vs baseline |
| Won revenue | **58748.0 $** | 26000.0 $ |  🔴 **+126.0%** vs baseline |
| Won-with-$0 (data-quality) | **19** | 0 |  🔴 **19 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 22 | 1 | 21 |
| Virginia Beach | 11 | 1 | 10 |
| Newport News | 10 | 0 | 10 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $5,200 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $5,200 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 29 | $48,348 | 18 |

---
_History: 13 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._