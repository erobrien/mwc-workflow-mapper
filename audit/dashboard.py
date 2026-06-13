# -*- coding: utf-8 -*-
"""
MWC Revenue-Integrity Dashboard — READ-ONLY.
Pulls live GHL data, compares today's funnel metrics to a 7-day rolling baseline,
flags >10% drift. Writes a markdown report to audit/daily/YYYY-MM-DD.md.

Modes:
  python dashboard.py            daily report (default)
  python dashboard.py --hourly   last-60-min capture pulse (for cutover windows)

Metrics:
  1. Leads captured        (contacts created)
  2. Appointments booked   (events created, all 3 calendars) + show rate by cohort
  3. Won opportunities     (+ sum monetaryValue, won-with-$0 counter)
  4. Conversion triggers   (opps newly reaching Booked/Won — proxy for CAPI/Google
                            fires; workflow execution logs are not exposed by API)
"""
import json, os, sys, time, datetime, urllib.request, urllib.parse, os, ssl

TOKEN = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "secrets.json"), encoding="utf-8"))["ghl_token"]
LOC = "Ghstz8eIsHWLeXek47dk"
BASE = "https://services.leadconnectorhq.com"
CALENDARS = {
    "1Cfy5JnO2A4ggiZlMVvX": "Richmond",
    "4xmnBGMWJ6TVUKcAPpPb": "VA Beach",
    "lBaRbjUpEmesxEloFBME": "Newport News",
}
DRIFT = 0.10  # 10% flag threshold
DAYS_BASELINE = 7

HDRS = {
    "Authorization": f"Bearer {TOKEN}",
    "Version": "2021-07-28",
    "Accept": "application/json",
    "User-Agent": "curl/8.0",  # urllib UA gets 403'd by their WAF
}

def get(path, params=None, version=None):
    url = BASE + path
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    h = dict(HDRS)
    if version:
        h["Version"] = version
    req = urllib.request.Request(url, headers=h)
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.loads(r.read().decode())

def iso_to_dt(s):
    if not s:
        return None
    try:
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None

NOW = datetime.datetime.now(datetime.timezone.utc)
SINCE = NOW - datetime.timedelta(days=DAYS_BASELINE + 1)

# ---------------- collectors ----------------

def collect_contacts():
    """Contacts created in window, bucketed by UTC day. Paginates newest-first."""
    buckets = {}
    params = {"locationId": LOC, "limit": 100}
    url_params = dict(params)
    seen = 0
    startAfter = None
    startAfterId = None
    while True:
        p = dict(params)
        if startAfter:
            p["startAfter"] = startAfter
            p["startAfterId"] = startAfterId
        d = get("/contacts/", p)
        contacts = d.get("contacts", [])
        if not contacts:
            break
        oldest = None
        for c in contacts:
            dt = iso_to_dt(c.get("dateAdded"))
            if not dt:
                continue
            oldest = dt
            if dt >= SINCE:
                buckets.setdefault(dt.date().isoformat(), 0)
                buckets[dt.date().isoformat()] += 1
        seen += len(contacts)
        meta = d.get("meta", {})
        startAfter, startAfterId = meta.get("startAfter"), meta.get("startAfterId")
        if oldest and oldest < SINCE:
            break
        if not startAfter or seen > 5000:
            break
    return buckets

def collect_appointments():
    """Events on all calendars; created-in-window bookings + show-rate cohorts."""
    start = int((NOW - datetime.timedelta(days=DAYS_BASELINE + 1)).timestamp() * 1000)
    end = int((NOW + datetime.timedelta(days=45)).tim