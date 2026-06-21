"""Enrich the GHL tag library with rationalization signals.

Pulls every tag from the location, then for each tag queries the contacts
search endpoint to get an EXACT contact-usage count (verified: the `eq`
operator matches whole tag values, not substrings). Writes the enriched
list to plan-workspace/public/tags.json.

Optionally, if a valid backend JWT is present in ~/.ghl_jwt, also pulls
createdAt/updatedAt per tag from the app backend (the "Created on" /
"Updated on" the GHL UI shows). Without a JWT it skips that gracefully.

No PHI is written -- only tag names, ids, counts, and derived signals.
"""
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from auth import (
    DATA_DIR, LOCATION_ID, SERVICES, BACKEND, REPO_ROOT,
    services_headers, backend_headers,
)

OUT = REPO_ROOT / "plan-workspace" / "public" / "tags.json"
WORKERS = 6
RETRIES = 3


def pull_tags() -> list[dict]:
    r = requests.get(f"{SERVICES}/locations/{LOCATION_ID}/tags",
                     headers=services_headers(), timeout=30)
    r.raise_for_status()
    return r.json().get("tags", [])


def count_for(tag_name: str) -> int | None:
    """Exact contact count for a tag via the search endpoint."""
    h = services_headers()
    h["Content-Type"] = "application/json"
    body = {
        "locationId": LOCATION_ID, "page": 1, "pageLimit": 1,
        "filters": [{"field": "tags", "operator": "eq", "value": tag_name}],
    }
    for attempt in range(RETRIES):
        try:
            r = requests.post(f"{SERVICES}/contacts/search", headers=h,
                              json=body, timeout=30)
            if r.status_code == 429:
                time.sleep(1.5 * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json().get("total")
        except Exception:
            if attempt == RETRIES - 1:
                return None
            time.sleep(1.0 * (attempt + 1))
    return None


def detect_pattern(name: str) -> str:
    if "{{" in name or "}}" in name:
        return "broken-merge-field"
    if re.search(r"_\d{4}-\d{2}-\d{2}$", name):
        return "date-suffixed"
    if re.search(r"_\d{4}$", name) or re.search(r"_\d{6}$", name):
        return "month-suffixed"
    if name.startswith("aft_"):
        return "aft-batch"
    if name.startswith("adhoc_"):
        return "adhoc-batch"
    if re.search(r"(test|delete|dupe|old|tmp|temp|xxx)", name, re.I):
        return "test-junk"
    return ""


def usage_tier(count: int | None) -> str:
    if count is None:
        return "unknown"
    if count == 0:
        return "unused"
    if count <= 5:
        return "rare"
    if count <= 50:
        return "low"
    if count <= 500:
        return "medium"
    return "high"


def try_backend_dates(tags: list[dict]) -> dict[str, dict]:
    """Best-effort pull of createdAt/updatedAt from the app backend.

    Returns {tagId: {created_at, updated_at}}. Empty dict if JWT missing/expired
    or the endpoint shape is not what we expect -- never fatal.
    """
    try:
        h = backend_headers()
    except SystemExit:
        print("  (no JWT -> skipping created/updated dates)")
        return {}
    candidates = [
        f"{BACKEND}/locations/{LOCATION_ID}/tags",
        f"{BACKEND}/tags/?locationId={LOCATION_ID}&limit=1000",
        f"{BACKEND}/contacts/tags/?locationId={LOCATION_ID}&limit=1000",
    ]
    for url in candidates:
        try:
            r = requests.get(url, headers=h, timeout=30)
        except Exception:
            continue
        if r.status_code != 200:
            continue
        try:
            data = r.json()
        except Exception:
            continue
        rows = data.get("tags") if isinstance(data, dict) else data
        if not isinstance(rows, list) or not rows:
            continue
        sample = rows[0]
        if not any(k in sample for k in ("dateAdded", "createdAt", "dateUpdated", "updatedAt")):
            print(f"  backend tags endpoint {url[-40:]} lacks date fields; keys={list(sample.keys())}")
            continue
        out = {}
        for row in rows:
            tid = row.get("id") or row.get("_id")
            if not tid:
                continue
            out[tid] = {
                "created_at": row.get("dateAdded") or row.get("createdAt"),
                "updated_at": row.get("dateUpdated") or row.get("updatedAt"),
            }
        print(f"  backend dates pulled from {url[-40:]} for {len(out)} tags")
        return out
    print("  (backend date pull found no usable endpoint)")
    return {}


def main():
    print("Pulling tags...")
    tags = pull_tags()
    print(f"  {len(tags)} tags")

    print(f"Counting contacts per tag ({WORKERS} workers)...")
    counts: dict[str, int | None] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(count_for, t["name"]): t["id"] for t in tags}
        for fut in as_completed(futs):
            counts[futs[fut]] = fut.result()
            done += 1
            if done % 25 == 0:
                print(f"    {done}/{len(tags)}")

    dates = try_backend_dates(tags)

    enriched = []
    for t in tags:
        c = counts.get(t["id"])
        d = dates.get(t["id"], {})
        enriched.append({
            "id": t["id"],
            "name": t["name"],
            "locationId": t.get("locationId", LOCATION_ID),
            "pattern": detect_pattern(t["name"]),
            "count": c,
            "usage_tier": usage_tier(c),
            "created_at": d.get("created_at"),
            "updated_at": d.get("updated_at"),
        })

    enriched.sort(key=lambda x: x["name"].lower())

    out = {
        "pulled_at": time.strftime("%Y-%m-%d"),
        "total": len(enriched),
        "has_dates": bool(dates),
        "total_contacts_tagged": sum(c for c in counts.values() if c),
        "tags": enriched,
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")

    # summary
    tiers: dict[str, int] = {}
    for e in enriched:
        tiers[e["usage_tier"]] = tiers.get(e["usage_tier"], 0) + 1
    print(f"\nSaved {len(enriched)} enriched tags -> {OUT}")
    print("Usage tiers:", tiers)
    unused = [e["name"] for e in enriched if e["usage_tier"] == "unused"]
    print(f"Unused (0 contacts): {len(unused)}")


if __name__ == "__main__":
    main()
