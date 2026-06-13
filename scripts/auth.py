"""Centralized auth helpers for the MWC GHL workflow mapper.

Tokens are read from files in the user's home directory so they never live in
the repo:
  ~/.ghl_jwt  -> app session JWT (token-id) for backend.leadconnectorhq.com
  ~/.ghl_pit  -> location-scoped PIT token for services.leadconnectorhq.com

The agency PIT is taken from the env var GHL_AGENCY_PIT if present, otherwise
falls back to the value from the build spec.
"""
import os
from pathlib import Path

LOCATION_ID = "Ghstz8eIsHWLeXek47dk"
COMPANY_ID = "xkONhHmk6IiSEOV55iEa"
ACTIVE_WORKFLOWS_FOLDER = "1ba4f448-9ea3-4db8-8bac-df05f10d728f"

# Repo paths (resolved relative to this file so it works on any OS / location).
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "ghl_data"
STEPS_DIR = DATA_DIR / "workflow_steps"

JWT_PATH = Path.home() / ".ghl_jwt"
PIT_PATH = Path.home() / ".ghl_pit"

PIT_AGENCY = os.environ.get("GHL_AGENCY_PIT", "pit-08365684-eae6-4c5e-8245-58774f9c4378")

SERVICES = "https://services.leadconnectorhq.com"
BACKEND = "https://backend.leadconnectorhq.com"
API_VERSION = "2021-07-28"


def jwt() -> str:
    """App session JWT for the GHL app backend. Must be captured from a logged-in
    browser session (DevTools -> Network -> any backend.leadconnectorhq request ->
    copy the 'token-id' header value)."""
    if not JWT_PATH.exists():
        raise SystemExit(
            f"JWT not found at {JWT_PATH}.\n"
            "Get it from DevTools and save it there:\n"
            "  Open any workflow -> Network tab -> reload -> click any\n"
            "  backend.leadconnectorhq.com request -> copy the 'token-id' header\n"
            "  value (starts with eyJ...) and save to ~/.ghl_jwt"
        )
    return JWT_PATH.read_text(encoding="utf-8").strip()


def pit_location() -> str:
    """Location-scoped Private Integration Token for the public REST API."""
    env = os.environ.get("CUSTOM_CRED_SERVICES_LEADCONNECTORHQ_COM_TOKEN", "").strip()
    if env:
        return env
    if PIT_PATH.exists():
        return PIT_PATH.read_text(encoding="utf-8").strip()
    raise SystemExit(
        f"Location PIT token not found. Set the env var\n"
        "  CUSTOM_CRED_SERVICES_LEADCONNECTORHQ_COM_TOKEN\n"
        f"or save the token to {PIT_PATH}."
    )


def backend_headers() -> dict:
    j = jwt()
    return {
        "Authorization": f"Bearer {j}",
        "token-id": j,
        "channel": "APP",
        "source": "WEB_USER",
        "Version": API_VERSION,
        "Accept": "application/json",
    }


def services_headers(use_agency: bool = False) -> dict:
    token = PIT_AGENCY if use_agency else pit_location()
    return {
        "Authorization": f"Bearer {token}",
        "Version": API_VERSION,
        "Accept": "application/json",
    }
