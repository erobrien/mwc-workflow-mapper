# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-19T13:17:23+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **90** | 85 |  (+5.9% vs baseline) |
| Appointments booked | **41** | 41 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **None%** | 66.7% | |
| Opportunities Won | **12** | 12 |  (+0.0% vs baseline) |
| Won revenue | **18298.0 $** | 20800.0 $ |  🔴 **-12.0%** vs baseline |
| Won-with-$0 (data-quality) | **7** | 0 |  🔴 **7 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 12 | 1 | 11 |
| Virginia Beach | 17 | 0 | 17 |
| Newport News | 12 | 0 | 12 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 2 | $1,349 | 1 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $1,349 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 9 | $15,600 | 6 |

---
_History: 8 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._