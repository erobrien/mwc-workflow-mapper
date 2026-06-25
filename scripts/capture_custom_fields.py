"""Capture all custom fields from GHL contact schema with usage stats.

Fetches:
1. Custom fields schema from /customFields endpoint
2. Usage count per field by paging through all contacts
3. Form/survey field references (which fields are wired into forms)

Output: plan-workspace/public/custom_fields.json
Format: {pulled_at, total_contacts, fields: [{id, name, fieldKey, type, count, form_refs, ...}]}

  python scripts/capture_custom_fields.py
"""
import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS = json.load(open(os.path.join(ROOT, "secrets.json"), encoding="utf-8"))
TOKEN = SECRETS.get("ghl_token")
LOC = SECRETS.get("ghl_location_id")
OUT = Path(ROOT) / "plan-workspace" / "public" / "custom_fields.json"

B = "https://services.leadconnectorhq.com"

def get(path, version="2021-07-28"):
    """Make a GET request to GHL API with retries."""
    req = urllib.request.Request(
        B + path,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Version": version,
            "Accept": "application/json",
            "User-Agent": "MWC-FieldCapture/1.0",
        },
        method="GET",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            print(f"HTTP {e.code} at {path}")
            return e.code, {}
        except Exception as e:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            print(f"Error fetching {path}: {e}")
            return -1, {}

# ─── 1. Fetch custom fields schema ───────────────────────────────────────
print("Fetching custom fields schema...")
code, data = get(f"/locations/{LOC}/customFields")
if code != 200:
    print(f"Failed to fetch schema: HTTP {code}")
    exit(1)

fields = data.get("customFields", [])
id_to_field = {f["id"]: f for f in fields}
print(f"Found {len(fields)} custom fields")

# Initialize usage counts
for f in fields:
    f["count"] = 0
    f["form_refs"] = []

# ─── 2. Page through all contacts and count field usage ───────────────────
print("Scanning contact field usage...")
seen = 0
start_after = None
start_after_id = None
page = 0

while True:
    q = f"/contacts/?locationId={LOC}&limit=100"
    if start_after and start_after_id:
        q += f"&startAfter={start_after}&startAfterId={start_after_id}"

    code, payload = get(q)
    if code != 200:
        print(f"Stop: HTTP {code} after {seen} contacts")
        break

    contacts = payload.get("contacts", [])
    if not contacts:
        break

    for contact in contacts:
        seen += 1
        custom_fields = contact.get("customFields") or contact.get("customField") or []
        for cf in custom_fields:
            field_id = cf.get("id")
            value = cf.get("value")
            if field_id in id_to_field and value not in (None, "", [], {}):
                id_to_field[field_id]["count"] = id_to_field[field_id].get("count", 0) + 1

    meta = payload.get("meta", {})
    start_after = meta.get("startAfter")
    start_after_id = meta.get("startAfterId")
    page += 1

    if page % 10 == 0:
        print(f"  scanned {seen} contacts...")

    if not meta.get("nextPageUrl") and not start_after_id:
        break

    if page > 500:  # safety cap
        print("Safety cap (500 pages) reached")
        break

print(f"Scanned {seen} contacts total")

# ─── 3. Fetch form field references ──────────────────────────────────────
print("Fetching form field references...")
code, forms_data = get(f"/forms/?locationId={LOC}&limit=100")
if code == 200:
    for form in forms_data.get("forms", []):
        fields_in_form = form.get("fields", [])
        for field_ref in fields_in_form:
            # Field ref might be {id, ...} or just {customFieldId, ...}
            fid = field_ref.get("id") or field_ref.get("customFieldId")
            if fid and fid in id_to_field:
                refs = id_to_field[fid].get("form_refs", [])
                form_name = form.get("name", form.get("id", "unknown"))
                if form_name not in refs:
                    refs.append(form_name)
                id_to_field[fid]["form_refs"] = refs

print("Fetching survey field references...")
code, surveys_data = get(f"/surveys/?locationId={LOC}&limit=50")
if code == 200:
    for survey in surveys_data.get("surveys", []):
        fields_in_survey = survey.get("fields", [])
        for field_ref in fields_in_survey:
            fid = field_ref.get("id") or field_ref.get("customFieldId")
            if fid and fid in id_to_field:
                refs = id_to_field[fid].get("form_refs", [])
                survey_name = survey.get("name", survey.get("id", "unknown"))
                if f"{survey_name} (survey)" not in refs:
                    refs.append(f"{survey_name} (survey)")
                id_to_field[fid]["form_refs"] = refs

# ─── 4. Build output and save ────────────────────────────────────────────
output = {
    "pulled_at": datetime.utcnow().isoformat() + "Z",
    "total_contacts": seen,
    "total_fields": len(fields),
    "fields": sorted(
        [
            {
                "id": f["id"],
                "name": f.get("name", ""),
                "fieldKey": f.get("fieldKey", ""),
                "type": f.get("fieldType", f.get("type", "")),
                "count": f.get("count", 0),
                "form_refs": f.get("form_refs", []),
                "created_at": f.get("createdAt"),
                "updated_at": f.get("updatedAt"),
            }
            for f in fields
        ],
        key=lambda x: x["name"].lower(),
    ),
}

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fp:
    json.dump(output, fp, indent=2)

print(f"\nSaved {len(fields)} fields to {OUT}")
print(f"Fields with usage: {sum(1 for f in output['fields'] if f['count'] > 0)}")
print(f"Fields in forms: {sum(1 for f in output['fields'] if f['form_refs'])}")
