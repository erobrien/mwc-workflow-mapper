# -*- coding: utf-8 -*-
"""Extract the Cody (Cavenaugh) build sub-account via the GHL app backend.

Location: VoeVvlByAem9pkxb7f6a
Auth: token-id header injected by the credential proxy (custom-cred:backend.leadconnectorhq.com).
Output: ghl_data_cody/  (roster, docs+triggers, step graphs, tags, fields, pipelines, templates)
"""
import json, os, sys, time
import requests, urllib3
urllib3.disable_warnings()

LOC = "VoeVvlByAem9pkxb7f6a"
BACKEND = "https://backend.leadconnectorhq.com"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "ghl_data_cody")
STEPS = os.path.join(OUT, "workflow_steps")
os.makedirs(STEPS, exist_ok=True)

# token-id is injected by the proxy; send the rest of the proven header set.
H = {"channel": "APP", "source": "WEB_USER", "Version": "2021-07-28",
     "Accept": "application/json"}

S = requests.Session()
S.headers.update(H)
S.verify = False  # sandbox credential-proxy MITM CA fails Py3.14 strict checks


def get(path, params=None, label=""):
    r = S.get(f"{BACKEND}{path}", params=params, timeout=30)
    print(f"[{r.status_code}] {label or path}", flush=True)
    if r.status_code == 401:
        sys.exit(f"401 on {path} - JWT rejected/expired")
    r.raise_for_status()
    return r.json()


def save(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def list_folder(parent_id=None):
    rows, offset = [], 0
    while True:
        params = {"limit": 100, "offset": offset, "sortBy": "name", "sortOrder": "asc"}
        if parent_id:
            params["parentId"] = parent_id
        data = get(f"/workflow/{LOC}/list", params, f"list parent={parent_id or 'ROOT'} off={offset}")
        batch = data.get("rows") or data.get("workflows") or data.get("data") or []
        rows += batch
        if len(batch) < 100:
            return rows
        offset += 100


def walk(parent_id=None, path=""):
    """Recurse folders; return workflow rows annotated with folder path."""
    out = []
    for row in list_folder(parent_id):
        if row.get("type") == "directory":
            out += walk(row.get("_id") or row.get("id"), f"{path}/{row.get('name','?')}".strip("/"))
        else:
            row["_folderPath"] = path
            out.append(row)
    return out


def main():
    # 1) roster (folder walk, then flat sweep to catch root-level strays)
    rows = walk()
    seen = {r.get("_id") or r.get("id") for r in rows}
    for row in list_folder(None):
        rid = row.get("_id") or row.get("id")
        if row.get("type") != "directory" and rid not in seen:
            row["_folderPath"] = ""
            rows.append(row); seen.add(rid)
    save("workflows.json", rows)
    print(f"roster: {len(rows)} workflows", flush=True)

    # 2) per-workflow doc + triggers (auth-gated -> do NOW); collect fileUrls
    file_urls = {}
    for r in rows:
        wid = r.get("_id") or r.get("id")
        try:
            doc = get(f"/workflow/{LOC}/{wid}", {"includeTriggers": "true"}, f"doc {r.get('name','?')[:40]}")
        except Exception as e:
            print(f"  !! doc fail {wid}: {e}", flush=True); continue
        w = doc.get("workflow") or doc
        fu = w.get("fileUrl") or doc.get("fileUrl")
        if fu:
            file_urls[wid] = fu
        with open(os.path.join(STEPS, f"{wid}.doc.json"), "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        time.sleep(0.15)
    save("file_urls.json", file_urls)  # local only; stripped before commit

    # 3) other auth-gated assets (probe; tolerate 404s)
    for path, params, name in [
        (f"/tags/", {"locationId": LOC, "limit": 1000}, "tags.json"),
        (f"/locations/{LOC}/customFields", None, "custom_fields.json"),
        (f"/locations/{LOC}/customValues", None, "custom_values.json"),
        (f"/opportunities/pipelines", {"locationId": LOC}, "pipelines.json"),
        (f"/conversations/templates/{LOC}", {"limit": 100}, "templates.json"),
        (f"/calendars/", {"locationId": LOC}, "calendars.json"),
        (f"/forms/", {"locationId": LOC, "limit": 100}, "forms.json"),
    ]:
        try:
            save(name, get(path, params, name))
        except SystemExit:
            raise
        except Exception as e:
            print(f"  !! {name}: {e}", flush=True)

    # 4) step graphs from Firebase fileUrls (work even after JWT expiry)
    ok = 0
    for wid, fu in file_urls.items():
        try:
            r = requests.get(fu, timeout=30, verify=False)
            r.raise_for_status()
            with open(os.path.join(STEPS, f"{wid}.json"), "w", encoding="utf-8") as f:
                json.dump(r.json(), f, indent=1, ensure_ascii=False)
            ok += 1
        except Exception as e:
            print(f"  !! steps fail {wid}: {e}", flush=True)
    print(f"step graphs: {ok}/{len(file_urls)}", flush=True)


if __name__ == "__main__":
    main()
