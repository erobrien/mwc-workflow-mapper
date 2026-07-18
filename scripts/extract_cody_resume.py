# -*- coding: utf-8 -*-
"""Resume Cody extraction: docs+triggers for missing workflows, then assets, then step graphs.
Handles proxy 429s with exponential backoff. Skips already-saved files."""
import json, os, time
import requests, urllib3
urllib3.disable_warnings()

LOC = "VoeVvlByAem9pkxb7f6a"
BACKEND = "https://backend.leadconnectorhq.com"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "ghl_data_cody")
STEPS = os.path.join(OUT, "workflow_steps")

S = requests.Session()
S.headers.update({"channel": "APP", "source": "WEB_USER", "Version": "2021-07-28",
                  "Accept": "application/json"})
S.verify = False


def get(path, params=None, label=""):
    delay = 2
    for attempt in range(9):
        try:
            r = S.get(f"{BACKEND}{path}", params=params, timeout=30)
        except requests.exceptions.ProxyError:
            print(f"  429/proxy, sleep {delay}s ({label})", flush=True)
            time.sleep(delay); delay = min(delay * 2, 90); continue
        if r.status_code == 429:
            time.sleep(delay); delay = min(delay * 2, 90); continue
        if r.status_code == 401:
            raise SystemExit("JWT_EXPIRED")
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"gave up: {path}")


def save(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


rows = json.load(open(os.path.join(OUT, "workflows.json")))
fu_path = os.path.join(OUT, "file_urls.json")
file_urls = json.load(open(fu_path)) if os.path.exists(fu_path) else {}

missing = [r for r in rows if not os.path.exists(os.path.join(STEPS, f"{r.get('_id') or r.get('id')}.doc.json"))]
print(f"docs missing: {len(missing)}/{len(rows)}", flush=True)

for i, r in enumerate(missing):
    wid = r.get("_id") or r.get("id")
    doc = get(f"/workflow/{LOC}/{wid}", {"includeTriggers": "true"}, r.get("name", "?")[:40])
    w = doc.get("workflow") or doc
    fu = w.get("fileUrl") or doc.get("fileUrl")
    if fu:
        file_urls[wid] = fu
    with open(os.path.join(STEPS, f"{wid}.doc.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
    if i % 20 == 0:
        save("file_urls.json", file_urls)
        print(f"  {i}/{len(missing)}", flush=True)
    time.sleep(0.4)
save("file_urls.json", file_urls)
print("docs done", flush=True)

for path, params, name in [
    ("/tags/", {"locationId": LOC, "limit": 1000}, "tags.json"),
    (f"/locations/{LOC}/customFields", None, "custom_fields.json"),
    (f"/locations/{LOC}/customValues", None, "custom_values.json"),
    ("/opportunities/pipelines", {"locationId": LOC}, "pipelines.json"),
    (f"/conversations/templates/{LOC}", {"limit": 100}, "templates.json"),
    ("/calendars/", {"locationId": LOC}, "calendars.json"),
    ("/forms/", {"locationId": LOC, "limit": 100}, "forms.json"),
]:
    if os.path.exists(os.path.join(OUT, name)):
        continue
    try:
        save(name, get(path, params, name)); print(f"ok {name}", flush=True)
    except SystemExit:
        raise
    except Exception as e:
        print(f"  !! {name}: {e}", flush=True)

ok = fail = 0
for wid, fu in file_urls.items():
    p = os.path.join(STEPS, f"{wid}.json")
    if os.path.exists(p):
        ok += 1; continue
    for attempt in range(5):
        try:
            r = requests.get(fu, timeout=30, verify=False)
            r.raise_for_status()
            with open(p, "w", encoding="utf-8") as f:
                json.dump(r.json(), f, indent=1, ensure_ascii=False)
            ok += 1
            break
        except Exception:
            time.sleep(3 * (attempt + 1))
    else:
        fail += 1
    time.sleep(0.2)
print(f"step graphs: {ok} ok, {fail} fail of {len(file_urls)}", flush=True)
