# MWC GHL Refactor — Workspace (rebuilt)

A local, version-controlled rebuild of the "MWC GHL Refactor: Workspace" plan app
(the `/plan` site). Vite + React + React Router + Tailwind + Mermaid.

**Rebuilt from the live deployment** because the original source lived only on another
machine. All content was captured from the deployed app's `/data.json` plus its page
bundles, then **cleaned to remove the three rejected schema additions**:

- **Lead Source** custom object — dropped. UTM / click-ID attribution stays on the
  Contact and is copied onto the Opportunity at create.
- **Consent Log** custom object — dropped. Consent stays on the Contact + GHL-native
  DND/STOP and the Compliance workflow.
- **Finance / Billing truth source** — dropped. Revenue truth is the Opportunity value
  (`monetaryValue` = Total Program Amount).

## Routes
`/` workspace · `/as-is` · `/inventory` · `/to-be` · `/diagrams` · `/messages` ·
`/plan` · `/prompts` · `/decisions` · `/risks`

## Develop
```
npm install
npm run dev        # http://localhost:4178
npm run build      # type-check + production build to dist/
```

## Content & the cleaners
Content is served from `public/`:
- `data.json`     — KPIs, workflows, fields, pipelines, defects, decisions, risks, messages
- `prompts.json`  — execution prompts
- `diagrams.json` — Mermaid sources

These are produced from the verbatim captures (`data.raw.json`, `prompts.raw.json`,
`diagrams.raw.json`) by reproducible cleaners. Re-run after re-capturing:
```
python clean_data.py       # -> public/data.json      (drops the 2 custom-object targets)
python clean_prompts.py    # -> public/prompts.json   (drops object-spike + billing prompts)
python clean_diagrams.py   # -> public/diagrams.json  (rewrites the target ER + sequence)
```

## Deploy
Static SPA. `vercel.json` rewrites all paths to `index.html`. `npm run build`, deploy `dist/`.
