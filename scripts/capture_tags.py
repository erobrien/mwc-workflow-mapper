"""Sniff the real GHL tags API call (with createdAt/updatedAt) from the
settings > Tags page, reusing the already-logged-in browser profile.

The public PIT API only returns id/name/locationId. The GHL UI's Tags settings
page shows "Created on" / "Updated on", so it calls a richer endpoint. We can't
guess the path/auth (location-token gated), so we load the page in the persistent
profile and capture whatever JSON response carries the tag list with dates.

Output: ghl_data/tags_backend.json  ({url, count, tags:[...] }) + prints the
endpoint URL so it can be replicated directly later.
No PHI -- tags only.
"""
import asyncio
import json
from pathlib import Path

from auth import DATA_DIR, LOCATION_ID

USER_DATA_DIR = Path.home() / ".ghl_browser_profile"
OUT = DATA_DIR / "tags_backend.json"

# Candidate settings URLs for the Tags page (v2 first, then legacy).
TAG_PAGE_URLS = [
    f"https://app.gohighlevel.com/v2/location/{LOCATION_ID}/settings/tags",
    f"https://app.gohighlevel.com/location/{LOCATION_ID}/settings/tags",
]

DATE_KEYS = ("dateAdded", "createdAt", "dateUpdated", "updatedAt", "createdBy", "updatedBy")


def _looks_like_tag_rows(obj):
    """Return the tag-row list if obj looks like a tags response with dates."""
    rows = None
    if isinstance(obj, dict):
        for key in ("tags", "data", "results"):
            if isinstance(obj.get(key), list):
                rows = obj[key]
                break
    elif isinstance(obj, list):
        rows = obj
    if not rows or not isinstance(rows[0], dict):
        return None
    first = rows[0]
    has_name = any(k in first for k in ("name", "tagName"))
    has_date = any(k in first for k in DATE_KEYS)
    if has_name and has_date:
        return rows
    return None


async def main():
    from playwright.async_api import async_playwright

    captured = {"best": None, "url": None}

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR), headless=False, viewport={"width": 1600, "height": 1000},
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()

        async def on_response(resp):
            try:
                url = resp.url
                if "tag" not in url.lower():
                    return
                ct = resp.headers.get("content-type", "")
                if "json" not in ct:
                    return
                body = await resp.json()
                rows = _looks_like_tag_rows(body)
                if rows and (captured["best"] is None or len(rows) > len(captured["best"])):
                    captured["best"] = rows
                    captured["url"] = url
                    print(f"  >> captured {len(rows)} tag rows from: {url[:90]}")
            except Exception:
                pass

        page.on("response", lambda r: asyncio.create_task(on_response(r)))

        got = False
        for url in TAG_PAGE_URLS:
            print(f"Navigating to {url}")
            try:
                await page.goto(url, wait_until="networkidle", timeout=45000)
            except Exception as e:
                print(f"  ! nav warning: {e}")
            await page.wait_for_timeout(4000)
            if captured["best"]:
                got = True
                break

        await browser.close()

    if not captured["best"]:
        print("\nNo tag-with-dates response captured. The page may paginate or use a "
              "different shape. Try opening the Tags settings page manually first.")
        return

    rows = captured["best"]
    # Normalize to {id, name, created_at, updated_at}
    norm = []
    for r in rows:
        norm.append({
            "id": r.get("id") or r.get("_id"),
            "name": r.get("name") or r.get("tagName"),
            "created_at": r.get("dateAdded") or r.get("createdAt"),
            "updated_at": r.get("dateUpdated") or r.get("updatedAt"),
        })
    OUT.write_text(json.dumps({
        "source_url": captured["url"],
        "count": len(norm),
        "sample_keys": list(rows[0].keys()),
        "tags": norm,
    }, indent=2), encoding="utf-8")
    print(f"\nSaved {len(norm)} tag rows -> {OUT}")
    print(f"Endpoint: {captured['url']}")
    print(f"Row keys available: {list(rows[0].keys())}")


if __name__ == "__main__":
    asyncio.run(main())
