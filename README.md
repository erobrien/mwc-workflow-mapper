# MWC GHL "AS-IS" Workflow Mapper

Local Windows build of the GoHighLevel workflow mapper. Pulls every active
workflow's trigger / steps / branches / waits / message bodies and renders them as
a clickable branching tree, grouped by folder.

This is the Windows-adapted port of the original cloud spec: paths are repo-relative
(no `/home/user/workspace`), secrets live in your home dir (not the repo), and deploy
is a plain Vite build (no `pplx.app` tooling).

## Layout

```
mwc-workflow-mapper/
├── ghl_data/
│   ├── workflows.json            # all workflows (from public API)
│   ├── workflows_to_extract.json # the Active-Workflows subset (folder-grouped)
│   ├── folder_workflows.json     # folder -> [workflow ids]
│   ├── sms_templates.json        # SMS template library
│   ├── email_templates.json      # email template library
│   ├── app.json                  # merged viewer data (built by merge_steps.py)
│   └── workflow_steps/{id}.json  # one file per extracted workflow
├── scripts/
│   ├── auth.py                   # tokens + paths
│   ├── ghl_pull.py               # list workflows + templates (public API, PIT)
│   ├── capture_jwt.py            # auto-capture JWT from browser + run extraction
│   ├── extract_via_jwt.py        # full step extraction via app backend (needs JWT)
│   ├── extract_via_browser.py    # Playwright fallback (no JWT)
│   ├── merge_steps.py            # builds app.json + copies to viewer
│   └── requirements.txt
└── mwc-asis/                     # React + Vite + @xyflow/react viewer
```

## Secrets (kept out of the repo)

Drop tokens into your home directory:

- `%USERPROFILE%\.ghl_pit`  — location-scoped PIT token (for `ghl_pull.py`)
- `%USERPROFILE%\.ghl_jwt`  — app session `token-id` JWT (for `extract_via_jwt.py`)

Or set env vars `CUSTOM_CRED_SERVICES_LEADCONNECTORHQ_COM_TOKEN` / `GHL_AGENCY_PIT`.

### Easiest way to get the JWT (no DevTools)

```powershell
# one-time browser install
python -m playwright install chromium

# log in once → auto-captures JWT → extracts all workflows → rebuilds app.json
python scripts\capture_jwt.py
```

`capture_jwt.py` opens a Chromium window (reusing a persistent profile at
`%USERPROFILE%\.ghl_browser_profile`, so login persists across runs). You log into
GHL once and press Enter; the script sniffs the `token-id` header from
`backend.leadconnectorhq.com` network traffic, saves it to `%USERPROFILE%\.ghl_jwt`,
then automatically runs `extract_via_jwt` + `merge_steps` for you. Pass
`--capture-only` to just save the JWT without extracting.

### Manual way (fallback)

Open any workflow in GHL → DevTools → Network → reload → click any
`backend.leadconnectorhq.com` request → copy the `token-id` header value (`eyJ...`)
→ save it to `%USERPROFILE%\.ghl_jwt`.

## Run

### One-command flow (recommended)

```powershell
# 0. one-time setup
pip install -r scripts/requirements.txt
python -m playwright install chromium

# 1. log in once → auto-captures JWT → extracts all workflows → rebuilds app.json
python scripts\capture_jwt.py

# 2. build / preview the viewer
cd mwc-asis
npm run build
npm run preview
```

### Manual / step-by-step flow

```powershell
# 0. one-time python deps
pip install -r scripts/requirements.txt

# 1. list workflows + templates (needs ~/.ghl_pit)
python scripts/ghl_pull.py

# 2a. extract steps via JWT (preferred, needs ~/.ghl_jwt)
python scripts/extract_via_jwt.py probe   # inspect one response first
python scripts/extract_via_jwt.py

# 2b. OR browser fallback (no JWT) — logs in once, scrapes the builder UI
playwright install chromium
python scripts/extract_via_browser.py

# 3. merge everything into app.json (and copy into the viewer)
python scripts/merge_steps.py

# 4. build / preview the viewer
cd mwc-asis
npm run build
npm run preview
```

The viewer shows demo data until `merge_steps.py` produces a non-empty `app.json`.

## Notes

- Folder grouping in `ghl_pull.py` is heuristic (by name prefix `01.`/`02.`/…/`Onboarding`)
  because the public API doesn't return folder metadata. Adjust `ACTIVE_FOLDER_PREFIXES`
  if the 25-workflow count comes out wrong.
- The browser fallback produces best-effort linear ordering; branch targets are
  approximate. The JWT path is authoritative.
