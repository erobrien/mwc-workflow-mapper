# MWC GHL — Current vs. Target Architecture (diff site)

A single self-contained page that visualizes the difference between the Men's
Wellness Centers GoHighLevel sub-account **as it is today** and the **simplified
target**, built from a live read-only crawl of the production location
(`Ghstz8eIsHWLeXek47dk`, crawled 2026-06-12). Published assets only.

## What it shows
- **Headline deltas** — workflows 135→16, pipelines 18→3, tags 305→~120, forms 26→~9, revenue fields 0→14.
- **The core defect** — A&D pipeline holding 939 won / 0 lost (~50% of all "won" opps), with the node-level config from `05. Clinic Appt Outcome` that causes it.
- **Before/After inventory** — every object count from the live API.
- **Pipeline consolidation** — 18 pipelines (9 retired) → 3 field-driven pipelines.
- **Engine constraint** — the live BotFanatics/Sniper engine and its protected tags.
- **Workflow consolidation** — 38 published → 16 owners, with what each absorbs.
- **Three-plan comparison** — migration map vs. this audit vs. the human sprint proposal (toggle: Targets / Method & risk / Coverage).

## Run locally
```
python -m http.server 4173 --directory .
# open http://localhost:4173
```
It's plain HTML/CSS/JS — no build step, no dependencies. All data is embedded in
the `DATA` object in `index.html`.

## Deploy
```
vercel --prod        # from this directory
```

## Data provenance
Numbers come from the audit snapshots in `../audit/` (raw GHL API JSON) and the
node-level builder capture documented in `../audit/SIMPLIFICATION_PLAN.md`.
