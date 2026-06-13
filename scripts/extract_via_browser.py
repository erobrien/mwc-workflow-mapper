"""Fallback extractor: scrape workflow steps from the GHL builder UI with Playwright.

Use this when no JWT is available. It launches a persistent Chromium profile so you
log into GHL once and the session is reused across runs.

Setup (one time):
    pip install playwright requests
    playwright install chromium

Run:
    python scripts/extract_via_browser.py

It reads ghl_data/workflows_to_extract.json and writes one
ghl_data/workflow_steps/{id}.json per workflow, plus a normalized steps[] list
(best effort) so the merge + viewer pipeline works.
"""
import asyncio
import json
import time
from pathlib import Path

from playwright.async_api import async_playwright

from auth import DATA_DIR, LOCATION_ID, STEPS_DIR

USER_DATA_DIR = Path.home() / ".ghl_browser_profile"

# (normalized step type, css selector). Order matters only for fallback labelling;
# final ordering is by on-canvas position (y, then x).
BUTTON_QUERIES = [
    ("end", 'button:has-text("END")'),
    ("trigger", 'button:has-text("Stats")'),
    ("send_sms", 'button:has-text("Send SMS")'),
    ("send_email", 'button:has-text("Send Email")'),
    ("wait", 'button:has-text("Wait")'),
    ("if_else", 'button:has-text("If \\"")'),
    ("if_else", 'button:has-text("When none")'),
    ("action", 'button:has-text("Action")'),
]


async def extract_workflow(page, wf_meta: dict) -> None:
    wf_id = wf_meta["id"]
    url = f"https://app.gohighlevel.com/location/{LOCATION_ID}/workflow/{wf_id}"
    await page.goto(url, wait_until="networkidle")
    await page.wait_for_timeout(3000)

    iframe = page.frame_locator('iframe[title*="Workflow Builder" i]')
    try:
        await iframe.locator('[aria-label*="Fit"]').click(timeout=2000)
    except Exception:
        pass
    await page.wait_for_timeout(1000)

    raw_buttons = []
    seen = set()
    for kind, sel in BUTTON_QUERIES:
        try:
            els = await iframe.locator(sel).all()
            for el in els:
                txt = (await el.inner_text()).strip()
                box = await el.bounding_box() or {}
                key = (txt, round(box.get("x", 0)), round(box.get("y", 0)))
                if key in seen:
                    continue
                seen.add(key)
                raw_buttons.append({
                    "kind": kind, "text": txt,
                    "x": box.get("x", 0), "y": box.get("y", 0),
                })
        except Exception as e:
            print(f"  ! {kind}: {e}")

    raw_buttons.sort(key=lambda b: (b["y"], b["x"]))

    # Click each SMS/Email button -> grab body from the detail panel.
    bodies: dict[str, dict] = {}
    for b in [x for x in raw_buttons if x["kind"] in ("send_sms", "send_email")]:
        try:
            await iframe.locator(f'button:has-text("{b["text"][:50]}")').first.click()
            await page.wait_for_timeout(800)
            template_name = subject = body = ""
            try:
                template_name = await page.locator('.detail-panel h2').inner_text()
            except Exception:
                pass
            try:
                subject = await page.locator('.detail-panel [data-testid="subject"]').inner_text()
            except Exception:
                pass
            try:
                body = await page.locator('.detail-panel [data-testid="body"]').inner_text()
            except Exception:
                try:
                    body = await page.locator('.detail-panel textarea').inner_text()
                except Exception:
                    pass
            bodies[b["text"]] = {"template_name": template_name.strip(),
                                 "subject": subject.strip(), "body": body.strip()}
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(400)
        except Exception as e:
            print(f"  ! message extract failed for {b['text'][:30]}: {e}")

    # Build best-effort normalized steps (linear ordering from canvas position).
    steps = []
    sms_n = email_n = wait_n = if_n = 0
    for i, b in enumerate(raw_buttons):
        step = {"id": f"step-{i}", "index": i, "type": b["kind"],
                "title": b["text"][:120], "parent_id": None, "branch": None,
                "next_id": f"step-{i + 1}" if i + 1 < len(raw_buttons) else None,
                "raw": b}
        if b["kind"] == "send_sms":
            info = bodies.get(b["text"], {})
            step["sms"] = {"template_id": None, "template_name": info.get("template_name"),
                           "from": None, "body": info.get("body")}
            sms_n += 1
        elif b["kind"] == "send_email":
            info = bodies.get(b["text"], {})
            step["email"] = {"template_id": None, "template_name": info.get("template_name"),
                             "from": None, "subject": info.get("subject"),
                             "html": info.get("body"), "plain": None}
            email_n += 1
        elif b["kind"] == "wait":
            step["wait"] = {"duration": None, "unit": None, "until_event": None,
                            "business_hours": False}
            wait_n += 1
        elif b["kind"] == "if_else":
            step["condition"] = {"label": b["text"], "branches": []}
            if_n += 1
        steps.append(step)

    out = {
        "id": wf_id,
        "name": wf_meta["name"],
        "folder": wf_meta["folder"],
        "status": wf_meta.get("status", "Published"),
        "version": 1,
        "extracted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "extraction_method": "dom_scrape",
        "triggers": [{"id": "trigger-0", "type": "Trigger", "filters": [], "raw": {}}],
        "steps": steps,
        "messages_referenced": [
            {"step_id": s["id"], "kind": "sms" if s["type"] == "send_sms" else "email",
             "template_id": None,
             "template_name": (s.get("sms") or s.get("email") or {}).get("template_name")}
            for s in steps if s["type"] in ("send_sms", "send_email")
        ],
        "stats": {"total_steps": len(steps), "send_sms_count": sms_n,
                  "send_email_count": email_n, "wait_count": wait_n,
                  "if_else_count": if_n,
                  "terminal_paths": sum(1 for s in steps if s["type"] == "end")},
        "notes": "Best-effort DOM extraction. Branch order/targets approximate "
                 "(buttons sorted by canvas y,x). Verify against the builder.",
    }
    (STEPS_DIR / f"{wf_id}.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"  ok {len(steps)} steps, {sms_n} SMS, {email_n} email")


async def main() -> None:
    STEPS_DIR.mkdir(parents=True, exist_ok=True)
    workflows = json.loads((DATA_DIR / "workflows_to_extract.json").read_text(encoding="utf-8"))
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR), headless=False,
            viewport={"width": 1600, "height": 1000},
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()
        await page.goto("https://app.gohighlevel.com/")
        input("\n>>> Log into GHL in the browser, then press Enter to continue...\n")
        for i, wf in enumerate(workflows, 1):
            print(f"[{i}/{len(workflows)}] {wf['name']}")
            try:
                await extract_workflow(page, wf)
            except Exception as e:
                print(f"  FAILED: {e}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
