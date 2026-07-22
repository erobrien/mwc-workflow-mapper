"""Attribution live audit, 2026-07-22. Pulls a large contact sample plus all
opportunities, and quantifies:
  - population rate of every attribution custom field
  - population rate of the native `attributions[]` array (GHL auto-capture)
  - overwrite risk: contacts with >1 appointment/opportunity where "first_*"
    fields differ from the bare utm_*/gclid_value/fbclid_value fields
  - the `source` field distribution
  - opportunity-level attribution field existence (expected: none)
Writes findings to ghl_data/attribution/*.json for the write-up.
"""
import json
import os
import time
from pathlib import Path

import requests

LOCATION_ID = "Ghstz8eIsHWLeXek47dk"
API_BASE = "https://services.leadconnectorhq.com"
PIT = os.environ["GHL_PIT"]
HEADERS = {"Authorization": f"Bearer {PIT}", "Version": "2021-07-28", "Accept": "application/json"}

OUT = Path(__file__).resolve().parent.parent / "ghl_data" / "attribution"
OUT.mkdir(parents=True, exist_ok=True)

ATTR_FIELD_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "gclid_value", "fbclid_value",
    "first_utm_source", "first_utm_campaign", "first_gclid", "first_fbclid",
    "first_landing_page", "first_touch_at", "last_touch_at",
    "original_source", "original_campaign", "source_url", "last_channel",
    "consent_source", "contact_disposition__channel",
]


def fetch_contacts(limit=100, max_pages=6):
    contacts = []
    start_after = None
    start_after_id = None
    for page in range(max_pages):
        params = {"locationId": LOCATION_ID, "limit": limit}
        if start_after:
            params["startAfter"] = start_after
            params["startAfterId"] = start_after_id
        r = requests.get(f"{API_BASE}/contacts/", headers=HEADERS, params=params, timeout=30)
        r.raise_for_status()
        body = r.json()
        batch = body.get("contacts", [])
        contacts.extend(batch)
        meta = body.get("meta", {})
        print(f"  page {page+1}: +{len(batch)} (total so far {len(contacts)} / {meta.get('total')})")
        if not meta.get("nextPageUrl") or not batch:
            break
        start_after = meta.get("startAfter")
        start_after_id = meta.get("startAfterId")
        time.sleep(0.15)
    return contacts, body.get("meta", {}).get("total")


def fetch_opportunities(limit=100, max_pages=5, pipeline_id=None):
    opps = []
    page = 1
    while page <= max_pages:
        params = {"location_id": LOCATION_ID, "limit": limit, "page": page}
        if pipeline_id:
            params["pipeline_id"] = pipeline_id
        r = requests.get(f"{API_BASE}/opportunities/search", headers=HEADERS, params=params, timeout=30)
        if r.status_code != 200:
            print("  opp search failed:", r.status_code, r.text[:300])
            break
        body = r.json()
        batch = body.get("opportunities", [])
        opps.extend(batch)
        meta = body.get("meta", {})
        print(f"  opp page {page}: +{len(batch)} (total so far {len(opps)} / {meta.get('total')})")
        if len(batch) < limit:
            break
        page += 1
        time.sleep(0.15)
    return opps


def main():
    print("Fetching custom field id -> fieldKey map...")
    r = requests.get(f"{API_BASE}/locations/{LOCATION_ID}/customFields", headers=HEADERS, timeout=30)
    fields = r.json()["customFields"]
    id_to_key = {f["id"]: f["fieldKey"].replace("contact.", "") for f in fields}
    key_to_id = {v: k for k, v in id_to_key.items()}

    print("\nFetching contact sample...")
    contacts, total_contacts = fetch_contacts(limit=100, max_pages=15)
    print(f"Pulled {len(contacts)} of {total_contacts} total contacts.\n")

    print("Fetching opportunity sample (default pipeline search)...")
    opps = fetch_opportunities(limit=100, max_pages=5)
    print(f"Pulled {len(opps)} opportunities.\n")

    (OUT / "contacts_sample.json").write_text(json.dumps(contacts, indent=2), encoding="utf-8")
    (OUT / "opportunities_sample.json").write_text(json.dumps(opps, indent=2), encoding="utf-8")

    # --- population rates ---
    pop = {k: 0 for k in ATTR_FIELD_KEYS}
    n = len(contacts)
    attributions_present = 0
    attributions_multi = 0
    source_dist = {}
    isfirst_stats = {"true": 0, "false": 0, "missing": 0}

    for c in contacts:
        cf = {id_to_key.get(x["id"], x["id"]): x.get("value") for x in c.get("customFields", [])}
        for k in ATTR_FIELD_KEYS:
            v = cf.get(k)
            if v not in (None, "", []):
                pop[k] += 1
        attrs = c.get("attributions") or []
        if attrs:
            attributions_present += 1
            if len(attrs) > 1:
                attributions_multi += 1
            for a in attrs:
                isf = a.get("isFirst")
                if isf is True:
                    isfirst_stats["true"] += 1
                elif isf is False:
                    isfirst_stats["false"] += 1
                else:
                    isfirst_stats["missing"] += 1
        src = c.get("source")
        source_dist[str(src)] = source_dist.get(str(src), 0) + 1

    pop_rates = {k: {"count": v, "pct": round(100 * v / n, 2) if n else 0} for k, v in pop.items()}

    # --- overwrite check: contacts with >1 attribution entries where first vs
    #     last-touch fields diverge (proxy for "does capture actually persist
    #     first-touch or does the newest touch clobber it") ---
    overwrite_candidates = []
    for c in contacts:
        attrs = c.get("attributions") or []
        if len(attrs) < 2:
            continue
        cf = {id_to_key.get(x["id"], x["id"]): x.get("value") for x in c.get("customFields", [])}
        first_source = cf.get("first_utm_source")
        bare_source = cf.get("utm_source")
        first_gclid = cf.get("first_gclid")
        bare_gclid = cf.get("gclid_value")
        diverges = (first_source and bare_source and first_source != bare_source) or \
                   (first_gclid and bare_gclid and first_gclid != bare_gclid)
        overwrite_candidates.append({
            "id": c["id"], "n_attributions": len(attrs),
            "first_utm_source": first_source, "utm_source": bare_source,
            "first_gclid": first_gclid, "gclid_value": bare_gclid,
            "native_attributions": attrs,
            "diverges": diverges,
        })

    n_multi_touch = len(overwrite_candidates)
    n_diverging = sum(1 for x in overwrite_candidates if x["diverges"])

    # --- opportunity-level attribution field check ---
    opp_fields_seen = set()
    for o in opps:
        for cf in (o.get("customFields") or []):
            opp_fields_seen.add(cf.get("id"))
    opp_has_native_attributions = any("attributions" in o for o in opps)
    opp_sample_keys = list(opps[0].keys()) if opps else []

    # --- pipeline / monetary value sanity (cheap corroboration of D2/D7) ---
    zero_value = sum(1 for o in opps if (o.get("monetaryValue") or 0) == 0)

    report = {
        "generated_at": "2026-07-22",
        "sample_size_contacts": n,
        "total_contacts_in_account": total_contacts,
        "sample_size_opportunities": len(opps),
        "attribution_field_population": pop_rates,
        "native_attributions_array": {
            "contacts_with_any_attribution": attributions_present,
            "pct_with_any_attribution": round(100 * attributions_present / n, 2) if n else 0,
            "contacts_with_multi_touch_attributions": attributions_multi,
            "isFirst_flag_distribution": isfirst_stats,
        },
        "source_field_distribution_top20": dict(sorted(source_dist.items(), key=lambda x: -x[1])[:20]),
        "overwrite_risk": {
            "multi_touch_contacts_in_sample": n_multi_touch,
            "diverging_first_vs_current_fields": n_diverging,
            "pct_of_multitouch_diverging": round(100 * n_diverging / n_multi_touch, 2) if n_multi_touch else None,
        },
        "opportunity_level_attribution_fields_found": len(opp_fields_seen),
        "opportunity_has_native_attributions_key": opp_has_native_attributions,
        "opportunity_sample_top_level_keys": opp_sample_keys,
        "opportunity_zero_monetary_value_in_sample": zero_value,
        "opportunity_zero_monetary_value_pct": round(100 * zero_value / len(opps), 2) if opps else None,
    }
    (OUT / "attribution_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("\n=== SUMMARY ===")
    print(json.dumps(report, indent=2))

    # save a handful of overwrite examples for the write-up (redact phone/email)
    examples = [x for x in overwrite_candidates if x["diverges"]][:8]
    (OUT / "overwrite_examples.json").write_text(json.dumps(examples, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
