"""One-command JWT capture + full workflow extraction for the MWC GHL mapper.

This automates getting the GHL app-backend session JWT (the ``token-id`` request
header) so you never have to open DevTools. It:

  1. Opens a headed Chromium window reusing the SAME persistent profile as the
     browser fallback (``~/.ghl_browser_profile``) so your GHL login persists.
  2. Waits for you to log into GHL (one time per profile).
  3. Sniffs network traffic to ``backend.leadconnectorhq.com`` and grabs the
     ``token-id`` header (falling back to ``Authorization: Bearer eyJ...``).
  4. Saves the JWT to ``~/.ghl_jwt``.
  5. Runs the full JWT-based extraction (``extract_via_jwt.main``) and rebuilds
     ``app.json`` (``merge_steps.main``) -- unless ``--capture-only`` is passed.

Setup (one time):
    pip install -r scripts/requirements.txt
    python -m playwright install chromium

Run:
    python scripts/capture_jwt.py               # capture + extract + merge
    python scripts/capture_jwt.py --capture-only # just capture the JWT
"""
import asyncio
import json
import sys
from pathlib import Path

from auth import DATA_DIR, JWT_PATH, LOCATION_ID, STEPS_DIR  # noqa: F401  (re-exported / used below)

# Reuse the same persistent browser profile as the Playwright fallback so the
# GHL session (cookies, login) is shared and survives across runs.
USER_DATA_DIR = Path.home() / ".ghl_browser_profile"

WORKFLOWS_FILE = DATA_DIR / "workflows_to_extract.json"
BACKEND_HOST = "backend.leadconnectorhq.com"
LOGIN_URL = "https://app.gohighlevel.com/"

# How long to wait (seconds) for a token-id-bearing backend request after we
# navigate to a workflow, before retrying.
TOKEN_WAIT_SECONDS = 30
NAV_RETRIES = 4

# How long (seconds) to wait for the user to finish logging in (incl. 2FA),
# polled every LOGIN_POLL_SECONDS.
LOGIN_TIMEOUT_SECONDS = 300
LOGIN_POLL_SECONDS = 2


def _mask(token: str) -> str:
    """Show only the last 6 characters of a secret for safe console output."""
    if not token:
        return "(empty)"
    return ("*" * max(0, len(token) - 6)) + token[-6:]


def _looks_like_jwt(value: str) -> bool:
    return isinstance(value, str) and value.strip().startswith("eyJ")


def _first_workflow_id() -> str | None:
    """Return the first workflow id from workflows_to_extract.json, or None."""
    if not WORKFLOWS_FILE.exists():
        return None
    try:
        workflows = json.loads(WORKFLOWS_FILE.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"  ! could not parse {WORKFLOWS_FILE.name}: {e}")
        return None
    if not isinstance(workflows, list) or not workflows:
        return None
    first = workflows[0]
    if isinstance(first, dict):
        return first.get("id")
    return None


def _extract_jwt_from_headers(headers: dict) -> str | None:
    """Pull a JWT out of a request's headers.

    Prefers the ``token-id`` header; falls back to ``Authorization: Bearer eyJ...``.
    Header keys from Playwright are already lower-cased.
    """
    token_id = headers.get("token-id")
    if _looks_like_jwt(token_id or ""):
        return token_id.strip()

    auth_header = headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        candidate = auth_header[len("bearer "):].strip()
        if _looks_like_jwt(candidate):
            return candidate
    return None


def _looks_logged_in(url: str) -> bool:
    """Heuristic: are we past the GHL login screen?

    GHL login happens on hosts/paths containing 'login' (e.g.
    app.gohighlevel.com/, login.* , /oauth, /signin). Once authenticated the
    app routes into '/location/<id>/...' or other in-app dashboard routes.
    """
    if not url:
        return False
    u = url.lower()
    # Still on a login/auth screen.
    if any(marker in u for marker in ("/login", "login.", "/signin", "/oauth", "/auth/")):
        return False
    # Clear "inside the app" signals.
    if "app.gohighlevel.com/location/" in u:
        return True
    if "/v2/location/" in u or "/dashboard" in u:
        return True
    # On the app host but not on a login path -> treat as logged in.
    if "app.gohighlevel.com" in u and u.rstrip("/") != "https://app.gohighlevel.com":
        return True
    return False


async def _capture_jwt() -> str | None:
    """Launch the browser, let the user log in, and capture the JWT.

    Returns the captured JWT string, or None on failure.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print(
            "ERROR: Playwright is not installed.\n"
            "  Install it with:\n"
            "    pip install -r scripts/requirements.txt\n"
            "    python -m playwright install chromium"
        )
        return None

    # A mutable holder the network listener can write into.
    captured: dict[str, str] = {}

    def on_request(request) -> None:
        try:
            if BACKEND_HOST not in request.url:
                return
            if "jwt" in captured:
                return
            token = _extract_jwt_from_headers(request.headers)
            if token:
                captured["jwt"] = token
                print(f"  >> captured token-id from: {request.url[:80]}")
        except Exception:  # noqa: BLE001  (never let a listener crash the run)
            pass

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch_persistent_context(
                str(USER_DATA_DIR),
                headless=False,
                viewport={"width": 1600, "height": 1000},
            )
        except Exception as e:  # noqa: BLE001
            print(
                "ERROR: could not launch Chromium.\n"
                f"  {e}\n"
                "  Did you run:  python -m playwright install chromium ?"
            )
            return None

        page = browser.pages[0] if browser.pages else await browser.new_page()
        page.on("request", on_request)

        print("\n" + "=" * 70)
        print("STEP 1 — LOG IN")
        print("=" * 70)
        print(f"Opening {LOGIN_URL}")
        try:
            await page.goto(LOGIN_URL)
        except Exception as e:  # noqa: BLE001
            print(f"  ! navigation warning (continuing anyway): {e}")

        print(
            "\n>>> A Chromium window just opened. Log into GoHighLevel there.\n"
            ">>> (If you're already logged in from a previous run, this is instant.)\n"
            ">>> Take your time — 2FA is fine. I'll auto-detect when you're in.\n"
        )
        # Auto-detect login by polling the page URL (no stdin needed, so this
        # works when the script is launched non-interactively). If the token-id
        # happens to fly by during login, we're done early.
        elapsed = 0
        logged_in = False
        while elapsed < LOGIN_TIMEOUT_SECONDS:
            if "jwt" in captured:
                logged_in = True
                break
            try:
                current = page.url
            except Exception:  # noqa: BLE001
                current = ""
            if _looks_logged_in(current):
                logged_in = True
                print(f"  ok login detected at: {current[:80]}")
                break
            if elapsed % 10 == 0:
                print(f"  waiting for login… ({elapsed}s)")
            await page.wait_for_timeout(LOGIN_POLL_SECONDS * 1_000)
            elapsed += LOGIN_POLL_SECONDS

        if not logged_in:
            print(
                f"\nERROR: login not detected within {LOGIN_TIMEOUT_SECONDS}s.\n"
                "  No JWT was captured. Please re-run and log in within the time limit."
            )
            await browser.close()
            return None

        print("\n" + "=" * 70)
        print("STEP 2 — CAPTURING JWT")
        print("=" * 70)

        wf_id = _first_workflow_id()
        if not wf_id:
            print(
                f"ERROR: {WORKFLOWS_FILE.name} not found or empty -- cannot auto-open a\n"
                "  workflow to trigger a backend request. Run ghl_pull.py first."
            )
            await browser.close()
            return None

        target = f"https://app.gohighlevel.com/location/{LOCATION_ID}/workflow/{wf_id}"
        print(f"Navigating to a workflow to trigger a backend request:\n  {target}")
        for attempt in range(1, NAV_RETRIES + 1):
            if "jwt" in captured:
                break
            try:
                await page.goto(target, wait_until="networkidle", timeout=45_000)
            except Exception as e:  # noqa: BLE001
                print(f"  ! navigation attempt {attempt} warning: {e}")
            # Give background XHRs time to fire and be observed.
            waited = 0
            while "jwt" not in captured and waited < TOKEN_WAIT_SECONDS:
                await page.wait_for_timeout(1_000)
                waited += 1
            if "jwt" in captured:
                break
            if attempt < NAV_RETRIES:
                print(
                    f"  ! no token-id seen yet (attempt {attempt}/{NAV_RETRIES}). "
                    "Reloading the workflow to retry..."
                )
                try:
                    await page.reload(wait_until="networkidle", timeout=45_000)
                except Exception:  # noqa: BLE001
                    pass

        jwt_value = captured.get("jwt")
        if jwt_value:
            try:
                JWT_PATH.write_text(jwt_value, encoding="utf-8")
                print(f"\n  ok JWT saved to {JWT_PATH}")
                print(f"     token-id = {_mask(jwt_value)}")
            except Exception as e:  # noqa: BLE001
                print(f"  ! failed to write JWT to {JWT_PATH}: {e}")
                jwt_value = None
        else:
            print(
                "\nERROR: could not capture a JWT.\n"
                "  Make sure you logged in and opened a workflow. You can also fall\n"
                "  back to grabbing the 'token-id' header manually via DevTools and\n"
                f"  saving it to {JWT_PATH}."
            )

        await browser.close()
        return jwt_value


def _run_extraction() -> None:
    """Run the JWT extraction + merge pipeline (post-capture)."""
    print("\n" + "=" * 70)
    print("STEP 3 — EXTRACTING WORKFLOWS (via JWT backend)")
    print("=" * 70)
    try:
        import extract_via_jwt
        extract_via_jwt.main()
    except SystemExit as e:
        print(f"  ! extraction stopped: {e}")
        return
    except Exception as e:  # noqa: BLE001
        print(f"  ! extraction failed: {e}")
        return

    print("\n" + "=" * 70)
    print("STEP 4 — REBUILDING app.json")
    print("=" * 70)
    try:
        import merge_steps
        merge_steps.main()
    except Exception as e:  # noqa: BLE001
        print(f"  ! merge failed: {e}")
        return

    print("\nDone. Open the viewer to see your workflows:")
    print("  cd mwc-asis && npm run build && npm run preview")


async def _async_main(capture_only: bool) -> int:
    STEPS_DIR.mkdir(parents=True, exist_ok=True)
    jwt_value = await _capture_jwt()
    if not jwt_value:
        return 1
    if capture_only:
        print("\n--capture-only set: skipping extraction + merge.")
        return 0
    # Extraction + merge are synchronous; run them after the browser is closed.
    _run_extraction()
    return 0


def main() -> int:
    capture_only = "--capture-only" in sys.argv[1:]
    if any(a in ("-h", "--help") for a in sys.argv[1:]):
        print(__doc__)
        return 0
    try:
        return asyncio.run(_async_main(capture_only))
    except KeyboardInterrupt:
        print("\nInterrupted.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
