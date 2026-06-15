# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-15T14:13:52+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **60** | 81 |  🔴 **-25.9%** vs baseline |
| Appointments booked | **32** | 32 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **None%** | 100.0% | |
| Opportunities Won | **1** | 20 |  🔴 **-95.0%** vs baseline |
| Won revenue | **6800.0 $** | 57700.0 $ |  🔴 **-88.2%** vs baseline |
| Won-with-$0 (data-quality) | **0** | 0 |  ✅ clean |

## Appointment cohort detail (booked in window)

| Location | Booked | confirmed |
|---|---|---|
| Richmond | 14 | 14 |
| Virginia Beach | 9 | 9 |
| Newport News | 9 | 9 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 0 | $0 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 1 | $6,800 | 0 |

---
_History: 4 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._