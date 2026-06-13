import json
import sys

sys.path.insert(0, "scripts")
import extract_via_jwt as e

wf_id = "2151c14e-0d7c-4511-b759-b2785ec5bf49"
raw = e.fetch_workflow(wf_id)

# Top-level keys
print("TOP-LEVEL KEYS:", list(raw.keys()) if isinstance(raw, dict) else type(raw))
body = raw.get("workflow") or raw.get("data") or raw
if isinstance(body, dict):
    print("BODY KEYS:", list(body.keys()))
print("=" * 60)
print(json.dumps(raw, indent=2)[:5000])
