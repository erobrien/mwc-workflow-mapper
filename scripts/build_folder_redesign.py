# -*- coding: utf-8 -*-
"""Turn the design-workflow output into a validated, self-contained taxonomy the app renders.
Applies verifier fixes, joins field name/usage, validates every field placed exactly once,
and writes plan-workspace/public/folder_redesign.json.
"""
import json, sys
from pathlib import Path
from collections import Counter, defaultdict
ROOT = Path(__file__).parent.parent
OUT_TASK = Path(sys.argv[1])  # workflow output file
CF = ROOT / "plan-workspace" / "public" / "custom_fields.json"
DEST = ROOT / "plan-workspace" / "public" / "folder_redesign.json"
w = lambda s: sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))

final = json.load(open(OUT_TASK, encoding="utf-8"))["result"]["final"]
cf = json.load(open(CF, encoding="utf-8"))
meta = {f["fieldKey"]: f for f in cf["fields"]}
ALL_KEYS = set(meta)

# ── verifier fixes: move two deal fields to Opportunity ──
MOVE_TO_OPP = {"contact.price__item_2", "contact.term_length__item_2"}
folders = []
for fl in final["folders"]:
    keys = [k for k in fl["field_keys"] if k not in MOVE_TO_OPP]
    folders.append({**fl, "field_keys": keys})
moves = list(final["move_off_contact"])
have = {m["field_key"] for m in moves}
for k in MOVE_TO_OPP:
    if k not in have:
        moves.append({"field_key": k, "destination": "Opportunity",
                      "why": "Deal/contract field (matches its Item-1 sibling already moving to the Opportunity)."})

# normalize destination wording: unused/0-usage archive -> "Retire"
for m in moves:
    if m["destination"] == "Retire":
        m["destination"] = "Retire"

# ── validate completeness ──
placed = Counter()
for fl in folders:
    for k in fl["field_keys"]:
        placed[k] += 1
for m in moves:
    placed[m["field_key"]] += 1
missing = sorted(ALL_KEYS - set(placed))
dup = sorted(k for k, c in placed.items() if c > 1)
unknown = sorted(set(placed) - ALL_KEYS)
w("validation: placed=%d  missing=%d  dup=%d  unknown_keys=%d" % (len(placed), len(missing), len(dup), len(unknown)))
if missing: w("  MISSING: %s" % missing)
if dup:     w("  DUP: %s" % dup)
if unknown: w("  UNKNOWN(not in inventory): %s" % unknown)

def fobj(k):
    m = meta.get(k, {})
    return {"key": k, "name": (m.get("name") or k).strip(), "count": m.get("count", 0),
            "disposition": m.get("suggested_disposition", ""), "current_folder": m.get("folder", "")}

out_folders = [{"name": fl["name"], "purpose": fl["purpose"],
                "fields": sorted([fobj(k) for k in fl["field_keys"]], key=lambda x: -x["count"])}
               for fl in folders]
out_moves = sorted([{**fobj(m["field_key"]), "destination": m["destination"], "why": m["why"]} for m in moves],
                   key=lambda x: (x["destination"], -x["count"]))

# current (as-is) folder summary
cur = Counter(f.get("folder", "(none)") for f in cf["fields"])
current_folders = [{"name": n, "field_count": c} for n, c in sorted(cur.items(), key=lambda x: -x[1])]

doc = {
    "generated_at": cf.get("pulled_at", ""),
    "philosophy": final["philosophy"],
    "current_folders": current_folders,
    "proposed_folders": out_folders,
    "move_off_contact": out_moves,
    "stats": {
        "total_fields": len(ALL_KEYS),
        "kept_on_contact": sum(len(f["fields"]) for f in out_folders),
        "proposed_folder_count": len(out_folders),
        "current_folder_count": len(current_folders),
        "moved": len(out_moves),
        "move_breakdown": dict(Counter(m["destination"] for m in out_moves)),
    },
}
json.dump(doc, open(DEST, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
w("\nproposed folders: %d  ·  kept on contact: %d  ·  moved: %d  %s"
  % (len(out_folders), doc["stats"]["kept_on_contact"], len(out_moves), doc["stats"]["move_breakdown"]))
w("wrote %s" % DEST.name)
