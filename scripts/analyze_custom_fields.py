"""Analyze custom fields and generate AI-powered suggestions for cleanup.

Reads custom_fields.json and generates suggestions for:
1. Field disposition (Keep, Archive, Delete, Cleanup)
2. Field purpose/description (what it's for)
3. Cleanup actions (rename, consolidate, deprecate)

Uses heuristics:
- Unused fields (0 contacts) → suggest Delete
- Deprecated patterns (old date suffixes, junk prefixes) → suggest Delete
- Duplicate-looking names → suggest Consolidate/Merge
- Suspicious naming (test, temp, old, backup) → suggest Delete
- High usage common fields → suggest Keep
- Form-wired fields → Keep (even if unused, they're in use via forms)
- Confusing names → suggest Cleanup (rename for clarity)

Output: Updates custom_fields.json with suggested_* fields.
  python scripts/analyze_custom_fields.py
"""
import json
import re
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
CUSTOM_FIELDS_PATH = ROOT / "plan-workspace" / "public" / "custom_fields.json"

# Load data
with open(CUSTOM_FIELDS_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

fields = data.get("fields", [])

# Patterns that suggest deletion
JUNK_PATTERNS = [
    r"^(test|temp|old|backup|deprecated|junk|trash|delete|xxx|zzz|debug)",
    r"(test|temp|old|backup|deprecated|junk|trash)(_|$)",
    r"^copy\s+of\b",
    r"^duplicate",
    r"\[do not use\]",
    r"\(archived\)",
]

# Patterns for cleanup (confusing names)
CONFUSING_PATTERNS = [
    r"^\s+",  # leading whitespace
    r"^_",    # leading underscore
    r"[\n\r\t]",  # newlines/tabs in name
    r"\s{2,}",  # double spaces
]

# Common field name patterns that are usually kept
KEEPER_PATTERNS = [
    r"(first|last|name|email|phone|address|date|status)",
    r"(created|updated|modified)",
    r"(id|key|code)",
]

def suggest_disposition(field):
    """Suggest a disposition for this field."""
    name = field.get("name", "").lower().strip()
    count = field.get("count", 0)
    form_refs = field.get("form_refs", [])

    # If used in forms, keep it
    if form_refs:
        return "keep", f"Used by {len(form_refs)} form(s); wired into workflow."

    # If has significant usage, likely keep
    if count >= 100:
        return "keep", f"Used by {count} contacts; core operational field."
    if count >= 20:
        return "keep", f"Moderate usage ({count} contacts); appears to be in use."

    # Check for junk/test patterns
    for pattern in JUNK_PATTERNS:
        if re.search(pattern, name):
            reason = f"Matches junk pattern: {pattern}. Safe to delete."
            return "delete", reason

    # If unused, suggest archive first (safer than delete)
    if count == 0:
        # Check if it's a keeper (common field names)
        for pattern in KEEPER_PATTERNS:
            if re.search(pattern, name):
                return "keep", f"Common field name pattern; likely intentional."
        return "archive", "No usage; candidate for archival. Review before deleting."

    # Borderline usage (1-20 contacts)
    if count < 20:
        # Check if it looks deprecated
        if "date" in name or any(re.search(p, name) for p in [r"\d{4}", r"_\d{2}$"]):
            return "cleanup", f"Low usage ({count} contacts) + date-like name; may be deprecated."
        return "cleanup", f"Low usage ({count} contacts); verify still needed."

    return None, None

def suggest_description(field):
    """Generate a suggested description based on field characteristics."""
    name = field.get("name", "").strip()
    count = field.get("count", 0)
    type_ = field.get("type", "")
    form_refs = field.get("form_refs", [])

    parts = []

    # Infer purpose from name
    if any(x in name.lower() for x in ["name", "title"]):
        parts.append("Contact name/title")
    elif any(x in name.lower() for x in ["email"]):
        parts.append("Email address")
    elif any(x in name.lower() for x in ["phone"]):
        parts.append("Phone number")
    elif any(x in name.lower() for x in ["address"]):
        parts.append("Contact address")
    elif any(x in name.lower() for x in ["price", "cost", "amount", "fee"]):
        parts.append("Pricing/cost data")
    elif any(x in name.lower() for x in ["product", "service", "treatment"]):
        parts.append("Product/service selection")
    elif any(x in name.lower() for x in ["status", "state"]):
        parts.append("Status/state indicator")
    elif any(x in name.lower() for x in ["date", "time"]):
        parts.append("Date/time information")
    elif any(x in name.lower() for x in ["note", "comment", "remark"]):
        parts.append("Text notes/comments")

    # Add usage info
    if form_refs:
        parts.append(f"Captured by form(s): {', '.join(form_refs[:2])}")
    if count > 0:
        parts.append(f"Used by {count} contacts")

    if parts:
        return ". ".join(parts) + "."
    return None

def suggest_reason(field, disposition):
    """Generate reasoning for the suggestion."""
    if not disposition:
        return None

    name = field.get("name", "").lower()
    count = field.get("count", 0)
    form_refs = field.get("form_refs", [])

    if disposition == "keep":
        if form_refs:
            return f"Active in forms; {len(form_refs)} form(s) depend on this field."
        if count >= 100:
            return f"High usage ({count} contacts); core operational field."
        return f"Standard field with intentional naming pattern."

    elif disposition == "delete":
        for pattern in JUNK_PATTERNS:
            if re.search(pattern, name):
                return f"Matches junk/test pattern; no longer needed."
        if count == 0 and not form_refs:
            return f"No usage anywhere; safe to delete."
        return "Clearly deprecated/junk."

    elif disposition == "archive":
        if count == 0 and not form_refs:
            return f"Zero usage; archive as backup before deletion."
        return "Low/no usage; suggest archival before delete."

    elif disposition == "cleanup":
        if count < 20:
            return f"Low usage ({count} contacts); verify still needed and clarify naming."
        if any(x in name for x in ["date", "_0", "_copy"]):
            return "Appears deprecated or partially migrated; needs cleanup/consolidation."
        return "Unclear purpose or suspicious naming; needs review."

    return None

# Generate suggestions
change_count = 0
for field in fields:
    disp, reason_text = suggest_disposition(field)
    if disp:
        field["suggested_disposition"] = disp
        field["suggested_reason"] = reason_text
        field["suggested_description"] = suggest_description(field)
        change_count += 1

print(f"\nAnalyzed {len(fields)} fields")
print(f"Generated suggestions for {change_count} fields")

# Disposition breakdown
disp_counts = {}
for f in fields:
    d = f.get("suggested_disposition", "")
    if d:
        disp_counts[d] = disp_counts.get(d, 0) + 1

if disp_counts:
    print("\nSuggestion breakdown:")
    for disp in ["keep", "cleanup", "archive", "delete"]:
        if disp in disp_counts:
            print(f"  {disp.title():12} {disp_counts[disp]:3} fields")

# Save updated data
data["analysis_generated_at"] = datetime.utcnow().isoformat() + "Z"
with open(CUSTOM_FIELDS_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"\nUpdated {CUSTOM_FIELDS_PATH}")
