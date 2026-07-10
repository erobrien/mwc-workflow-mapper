# -*- coding: utf-8 -*-
"""
Merge every recoverable AS-IS (current-state) signal into one per-workflow
dataset for the Current State pages.

Nothing here is rewritten into brand voice — message copy, workflow names and
statuses are carried verbatim as they exist in the account today.

Sources joined (best available detail per workflow):
  data.raw.json                     as_is_workflows (metadata + triggers) and
                                    messages_asis (410 verbatim SMS/email bodies
                                    with step names) — the richest source
  ../ghl_data/workflows.json        full 136-workflow roster + status
  ../ghl_data/folder_workflows.json the 22 workflows organised into folders 01-04
  ../ghl_data/tag_workflow_refs.json 49 tags -> add/remove per workflow
  ../db/mwc.db (source_workflows)   consolidation disposition + target 01..16

Step-level structure (ordered waits / if-else branches) was NOT recoverable for
any workflow — the GHL step extraction returned empty everywhere (verified across
git history). So per-workflow coverage is tiered honestly:
  messages  = verbatim message steps recovered
  triggers  = trigger(s) recovered but no message steps
  metadata  = name/status only

Output: public/asis-detail.json
  python build_asis_detail.py
"""
import json, os, re, sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GHL = os.path.join(ROOT, "ghl_data")


def load(p):
    return json.load(open(p, encoding="utf-8"))


raw = load(os.path.join(HERE, "data.raw.json"))
roster = load(os.path.join(GHL, "workflows.json"))
folder_map = load(os.path.join(GHL, "folder_workflows.json"))
tag_refs = load(os.path.join(GHL, "tag_workflow_refs.json"))["refs"]

# id -> folder (only the 22 organised workflows have a real GHL folder)
id_folder = {}
for folder, ids in folder_map.items():
    for wid in ids:
        id_folder[wid] = folder

# id -> {added:[], removed:[]}
id_tags = {}
for tag, refs in tag_refs.items():
    for r in refs:
        wid = r["workflow_id"]
        bucket = id_tags.setdefault(wid, {"added": [], "removed": []})
        key = "added" if r["action"] == "add" else "removed"
        if tag not in bucket[key]:
            bucket[key].append(tag)

# id -> disposition/target from the migration DB (published source workflows)
id_disp = {}
dbp = os.path.join(ROOT, "db", "mwc.db")
if os.path.exists(dbp):
    con = sqlite3.connect(dbp)
    for wid, target_nn, disposition in con.execute(
            "select id, target_nn, disposition from source_workflows"):
        id_disp[wid] = {"target_nn": target_nn, "disposition": disposition}
    con.close()

# id -> verbatim messages (the recoverable step sequence)
id_msgs = {}
for m in raw["messages_asis"]:
    id_msgs.setdefault(m.get("workflow_id"), []).append({
        "step": m.get("step", ""),
        "channel": m.get("channel", ""),
        "delay": m.get("delay", ""),
        "subject": m.get("subject", ""),
        "message": m.get("message", ""),
        "status": m.get("status", ""),
    })

# Base record per workflow — union of data.raw as_is_workflows + full roster.
by_id = {w["id"]: dict(w) for w in raw["as_is_workflows"]}
for w in roster:
    if w["id"] not in by_id:
        by_id[w["id"]] = {"id": w["id"], "name": w["name"], "status": w["status"],
                          "updated_at": (w.get("updatedAt") or "")[:10], "triggers": []}

LOCATIONS = [
    ("Newport News", r"newport|npn"),
    ("Richmond", r"richmond|rva|\brva\b"),
    ("Virginia Beach", r"virginia beach|va beach|vba|vbeach"),
    ("Home", r"\bhome\b"),
    ("Consultation", r"consultation"),
    ("Virtual", r"virtual|telemed"),
]


def detect_location(name):
    low = name.lower()
    for label, pat in LOCATIONS:
        if re.search(pat, low):
            return label
    return ""


def family_key(name):
    """Strip location + duplicate-marker tokens so per-location / copy variants
    of the same workflow collapse to one family label."""
    s = name
    s = re.sub(r"^(JJ|z+x?|Copy -?)\s*", "", s, flags=re.I)
    s = re.sub(r"\b(newport news|newport|npn|richmond|rva|virginia beach|va beach|vba|home|consultation|virtual)\b",
               "", s, flags=re.I)
    s = re.sub(r"^\s*\d+[A-Za-z]?\.?\s*", "", s)         # leading NN. code
    s = re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
    return s or name.lower()


workflows = []
cov = {"messages": 0, "triggers": 0, "metadata": 0}
for wid, w in by_id.items():
    msgs = id_msgs.get(wid, [])
    tags = id_tags.get(wid, {"added": [], "removed": []})
    triggers = w.get("triggers") or []
    if msgs:
        coverage = "messages"
    elif triggers:
        coverage = "triggers"
    else:
        coverage = "metadata"
    cov[coverage] += 1
    sms = sum(1 for m in msgs if m["channel"] == "sms")
    email = sum(1 for m in msgs if m["channel"] == "email")
    workflows.append({
        "id": wid,
        "name": w["name"],
        "status": w.get("status", ""),
        "updated_at": w.get("updated_at", ""),
        "folder": id_folder.get(wid, "Uncategorized"),
        "location": detect_location(w["name"]),
        "family": family_key(w["name"]),
        "triggers": triggers,
        "messages": msgs,
        "msg_sms": sms,
        "msg_email": email,
        "tags_added": tags["added"],
        "tags_removed": tags["removed"],
        "disposition": id_disp.get(wid, {}).get("disposition"),
        "target_nn": id_disp.get(wid, {}).get("target_nn"),
        "coverage": coverage,
    })

# Stable order: folder (01..04 then Uncategorized), then name.
FOLDER_ORDER = ["01. WP Lead Capture", "02. Appointments & Visit Journey",
                "03. Call Routing & Dispositions", "04. System Admin & Error Handling",
                "Uncategorized"]
workflows.sort(key=lambda w: (FOLDER_ORDER.index(w["folder"]) if w["folder"] in FOLDER_ORDER else 99,
                              w["name"].lower()))

folders = []
for f in FOLDER_ORDER:
    ids = [w["id"] for w in workflows if w["folder"] == f]
    if ids:
        folders.append({"name": f, "count": len(ids)})

out = {
    "generated_at": raw.get("generated_at", ""),
    "location_id": raw.get("location_id", ""),
    "coverage": {
        "total": len(workflows),
        "with_messages": cov["messages"],
        "triggers_only": cov["triggers"],
        "metadata_only": cov["metadata"],
        "total_messages": sum(len(w["messages"]) for w in workflows),
        "published": sum(1 for w in workflows if w["status"] == "published"),
        "draft": sum(1 for w in workflows if w["status"] != "published"),
    },
    "folders": folders,
    "workflows": workflows,
}

dest = os.path.join(HERE, "public", "asis-detail.json")
json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote public/asis-detail.json")
print("  workflows      :", out["coverage"]["total"])
print("  with_messages  :", out["coverage"]["with_messages"])
print("  triggers_only  :", out["coverage"]["triggers_only"])
print("  metadata_only  :", out["coverage"]["metadata_only"])
print("  total_messages :", out["coverage"]["total_messages"])
print("  folders        :", [f["name"] + f" ({f['count']})" for f in folders])
