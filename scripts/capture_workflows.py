"""Capture workflow definitions (with add/remove-tag actions) by driving the
GHL workflow builder in the logged-in browser profile and sniffing the network.

The public/PIT API only returns workflow metadata; the services backend
/workflow/ endpoint rejects the user JWT (E003). So we load each workflow's
builder page and capture whatever JSON response carries the actions/steps.

Usage:
  python scripts/capture_workflows.py probe   # open ONE builder, dump all
                                              # workflow-related response URLs +
                                              # which carry tag actions
  python scripts/capture_workflows.py         # capture ALL active workflows ->
                                              # ghl_data/workflow_defs/<id>.json
                                              # and build tag->workflows map ->
                                              # ghl_data/tag_workflow_refs.json
No PHI -- workflow structure only.
"""
import asyncio
import json
import sys
from pathlib import Path

from auth import DATA_DIR, LOCATION_ID

USER_DATA_DIR = Path.home() / ".ghl_browser_profile"
DEFS_DIR = DATA_DIR / "workflow_defs"
REFS_OUT = DATA_DIR / "tag_workflow_refs.json"
BUILDER = "https://app.gohighlevel.com/location/{loc}/workflow/{wid}"
# the in-app definition endpoint: backend.../workflow/{loc}/{wid}?...
DEF_HOST = "backend.leadconnectorhq.com"

# substrings that mark an add/remove-tag action in the raw builder JSON
TAG_ACTION_HINTS = ("addremovetag", "add_tag", "addtag", "removetag", "contact_tag")


def _walk(obj):
    """Yield every dict in a nested JSON structure."""
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from _walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk(v)


def _templates(body) -> list:
    """The step list lives at workflowData.templates."""
    wd = body.get("workflowData") if isinstance(body, dict) else None
    if isinstance(wd, dict) and isinstance(wd.get("templates"), list):
        return wd["templates"]
    return []


def _looks_like_workflow_def(body) -> bool:
    return bool(_templates(body))


def _tag_names_from(attrs: dict) -> list[str]:
    """Pull tag name strings from a tag-action's attributes."""
    out = []
    tags = attrs.get("tags")
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, str):
                out.append(t)
            elif isinstance(t, dict):
                n = t.get("name") or t.get("label") or t.get("value") or t.get("tag")
                if n:
                    out.append(n)
    for k in ("tag", "tagName", "value"):
        v = attrs.get(k)
        if isinstance(v, str) and v:
            out.append(v)
    return out


def extract_tag_actions(body) -> list[dict]:
    """Pull every add/remove-tag action from workflowData.templates."""
    found = []
    for t in _templates(body):
        typ = str(t.get("type", "")).lower()
        attrs = t.get("attributes") or {}
        is_tag = "tag" in typ or "tag" in str(attrs.get("hybridActionType", "")).lower() or isinstance(attrs.get("tags"), list)
        if not is_tag:
            continue
        action = "remove" if "remove" in typ or "remove" in str(attrs.get("name", "")).lower() else "add"
        for name in _tag_names_from(attrs):
            found.append({"tag": name, "action": action, "step": t.get("name")})
    uniq = {(f["tag"].lower(), f["action"]): f for f in found}
    return list(uniq.values())


async def run(probe_only: bool):
    from playwright.async_api import async_playwright

    workflows = json.loads((DATA_DIR / "workflows_to_extract.json").read_text(encoding="utf-8"))
    if probe_only:
        workflows = workflows[:1]
    DEFS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR), headless=False, viewport={"width": 1600, "height": 1000},
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()

        state = {"defs": [], "urls": []}

        cur = {"wid": None}

        async def on_response(resp):
            try:
                url = resp.url
                if DEF_HOST not in url or "json" not in resp.headers.get("content-type", ""):
                    return
                # the definition endpoint is /workflow/{loc}/{wid}?... (wid is the
                # last path segment before the query, and matches the current wf)
                if cur["wid"] and f"/workflow/{LOCATION_ID}/{cur['wid']}" in url:
                    body = await resp.json()
                    state["defs"].append(body)
                    state["urls"].append(url)
            except Exception:
                pass

        page.on("response", lambda r: asyncio.create_task(on_response(r)))

        tag_refs: dict[str, list] = {}
        for i, wf in enumerate(workflows, 1):
            state["defs"].clear()
            wid = wf["id"]
            cur["wid"] = wid
            url = BUILDER.format(loc=LOCATION_ID, wid=wid)
            print(f"[{i}/{len(workflows)}] {wf['name'][:50]}")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            except Exception as e:
                print(f"   nav warn: {str(e)[:60]}")
            # give the builder time to fetch its definition
            await page.wait_for_timeout(6000)

            if not state["defs"]:
                print("   ! no workflow definition response captured")
                continue

            # pick the richest captured body
            body = max(state["defs"], key=lambda b: len(json.dumps(b)))
            if probe_only:
                print("   captured response URLs:")
                for u in set(state["urls"]):
                    print("     ", u[:110])
                acts = extract_tag_actions(body)
                print(f"   tag actions found: {len(acts)}")
                for a in acts[:20]:
                    print("     ", a)
                (DEFS_DIR / f"_probe_{wid}.json").write_text(json.dumps(body, indent=2)[:200000], encoding="utf-8")
                print(f"   raw body saved -> {DEFS_DIR / ('_probe_'+wid+'.json')}")
                break

            (DEFS_DIR / f"{wid}.json").write_text(json.dumps(body, indent=2), encoding="utf-8")
            acts = extract_tag_actions(body)
            for a in acts:
                tag_refs.setdefault(a["tag"], []).append(
                    {"workflow": wf["name"], "workflow_id": wid, "action": a["action"]})
            print(f"   {len(acts)} tag actions")

        await browser.close()

        if not probe_only:
            REFS_OUT.write_text(json.dumps({
                "generated_for": LOCATION_ID,
                "workflow_count": len(workflows),
                "tags_referenced": len(tag_refs),
                "refs": tag_refs,
            }, indent=2), encoding="utf-8")
            print(f"\nSaved tag->workflow refs ({len(tag_refs)} tags) -> {REFS_OUT}")


if __name__ == "__main__":
    asyncio.run(run(probe_only=(len(sys.argv) > 1 and sys.argv[1] == "probe")))
