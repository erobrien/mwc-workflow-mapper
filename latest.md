# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-29T13:35:13+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **56** | 89 |  🔴 **-37.1%** vs baseline |
| Appointments booked | **31** | 31 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **None%** | 100.0% | |
| Opportunities Won | **0** | 16 |  🔴 **-100.0%** vs baseline |
| Won revenue | **0.0 $** | 47899.0 $ |  🔴 **-100.0%** vs baseline |
| Won-with-$0 (data-quality) | **0** | 0 |  ✅ clean |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 10 | 0 | 10 |
| Virginia Beach | 14 | 1 | 13 |
| Newport News | 7 | 0 | 7 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 0 | $0 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 0 | $0 | 0 |

---
_History: 18 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._