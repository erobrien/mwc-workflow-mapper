import json, sys
import requests
from auth import BACKEND, LOCATION_ID, ACTIVE_WORKFLOWS_FOLDER, backend_headers

def list_children(parent_id, offset=0, limit=100):
    url = f"{BACKEND}/workflow/{LOCATION_ID}/list"
    params = {"parentId": parent_id, "limit": limit, "offset": offset,
              "sortBy": "name", "sortOrder": "asc",
              "includeCustomObjects": "true", "includeObjectiveBuilder": "true"}
    r = requests.get(url, headers=backend_headers(), params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def walk(parent_id, path):
    items, offset = [], 0
    while True:
        data = list_children(parent_id, offset)
        rows = data.get("rows") or data.get("workflows") or data.get("data") or []
        if not rows: break
        items.extend(rows)
        offset += len(rows)
        total = data.get("total") or data.get("count")
        if total is not None and offset >= int(total): break
        if len(rows) < 100: break
    out = []
    for it in items:
        wid = it.get("_id") or it.get("id")
        name = it.get("name", "?")
        if it.get("type") in ("folder","directory"):
            out.extend(walk(wid, path + [name]))
        else:
            out.append({"id": wid, "name": name, "status": it.get("status", "?"),
                        "folder": " / ".join(path) if path else "(root)",
                        "updatedAt": it.get("updatedAt")})
    return out

wfs = walk(ACTIVE_WORKFLOWS_FOLDER, [])
json.dump(wfs, open("/tmp/active_workflows.json", "w"), indent=2)
print(f"TOTAL under Active Workflows: {len(wfs)}")
from collections import Counter
for folder, n in Counter(w["folder"] for w in wfs).most_common():
    print(f"  {n:3d}  {folder}")
print(f"  statuses: {Counter(w['status'] for w in wfs)}")
