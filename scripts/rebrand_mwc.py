# -*- coding: utf-8 -*-
"""Brand rule: never use the acronym "MWC" in message copy — expand to "Men's Wellness".

Replaces standalone uppercase MWC (\bMWC\b) only, in the patient-facing copy fields
("message"/"subject"). The booking domain BookMWC.com is protected automatically by the
word boundary (no \b between "Book" and "MWC"), verified zero collisions. Apostrophe form
"Men's Wellness" matches the brand spelling already used throughout the copy.

Idempotent. Writes data.json in place + audit/rebrand_mwc_changes.json. Leaves the earlier
rebrand_messages_changes.json untouched.

  python scripts/rebrand_mwc.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = ROOT / "plan-workspace" / "public" / "data.json"
LOG = ROOT / "audit" / "rebrand_mwc_changes.json"
COPY_FIELDS = ("message", "subject")

# Case-SENSITIVE uppercase MWC only — all 28 real occurrences are uppercase; avoids any
# lowercase edge and keeps bookmwc.com (lowercase, and boundary-protected) safe.
MWC = re.compile(r"\bMWC\b")

def main():
    d = json.load(open(DATA, encoding="utf-8"))
    changes = []
    for arr in ("messages_tobe", "messages_asis"):
        for i, m in enumerate(d[arr]):
            for f in COPY_FIELDS:
                if isinstance(m.get(f), str) and MWC.search(m[f]):
                    before = m[f]
                    after = MWC.sub("Men's Wellness", before)
                    if after != before:
                        m[f] = after
                        changes.append({"array": arr, "index": i, "field": f,
                                        "before": before, "after": after})
    json.dumps(d)
    json.dump(d, open(DATA, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    json.dump(changes, open(LOG, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))
    w("MWC -> Men's Wellness : %d copy fields changed  ·  log: %s" % (len(changes), LOG.name))

if __name__ == "__main__":
    main()
