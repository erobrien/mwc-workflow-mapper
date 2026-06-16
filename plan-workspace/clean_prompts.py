# -*- coding: utf-8 -*-
"""
Clean the captured execution prompts for the rebuilt workspace.

Drops the prompts that only exist to build the rejected custom objects (and their
contact-side caches), and scrubs the Lead Source FK + external-billing references
from the survivors. Attribution + consent stay canonical on the Contact; revenue
truth is the opportunity value.

Input : prompts.raw.json   (extracted verbatim from the deployed bundle)
Output: public/prompts.json
  python clean_prompts.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
arr = json.load(open(os.path.join(HERE, "prompts.raw.json"), encoding="utf-8"))

DROP = {"s1a-create-lead-source", "s1b-create-consent-log",
        "s1d-add-contact-cache-fields", "p0c-spike"}

# line-level removals (a prompt line containing any of these is dropped entirely)
LINE_KILL = [
    "Confirm lead_source object_id is in migration/s1a-lead-source-create.json",
    "opportunity.lead_source_id (TEXT) - FK lead_source.id",
    "opportunity.lead_source_id FK references lead_source.id",
    "Look up billing record (system named by Decision #5)",
    "Decision #5: Billing system identity",
    "BLOCKED until Decision #5 lands.",
]
# whole-string replacements applied to every text field
REPLACE = [
    ("opportunity / lead-source fields receive parallel writes",
     "opportunity fields receive parallel writes"),
    ("Phase B - Create the Lead Source custom object (or denorm to opp fields if spike failed)",
     "Phase B - Copy the latest UTM + click IDs onto the Opportunity at create (attribution also stays on the Contact; no separate object)"),
    ("Lead Source object or denorm fields", "Attribution copied onto the Opportunity"),
    ("Validation: Σ proposed monetaryValue ≤ Σ billing.",
     "Validation: Σ proposed monetaryValue reconciles against the opportunity values."),
    ("system named by Decision #5", "the opportunity value"),
    ("FK to Lead Source + EMR)", "attribution copy + EMR FK)"),
    ("Includes the FK to Lead Source (for revenue-to-campaign attribution) and the FK slot for EMR Visit.",
     "Includes a copy of the lead's attribution (UTM + click IDs) on the Opportunity for revenue-to-campaign reporting, and the FK slot for EMR Visit."),
]

def scrub(text):
    if not isinstance(text, str):
        return text
    lines = [ln for ln in text.split("\n") if not any(k in ln for k in LINE_KILL)]
    text = "\n".join(lines)
    for a, b in REPLACE:
        text = text.replace(a, b)
    return text

out = []
for p in arr:
    if p["id"] in DROP:
        continue
    for key, val in list(p.items()):
        if isinstance(val, str):
            p[key] = scrub(val)
        elif isinstance(val, list):
            # scrub each item and drop any that are emptied or kill-listed
            p[key] = [s for s in (scrub(v) for v in val) if not isinstance(s, str) or s.strip()]
    out.append(p)

json.dump(out, open(os.path.join(HERE, "public", "prompts.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

print("cleaned -> public/prompts.json :", len(out), "prompts (was", len(arr), ")")
blob = json.dumps(out, ensure_ascii=False).lower()
for t in ("lead_source_id", "lead source custom object", "consent log", "custom object spike",
          "≤ Σ billing", "decision #5"):
    print("  contains %-26s : %s" % (t, t in blob))
remaining = sorted(set(re.findall(r"custom object", blob)))
print("  'custom object' mentions remaining:", blob.count("custom object"))
