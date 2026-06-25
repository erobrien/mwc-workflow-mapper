# -*- coding: utf-8 -*-
"""Brand rule: in message copy (SMS/email/voicemail/etc.), use "Men's Wellness" — not the
longer "Men's Wellness Centers". Applies to message/subject fields of messages_tobe + messages_asis.

Preserves each occurrence's apostrophe variant (straight ' or curly ’). The lowercase domain
menswellnesscenters.com is a different string and is left untouched. Idempotent. Writes data.json +
audit/rebrand_mwc_short_changes.json. Flags any legal-authorization context for human review.
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).parent.parent
DATA = ROOT / "plan-workspace" / "public" / "data.json"
LOG = ROOT / "audit" / "rebrand_mwc_short_changes.json"
COPY = ("message", "subject")
STRAIGHT = "Men's Wellness Centers"
CURLY = "Men’s Wellness Centers"
w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))

d = json.load(open(DATA, encoding="utf-8"))
changes, legal_flags = [], []
for arr in ("messages_tobe", "messages_asis"):
    for i, m in enumerate(d[arr]):
        for f in COPY:
            t = m.get(f)
            if not isinstance(t, str) or ("Men" not in t):
                continue
            if STRAIGHT in t or CURLY in t:
                # flag legal/authorization usage (entity name may be required there)
                for mt in re.finditer(r"Men.s Wellness Centers", t):
                    ctx = t[max(0, mt.start() - 40):mt.end() + 10].lower()
                    if re.search(r"authorize|consent|licensed provider|liability|hipaa|llc|inc\.", ctx):
                        legal_flags.append({"array": arr, "index": i, "field": f, "context": t[max(0, mt.start() - 40):mt.end() + 20]})
                after = t.replace(STRAIGHT, "Men's Wellness").replace(CURLY, "Men’s Wellness")
                if after != t:
                    m[f] = after
                    changes.append({"array": arr, "index": i, "field": f, "before": t, "after": after})

json.dumps(d)
json.dump(d, open(DATA, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
json.dump(changes, open(LOG, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
w("Men's Wellness Centers -> Men's Wellness : %d copy fields changed" % len(changes))
if legal_flags:
    w("\n!! %d legal/authorization contexts kept the full entity name? (REVIEW — they were shortened too):" % len(legal_flags))
    for lf in legal_flags[:8]:
        w("   [%s#%d.%s] ...%s..." % (lf["array"], lf["index"], lf["field"], lf["context"]))
else:
    w("no legal/authorization contexts detected — safe blanket shortening")
