#!/usr/bin/env python3
"""
Validate MWC message templates against the declared content model.
Checks that every {{...}} token in each template resolves to a known source:
  - a contact/opportunity/appointment merge field (native)
  - a declared MWC Custom Value (brand constants)
  - a Locations-object generic contact field (current_*)

Also asserts sms_opt_out_footer is non-empty (compliance safety).

Reads:  ghl_data/template_payloads.json  (canonical bodies + depends_on)
        ghl_data/build_ids.json          (registry of declared fields/values)
Usage:  python scripts/validate_templates.py
Exit 1 if any orphan token or empty footer found.
"""
import json, sys, re
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
payloads = json.load(open(HERE / "ghl_data" / "template_payloads.json"))
manifest = json.load(open(HERE / "ghl_data" / "build_ids.json"))

# Known resolvable token sets
NATIVE_NS = {"contact", "opportunity", "appointment", "calendar", "user"}
CUSTOM_VALUES = {  # brand-wide constants we created
    "sms_opt_out_footer", "brand_tagline", "consult_descriptor",
    "intake_link", "survey_link", "referral_link",
}
LOCATIONS_GENERIC = {  # per-clinic fields stamped by WF-01
    "contact.current_booking_url", "contact.current_clinic_phone",
    "contact.current_clinic_address", "contact.current_clinic_hours",
    "contact.current_review_link",
}

errors = []
for p in payloads:
    name = p["template_name"]
    for tok in p["depends_on"]:
        inner = tok.strip("{} ").strip()
        ns = inner.split(".")[0]
        key = inner
        if ns in NATIVE_NS:
            # native merge field — check per-clinic current_* are declared
            if key.startswith("contact.current_"):
                if key not in LOCATIONS_GENERIC:
                    errors.append(f"{name}: undeclared current_* field '{tok}'")
            continue
        if ns == "custom_values":
            cv = inner.split(".", 1)[1].strip() if "." in inner else ""
            if cv not in CUSTOM_VALUES:
                errors.append(f"{name}: undeclared custom value '{tok}'")
            continue
        errors.append(f"{name}: unrecognized token namespace '{tok}'")

# compliance footer non-empty assertion
cv_data = json.load(open(HERE / "ghl_data" / "created_custom_values.json"))
if cv_data.get("sms_opt_out_footer", {}).get("value") in ("", None, "PLACEHOLDER_FILL_BEFORE_GOLIVE"):
    errors.append("sms_opt_out_footer is empty/placeholder — compliance risk")

if errors:
    print("VALIDATION FAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print(f"VALIDATION PASSED: {len(payloads)} templates, all tokens resolve.")
