# Revenue-Integrity Monitor — 1-day snapshot

_2026-06-27T12:33:06+00:00 · location Ghstz8eIsHWLeXek47dk · **read-only**, GET-only collector_

## ✅ All metrics within tolerance

## Metrics vs baseline (median of same-window snapshots, last 7d)

| Metric | Current | Baseline | Drift |
|---|---|---|---|
| New opportunities | **89** | 111 |  🔴 **-19.8%** vs baseline |
| Appointments booked | **24** | 41 |  🔴 **-41.5%** vs baseline |
| Show rate (showed / showed+noshow) | **None%** | 100.0% | |
| Opportunities Won | **16** | 16 |  (+0.0% vs baseline) |
| Won revenue | **65699.0 $** | 47899.0 $ |  🔴 **+37.2%** vs baseline |
| Won-with-$0 (data-quality) | **3** | 0 |  🔴 **3 won opps with $0** (A&D regression guard) |

## Appointment cohort detail (booked in window)

| Location | Booked | cancelled | confirmed |
|---|---|---|---|
| Richmond | 16 | 1 | 15 |
| Virginia Beach | 4 | 0 | 4 |
| Newport News | 4 | 1 | 3 |

## Won detail by pipeline (window)

| Pipeline | Won | Revenue | Won-$0 |
|---|---|---|---|
| 01. MWC Sales Production | 4 | $20,800 | 0 |
| 02. Newport News | 0 | $0 | 0 |
| 03. Richmond | 4 | $20,800 | 0 |
| 04. Virginia Beach | 0 | $0 | 0 |
| 05. Virtual | 0 | $0 | 0 |
| 07. A & D | 8 | $24,099 | 3 |

---
_History: 16 snapshots in monitor/data/history.jsonl · alert thresholds: 10% drift, 5-pt show-rate drop._