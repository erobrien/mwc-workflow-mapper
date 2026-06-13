# -*- coding: utf-8 -*-
"""
MWC GHL Revenue-Integrity Monitor — read-only collector.

Pulls four metric families from the live GHL API (GET only, never writes):
  1. Leads captured              (contacts created in window)
  2. Appointments booked + show  (calendar events; show rate by booking cohort)
  3. Opportunities Won + revenue (Sum monetaryValue of won opps in window)
  4. Won-with-$0 counter         (data-quality regression guard for the A&D fix)

Modes:
  python collect.py            -> daily snapshot (24h window), append to history, write report
  python collect.py --hourly   -> 1h window snapshot (for cutover windows), append to history
  python collect.py --report   -> just regenerate the markdown report from history (no API calls)

History is a JSONL append log: monitor/data/history.jsonl
Reports:  monitor/reports/latest.md  (+ dated copy)

SAFETY: every HTTP call is GET. There is no code path that POSTs/PUTs/DELETEs.
"""
import json, sys, os, time, urllib.request, urllib.error, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
if not CFG.get("token"):
    _sec = json.load(open(os.path.join(HERE, "..", "secrets.json"), encoding="utf-8"))
    CFG["token"] = _sec["ghl_token"]
HIST = os.path.join(HERE, "data", "history.jsonl")
REPORTS = os.path.join(HERE, "reports")

def _get(path, version):
    url = CFG["api_base"] + path
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + CFG["token"],
        "Version": version,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MWC-Monitor/1.0",
    }, method="GET")  # GET only — read-only by construction
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < 3:
                time.sleep(2 ** attempt); continue
            raise
    raise RuntimeError("unreachable")

def ms(dt):  # datetime -> epoch ms
    return int(dt.timestamp() * 1000)

def collect(window_hours):
    now = datetime.datetime.now(datetime.timezone.utc)
    start = now - datetime.timedelta(hours=window_hours)
    s_ms, e_ms = ms(start), ms(now)
    loc = CFG["location_id"]
    snap = {
        "ts": now.isoformat(timespec="seconds"),
        "window_hours": window_hours,
        "metrics": {},
    }

    # --- 1. New opportunities created in window (reliable windowed lead-flow proxy) ---
    # GHL opportunities/search defaults to created-desc; page until older than window.
    new_opps = 0
    start_iso = start.isoformat()[:19]
    try:
        cursor = None
        pages = 0
        while pages < 60:  # safety cap (60*100 = 6000 opps/window max)
            url = f"/opportunities/search?location_id={loc}&limit=100"
            if cursor:
                url += f"&startAfter={cursor[0]}&startAfterId={cursor[1]}"
            d = _get(url, CFG["version_default"])
            ops = d.get("opportunities", [])
            if not ops:
                break
            stop = False
            for o in ops:
                if (o.get("createdAt") or "") >= start_iso:
                    new_opps += 1
                else:
                    stop = True
            meta = d.get("meta", {})
            if stop or not meta.get("nextPageUrl"):
                break
            cursor = (meta.get("startAfter"), meta.get("startAfterId"))
            pages += 1
    except Exception as ex:
        snap.setdefault("errors", []).append(f"new_opps: {ex}")
        new_opps = None
    snap["metrics"]["new_opportunities"] = new_opps

    # --- 2. Appointments booked + show rate (by booking cohort = created in window) ---
    appt = {"booked": 0, "by_status": {}, "by_location": {}, "by_location_status": {}}
    fwd = now + datetime.timedelta(days=21)
    for name, cid in CFG["calendars"].items():
        try:
            d = _get(f"/calendars/events?locationId={loc}&calendarId={cid}"
                     f"&startTime={ms(now - datetime.timedelta(days=21))}&endTime={ms(fwd)}",
                     CFG["version_calendars"])
            evs = d.get("events", [])
            # cohort = events CREATED within the window
            cohort = [e for e in evs if (e.get("dateAdded") or "") >= start.isoformat()[:19]]
            appt["by_location"][name] = len(cohort)
            appt["by_location_status"][name] = {}
            appt["booked"] += len(cohort)
            for e in cohort:
                st = e.get("appointmentStatus") or "none"
                appt["by_status"][st] = appt["by_status"].get(st, 0) + 1
                appt["by_location_status"][name][st] = appt["by_location_status"][name].get(st, 0) + 1
        except Exception as ex:
            snap.setdefault("errors", []).append(f"appt {name}: {ex}")
    # show rate computed over events whose appt time has passed (showed / (showed+noshow))
    showed = appt["by_status"].get("showed", 0)
    noshow = appt["by_status"].get("noshow", 0)
    appt["show_rate"] = round(showed / (showed + noshow) * 100, 1) if (showed + noshow) else None
    snap["metrics"]["appointments"] = appt

    # --- 3. Opportunities Won + revenue (won opps updated in window) + 4. won-with-$0 ---
    won_count = 0
    won_revenue = 0.0
    won_zero = 0
    per_pipe = {}
    for name, pid in CFG["sales_pipelines"].items():
        try:
            # page through won opps updated in window
            url = (f"/opportunities/search?location_id={loc}&pipeline_id={pid}"
                   f"&status=won&limit=100&date={s_ms}")
            d = _get(url, CFG["version_default"])
            ops = d.get("opportunities", [])
            recent = [o for o in ops if (o.get("updatedAt") or "") >= start.isoformat()[:19]]
            c = len(recent)
            rev = sum((o.get("monetaryValue") or 0) for o in recent)
            z = sum(1 for o in recent if not (o.get("monetaryValue") or 0))
            per_pipe[name] = {"won": c, "revenue": rev, "won_zero": z}
            won_count += c; won_revenue += rev; won_zero += z
        except Exception as ex:
            snap.setdefault("errors", []).append(f"opp {name}: {ex}")
    snap["metrics"]["won"] = {
        "count": won_count, "revenue": round(won_revenue, 2),
        "won_with_zero": won_zero, "by_pipeline": per_pipe,
    }

    return snap

def append_history(snap):
    os.makedirs(os.path.dirname(HIST), exist_ok=True)
    with open(HIST, "a", encoding="utf-8") as f:
        f.write(json.dumps(snap, ensure_ascii=False) + "\n")

def load_history():
    if not os.path.exists(HIST):
        return []
    out = []
    for line in open(HIST, encoding="utf-8"):
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out

def baseline(history, window_hours, key_fn):
    """Median of the metric across same-window snapshots in the baseline window."""
    days = CFG["baseline_window_days"]
    cutoff = (datetime.datetime.now(datetime.timezone.utc)
              - datetime.timedelta(days=days)).isoformat()
    vals = []
    for h in history:
        if h.get("window_hours") != window_hours:
            continue
        if h.get("ts", "") < cutoff:
            continue
        v = key_fn(h)
        if v is not None:
            vals.append(v)
    if not vals:
        return None
    vals.sort()
    return vals[len(vals)//2]

def pct_drift(cur, base):
    if base in (None, 0) or cur is None:
        return None
    return round((cur - base) / base * 100, 1)

def build_report(history):
    if not history:
        return "# Revenue-Integrity Monitor\n\n_No data collected yet._\n"
    latest = history[-1]
    m = latest["metrics"]
    wh = latest["window_hours"]
    label = "1-hour" if wh == 1 else f"{wh//24}-day"
    alerts = []

    def alertline(name, cur, base, unit=""):
        d = pct_drift(cur, base)
        flag = ""
        if d is not None and abs(d) >= CFG["alert_drift_pct"]:
            flag = f"  🔴 **{d:+}%** vs baseline"
            alerts.append(f"{name}: {cur}{unit} ({d:+}% vs baseline {base}{unit})")
        elif d is not None:
            flag = f"  ({d:+}% vs baseline)"
        b = f"{base}{unit}" if base is not None else "—"
        return f"| {name} | **{cur}{unit}** | {b} |{flag} |"

    leads = m.get("new_opportunities")
    appt = m.get("appointments", {})
    won = m.get("won", {})

    base_leads = baseline(history, wh, lambda h: h["metrics"].get("new_opportunities"))
    base_booked = baseline(history, wh, lambda h: h["metrics"].get("appointments", {}).get("booked"))
    base_wonrev = baseline(history, wh, lambda h: h["metrics"].get("won", {}).get("revenue"))
    base_wonct = baseline(history, wh, lambda h: h["metrics"].get("won", {}).get("count"))
    base_show = baseline(history, wh, lambda h: h["metrics"].get("appointments", {}).get("show_rate"))

    # show-rate uses point-drop, not pct
    show = appt.get("show_rate")
    show_flag = ""
    if show is not None and base_show is not None and (base_show - show) >= CFG["show_rate_alert_drop_points"]:
        show_flag = f"  🔴 **−{round(base_show-show,1)} pts** (auto-confirm watch)"
        alerts.append(f"Show rate: {show}% (down {round(base_show-show,1)} pts vs {base_show}%)")
    elif show is not None and base_show is not None:
        show_flag = f"  ({show-base_show:+} pts)"

    wz = won.get("won_with_zero", 0)
    wz_flag = "  ✅ clean" if wz == 0 else f"  🔴 **{wz} won opps with $0** (A&D regression guard)"
    if wz and wz > (base_wonct or 0) * 0:  # any nonzero is worth surfacing during cutover
        pass

    lines = []
    lines.append(f"# Revenue-Integrity Monitor — {label} snapshot")
    lines.append(f"\n_{latest['ts']} · location {CFG['location_id']} · **read-only**, GET-only collector_\n")

    if alerts:
        lines.append("## 🔴 ALERTS")
        for a in alerts:
            lines.append(f"- {a}")
        lines.append("")
    else:
        lines.append("## ✅ All metrics within tolerance\n")

    lines.append("## Metrics vs baseline (median of same-window snapshots, last "
                 f"{CFG['baseline_window_days']}d)\n")
    lines.append("| Metric | Current | Baseline | Drift |")
    lines.append("|---|---|---|---|")
    lines.append(alertline("New opportunities", leads, base_leads))
    lines.append(alertline("Appointments booked", appt.get("booked"), base_booked))
    lines.append(f"| Show rate (showed / showed+noshow) | **{show}%** | "
                 f"{base_show if base_show is not None else '—'}% |{show_flag} |")
    lines.append(alertline("Opportunities Won", won.get("count"), base_wonct))
    lines.append(alertline("Won revenue", won.get("revenue"), base_wonrev, unit=" $"))
    lines.append(f"| Won-with-$0 (data-quality) | **{wz}** | 0 |{wz_flag} |")
    lines.append("")

    # detail
    statuses = sorted(appt.get("by_status", {}).keys())
    lines.append("## Appointment cohort detail (booked in window)\n")
    lines.append("| Location | Booked | " + " | ".join(statuses) + " |")
    lines.append("|---|---|" + "---|" * len(statuses))
    bls = appt.get("by_location_status", {})
    for loc_name, n in appt.get("by_location", {}).items():
        row = f"| {loc_name} | {n} |"
        for st in statuses:
            row += f" {bls.get(loc_name, {}).get(st, 0)} |"
        lines.append(row)
    lines.append("")

    lines.append("## Won detail by pipeline (window)\n")
    lines.append("| Pipeline | Won | Revenue | Won-$0 |")
    lines.append("|---|---|---|---|")
    for pn, pv in won.get("by_pipeline", {}).items():
        lines.append(f"| {pn} | {pv['won']} | ${pv['revenue']:,.0f} | {pv['won_zero']} |")
    lines.append("")

    if latest.get("errors"):
        lines.append("## ⚠️ Collection warnings")
        for e in latest["errors"]:
            lines.append(f"- {e}")
        lines.append("")

    lines.append("---")
    lines.append(f"_History: {len(history)} snapshots in monitor/data/history.jsonl · "
                 f"alert thresholds: {CFG['alert_drift_pct']}% drift, "
                 f"{CFG['show_rate_alert_drop_points']}-pt show-rate drop._")
    return "\n".join(lines)

def main():
    args = sys.argv[1:]
    if "--report" in args:
        hist = load_history()
        rep = build_report(hist)
    else:
        window_hours = 1 if "--hourly" in args else 24
        snap = collect(window_hours)
        append_history(snap)
        hist = load_history()
        rep = build_report(hist)

    os.makedirs(REPORTS, exist_ok=True)
    open(os.path.join(REPORTS, "latest.md"), "w", encoding="utf-8").write(rep)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    open(os.path.join(REPORTS, f"report-{stamp}.md"), "w", encoding="utf-8").write(rep)
    # console summary
    print(rep.split("## Metrics")[0])
    print(f"[report written: monitor/reports/latest.md]")

if __name__ == "__main__":
    main()
