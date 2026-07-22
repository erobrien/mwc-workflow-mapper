"""Driver: extract Active Workflows tree + the published-outside-scope workflows
that are currently live-firing (Affiliate Marketing, Paid Marketing Attribution,
Social Call). Re-lists the roster fresh each run (no dependency on a scratch file).
"""
import json
import time

from live_reextract import process_one, list_all_workflows, REPO_ROOT

print("Listing all workflows...")
roster = list_all_workflows()
(REPO_ROOT / "ghl_data" / "live_reextract_roster.json").write_text(json.dumps(roster, indent=2), encoding="utf-8")

PRIORITY_PREFIXES = ("Active Workflows",)
PRIORITY_TOP_FOLDERS = ("Affiliate Marketing", "Paid Marketing Attribution", "Social Call")

targets = [
    r for r in roster
    if r["folder_path"].startswith(PRIORITY_PREFIXES)
    or r["folder_path"] in PRIORITY_TOP_FOLDERS
]
print(f"Extracting {len(targets)} priority workflows (Active Workflows tree + live outside-scope funnels)...")

results = []
t0 = time.time()
for i, m in enumerate(targets, 1):
    elapsed = time.time() - t0
    print(f"[{i}/{len(targets)}] ({elapsed:.0f}s) {m['name']} [{m['folder_path']}] status={m['status']}")
    try:
        results.append(process_one(m))
    except SystemExit:
        print(f"\n!! STOPPED at {i}/{len(targets)} -- JWT expired. {len(results)} extracted so far.")
        break
    except Exception as e:
        print(f"  FAILED: {e}")
    time.sleep(0.2)

out_path = REPO_ROOT / "ghl_data" / "live_reextract_priority.json"
out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
print(f"\nDone: {len(results)}/{len(targets)} extracted -> {out_path}")
