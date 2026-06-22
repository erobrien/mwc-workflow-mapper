# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-22T13:57:47+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **43** | 89 |  🔴 **-51.7%** vs baseline |
| Appointments booked | **26** | 41 |  🔴 **-36.6%** vs baseline |
| Show rate (showed / showed+noshow) | **None%** | 66.7% | |
| Opportunities Won | **2** | 8 |  🔴 **-75.0%** vs baseline |
| Won revenue | **10400.0 $** | 18298.0 $ |  🔴 **-43.2%** vs baseline |
| Won-with-$0 (data-quality) | **0** | 0 |  ✅ clean |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 15 | 1 | 14 |
| Virginia Beach | 3 | 0 | 3 |
| Newport News | 8 | 0 | 8 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $5,200 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 1 | $5,200 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 0 | $0 | 0 |

---
_History: 11 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._