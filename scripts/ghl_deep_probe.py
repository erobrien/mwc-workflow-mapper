# -*- coding: utf-8 -*-
"""
Read-only deep probe of the GHL sub-account. GET-only; hits a broad set of v2
LeadConnector endpoints to build a complete configuration picture and reveal
gaps (uncaptured objects + scopes the token lacks).

Writes audit/ghl_probe.json and prints a summary.  python scripts/ghl_deep_probe.py
"""
import json, os, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sec = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN, LOC = sec["ghl_token"], sec["ghl_location_id"]
BASE = "https://services.leadconnectorhq.com"

def get(path, version="2021-07-28"):
    req = urllib.request.Request(BASE + path, headers={
        "Authorization": "Bearer " + TOKEN, "Version": version,
        "Accept": "application/json", "User-Agent": "MWC-DeepProbe/1.0",
    }, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try: body = e.read().decode("utf-8")[:200]
        except Exception: pass
        return e.code, {"_error": body}
    except Exception as e:
        return -1, {"_error": str(e)[:200]}

# (label, path, version, key-that-holds-the-list)
PROBES = [
    ("location_profile",   f"/locations/{LOC}",                               "2021-07-28", None),
    ("custom_fields",      f"/locations/{LOC}/customFields",                  "2021-07-28", "customFields"),
    ("custom_values",      f"/locations/{LOC}/customValues",                  "2021-07-28", "customValues"),
    ("tags",               f"/locations/{LOC}/tags",                          "2021-07-28", "tags"),
    ("templates_sms_email",f"/locations/{LOC}/templates?originId={LOC}&limit=200", "2021-07-28", "templates"),
    ("custom_objects",     f"/objects/?locationId={LOC}",                     "2021-07-28", "objects"),
    ("workflows",          f"/workflows/?locationId={LOC}",                   "2021-07-28", "workflows"),
    ("pipelines",          f"/opportunities/pipelines?locationId={LOC}",      "2021-07-28", "pipelines"),
    ("calendars",          f"/calendars/?locationId={LOC}",                   "2021-07-28", "calendars"),
    ("calendar_groups",    f"/calendars/groups?locationId={LOC}",             "2021-07-28", "groups"),
    ("users",              f"/users/?locationId={LOC}",                       "2021-07-28", "users"),
    ("forms",              f"/forms/?locationId={LOC}&limit=100",             "2021-07-28", "forms"),
    ("surveys",            f"/surveys/?locationId={LOC}&limit=100",           "2021-07-28", "surveys"),
    ("products",           f"/products/?locationId={LOC}&limit=100",          "2021-07-28", "products"),
    ("trigger_links",      f"/links/?locationId={LOC}",                       "2021-07-28", "links"),
    ("businesses",         f"/businesses/?locationId={LOC}",                  "2021-07-28", "businesses"),
    ("custom_menus",       f"/custom-menus/?locationId={LOC}",                "2021-07-28", "customMenus"),
    ("funnels",            f"/funnels/funnel/list?locationId={LOC}",          "2021-07-28", "funnels"),
    ("media",              f"/medias/files?altId={LOC}&altType=location&limit=1", "2021-07-28", "files"),
    ("email_builder",      f"/emails/builder?locationId={LOC}&limit=100",     "2021-07-28", "schedules"),
    ("opportunities",      f"/opportunities/search?location_id={LOC}&limit=1","2021-07-28", "opportunities"),
    ("contacts",           f"/contacts/?locationId={LOC}&limit=1",            "2021-07-28", "contacts"),
    ("conversations",      f"/conversations/search?locationId={LOC}&limit=1", "2021-07-28", "conversations"),
    ("snapshots",          f"/snapshots/?locationId={LOC}",                   "2021-07-28", "snapshots"),
    ("phone_numbers",      f"/phone-system/numbers/{LOC}",                    "2021-07-28", "numbers"),
]

def count(payload, key):
    if isinstance(payload, dict):
        if key and key in payload and isinstance(payload[key], list):
            return len(payload[key])
        meta = payload.get("meta") or payload.get("total")
        if isinstance(meta, dict) and "total" in meta:
            return meta["total"]
        if isinstance(payload.get("total"), int):
            return payload["total"]
    if isinstance(payload, list):
        return len(payload)
    return None

results = {}
print(f"{'OBJECT':22} {'HTTP':5} {'COUNT':>7}   notes")
print("-" * 70)
for label, path, ver, key in PROBES:
    code, payload = get(path, ver)
    n = count(payload, key) if code == 200 else None
    note = ""
    if code != 200:
        note = payload.get("_error", "")[:60] if isinstance(payload, dict) else ""
    results[label] = {"http": code, "count": n,
                      "sample_keys": (list(payload[key][0].keys()) if (code==200 and key and isinstance(payload.get(key),list) and payload[key]) else
                                      (list(payload.keys())[:12] if (code==200 and isinstance(payload,dict)) else None)),
                      "path": path}
    cnt = "" if n is None else str(n)
    print(f"{label:22} {code:<5} {cnt:>7}   {note}")
    results[label]["_payload_head"] = payload if (code==200 and label in ("location_profile",)) else None

json.dump(results, open(os.path.join(ROOT, "audit", "ghl_probe.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1, default=str)
print("\nsaved -> audit/ghl_probe.json")
