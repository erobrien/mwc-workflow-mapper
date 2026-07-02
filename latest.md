# Revenue-Integrity Monitor — 1-day snapshot

_2026-07-02T12:43:53+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **66** | 82 |  🔴 **-19.5%** vs baseline |
| Appointments booked | **31** | 31 |  (+0.0% vs baseline) |
| Show rate (showed / showed+noshow) | **100.0%** | 100.0% |  (+0.0 pts) |
| Opportunities Won | **6** | 15 |  🔴 **-60.0%** vs baseline |
| Won revenue | **21400.0 $** | 36199.0 $ |  🔴 **-40.9%** vs baseline |
| Won-with-$0 (data-quality) | **2** | 0 |  🔴 **2 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed | showed |
|---|---|---|---|---|
| Richmond | 14 | 2 | 12 | 0 |
| Virginia Beach | 14 | 0 | 13 | 1 |
| Newport News | 3 | 0 | 3 | 0 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 1 | $5,200 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 0 | $0 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 5 | $16,200 | 2 |

---
_History: 21 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._