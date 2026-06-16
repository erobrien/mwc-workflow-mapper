# -*- coding: utf-8 -*-
"""
Clean the captured GHL refactor dataset for the rebuilt plan workspace.

Removes the three rejected schema additions and keeps the data internally
consistent:
  - Lead Source (new custom object)   -> dropped; its attribution fields stay on Contact
  - Consent Log (new custom object)   -> dropped; consent stays on Contact + native DND/STOP
  - Finance / Billing truth source     -> dropped; revenue truth is the opportunity value

Input : data.raw.json   (captured verbatim from the deployed app's /data.json)
Output: public/data.json (served by the rebuilt app)

Reproducible: re-run any time after re-capturing the raw file.
  python clean_data.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
raw = json.load(open(os.path.join(HERE, "data.raw.json"), encoding="utf-8"))

DEAD_OBJECTS = ("Lead Source", "Consent Log")   # custom objects we are NOT creating

# ---- field_destinations: drop the two custom-object targets ----------------
fd = raw["field_destinations"]
kept = []
for entry in fd:
    target = entry.get("target", "")
    if any(obj in target and "custom object" in target.lower() for obj in DEAD_OBJECTS):
        continue  # drop the Lead Source / Consent Log object cards entirely
    # Contact: fields that were being moved to a dead object now STAY on Contact
    if target == "Contact" and "removing" in entry:
        entry["removing"] = [r for r in entry["removing"]
                             if r.get("to") not in ("Lead Source", "Consent Log")]
    # Opportunity: drop the FK that linked a deal to the dead Lead Source object
    if target == "Opportunity" and "adding" in entry:
        entry["adding"] = [a for a in entry["adding"]
                           if a.get("key") != "lead_source_id"]
    kept.append(entry)
raw["field_destinations"] = kept

# ---- decisions: reverse the custom-objects decision, drop billing ----------
new_decisions = []
for d in raw["decisions"]:
    name = d.get("decision", "")
    if name == "Billing truth source":
        continue  # no billing system in GHL — moot
    if name == "Custom objects":
        d["choice"] = ("Rejected - no custom objects. Attribution stays as Contact "
                       "fields + source_* tags; consent via native DND/STOP + the "
                       "Compliance workflow; revenue rolls up on the Opportunity.")
        d["status"] = "Locked"
        d["date"] = "2026-06-16"
    new_decisions.append(d)
# renumber decisions sequentially so the board reads cleanly
for i, d in enumerate(new_decisions, 1):
    d["n"] = str(i)
raw["decisions"] = new_decisions

# ---- migration_steps: drop billing + custom-object spike, unblock backfill -
new_steps = []
for s in raw["migration_steps"]:
    nm = s.get("name", "")
    if nm in ("Identify billing truth source", "Custom object spike (Lead Source + Consent Log)"):
        continue
    if nm == "Revenue backfill - dry-run CSV":
        s["gate"] = "Human review + dry-run CSV reconciles to opportunity values"
        s["blocked_by"] = ""
        if s.get("status") == "Blocked":
            s["status"] = "Ready"
    # any lingering "Step 0b" references in blocked_by
    if "0b" in (s.get("blocked_by") or "") or "billing" in (s.get("blocked_by") or "").lower():
        s["blocked_by"] = ""
        if s.get("status") == "Blocked":
            s["status"] = "Ready"
    new_steps.append(s)
raw["migration_steps"] = new_steps

# ---- risks: reframe the two billing/finance-dependent critical risks -------
for r in raw["risks"]:
    if r.get("id") == "C1":
        r["area"] = "Revenue truth must be unambiguous inside GHL"
        r["mitigation"] = ("Opportunity monetaryValue (Total Program Amount) is the "
                           "single revenue truth; evidence-split the 939 A&D wins into "
                           "3 buckets (clear-Won / clear-Lost / ambiguous -> human review).")
    if r.get("id") == "C3":
        r["mitigation"] = ("Leadership sign-off before touching won/lost; grandfather "
                           "historical commissions on the 939 reclassified wins.")

# ---- KPIs: nothing references the dead objects directly; leave counts as-is

out = os.path.join(HERE, "public", "data.json")
json.dump(raw, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# ---- report ----------------------------------------------------------------
print("cleaned -> public/data.json")
print("  field_destinations :", len(raw["field_destinations"]), "(was 6)")
print("  decisions          :", len(raw["decisions"]), "(was 7)")
print("  migration_steps    :", len(raw["migration_steps"]), "(was 9)")
blob = json.dumps(raw, ensure_ascii=False).lower()
for term in ("lead source (new custom object)", "consent log (new custom object)",
             "custom object spike", "billing truth source", "lead_source_id"):
    print("  contains %-34s : %s" % (term, term in blob))
