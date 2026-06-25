# -*- coding: utf-8 -*-
"""Apply MWC brand-voice rules to message copy in plan-workspace/public/data.json.

Rules (from client):
  1. Never say "Free" -> "no-cost" / "at no cost". PRESERVE idioms "feel free", "toll free/toll-free".
  2. No GHL booking links -> bookmwc.com (main), bookmwc.com/intake (intake).
  3. "consultation" -> "appointment".
  4. "advisor" -> {{pcc_name}} (merge tokens) / "consultant" (prose).

Only the patient-facing copy fields are touched: "message" and "subject".
Internal label fields (id_name, workflow_step, timing, type, channel, status, step) are left intact.

Writes data.json in place and a reviewable change log to audit/rebrand_messages_changes.json.
Idempotent: re-running makes no further changes.

  python scripts/rebrand_messages.py
"""
import json, re, os, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = ROOT / "plan-workspace" / "public" / "data.json"
AUDIT = ROOT / "audit"; AUDIT.mkdir(exist_ok=True)
LOG = AUDIT / "rebrand_messages_changes.json"

COPY_FIELDS = ("message", "subject")

def preserve_case(original, replacement):
    if original.isupper(): return replacement.upper()
    if original[:1].isupper(): return replacement[:1].upper() + replacement[1:]
    return replacement

# ── 2. Booking links (run FIRST so URL substrings aren't mangled by later rules) ──
def fix_links(t):
    t = re.sub(r"https?://(?:www\.)?go\.menswellnesscenters\.com/medical-intake\b", "bookmwc.com/intake", t, flags=re.I)
    t = re.sub(r"https?://(?:www\.)?menswellnesscenters\.com/book-a-consultation/?", "BookMWC.com", t, flags=re.I)
    # GHL booking-link merge token -> the on-brand main driver
    t = t.replace("{{booking_link}}", "BookMWC.com")
    return t

# ── 4. advisor ───────────────────────────────────────────────────────────────
def fix_advisor(t):
    # merge tokens: {{advisor_name}} / {{ advisor_xxx }} -> pcc variant
    t = re.sub(r"\{\{\s*advisor_name\s*\}\}", "{{pcc_name}}", t, flags=re.I)
    t = re.sub(r"(\{\{[^}]*?)advisor([^}]*?\}\})", lambda m: m.group(1) + "pcc" + m.group(2), t, flags=re.I)
    # prose advisor -> consultant (case-preserving). Tokens already handled above.
    t = re.sub(r"\badvisors\b", lambda m: preserve_case(m.group(0), "consultants"), t, flags=re.I)
    t = re.sub(r"\badvisor\b", lambda m: preserve_case(m.group(0), "consultant"), t, flags=re.I)
    return t

# ── 1. "free" -> no-cost, with idiom protection (feel free / toll free) ────────
GUARD = r"(?<!feel )(?<!toll )(?<!toll-)"  # all fixed width 5
def fix_free(t):
    rules = [
        (r"first visit is free",      "first visit is no-cost"),
        (r"free first visit",         "no-cost first visit"),
        (r"free consultations",       "no-cost appointments"),
        (r"free consultation",        "no-cost appointment"),
        (r"free visit",               "no-cost visit"),
        (r"free of charge",           "at no cost"),
        (r"for free",                 "at no cost"),
    ]
    for pat, repl in rules:
        t = re.sub(GUARD + r"\b" + pat + r"\b",
                   lambda m, r=repl: preserve_case(m.group(0), r), t, flags=re.I)
    # generic standalone "free" (guarded against feel/toll) -> no-cost
    t = re.sub(GUARD + r"\bfree\b",
               lambda m: preserve_case(m.group(0), "no-cost"), t, flags=re.I)
    return t

# ── 3. consultation -> appointment (plural first, case-preserving) ────────────
def fix_consultation(t):
    t = re.sub(r"\bconsultations\b", lambda m: preserve_case(m.group(0), "appointments"), t, flags=re.I)
    t = re.sub(r"\bconsultation\b",  lambda m: preserve_case(m.group(0), "appointment"),  t, flags=re.I)
    return t

def transform(t):
    t = fix_links(t)
    t = fix_advisor(t)
    t = fix_free(t)
    t = fix_consultation(t)
    return t

def main():
    d = json.load(open(DATA, encoding="utf-8"))
    changes = []
    for arr in ("messages_tobe", "messages_asis"):
        for i, m in enumerate(d[arr]):
            for f in COPY_FIELDS:
                if f in m and isinstance(m[f], str):
                    before = m[f]
                    after = transform(before)
                    if after != before:
                        m[f] = after
                        changes.append({"array": arr, "index": i, "field": f,
                                        "before": before, "after": after})
    json.dumps(d)  # validate
    json.dump(d, open(DATA, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    json.dump(changes, open(LOG, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))
    by = {}
    for c in changes: by[c["array"]] = by.get(c["array"], 0) + 1
    w("=== rebrand applied ===")
    for k, v in by.items(): w("  %-16s %d copy fields changed" % (k, v))
    w("  total: %d  ·  log: %s" % (len(changes), LOG))

if __name__ == "__main__":
    main()
