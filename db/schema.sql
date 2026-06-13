-- MWC GHL Migration Database
-- Single source of truth for executing the 38→16 consolidation.
-- Everything the migration touches is a row here; scripts read/write this DB,
-- never loose JSON. Message copy is PRESERVED here before any source is paused.

PRAGMA journal_mode = WAL;

-- Live published workflows (the source side), seeded from the API snapshot.
CREATE TABLE IF NOT EXISTS source_workflows (
  id            TEXT PRIMARY KEY,           -- GHL workflow id
  name          TEXT NOT NULL,
  status        TEXT NOT NULL,              -- published (drafts excluded by policy)
  target_nn     TEXT,                       -- '01'..'16' it maps into, NULL = unmapped
  disposition   TEXT CHECK(disposition IN ('merge','retire','keep','standalone','inspect')) ,
  paused_at     TEXT,                       -- set when source is paused at cutover
  notes         TEXT
);

-- The 16 target workflows (the build book).
CREATE TABLE IF NOT EXISTS target_workflows (
  nn            TEXT PRIMARY KEY,           -- '01'..'16'
  name          TEXT NOT NULL,              -- full 'NN. Title'
  trigger       TEXT,
  slice         TEXT,                       -- A..E build slice
  build_status  TEXT NOT NULL DEFAULT 'spec'
                CHECK(build_status IN ('spec','building','built','verified','testing',
                                       'published','soaking','complete')),
  ghl_id        TEXT,                       -- filled when created in GHL
  updated_at    TEXT
);

-- THE MESSAGE DATABASE. Every SMS/email in the system, preserved + versioned.
-- origin: 'spec'     = authored in the build book
--         'captured' = copied verbatim out of a legacy workflow during the browser pass
--                      (REQUIRED before that source workflow is paused)
--         'builder'  = email-builder template pulled via API
CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  target_nn     TEXT REFERENCES target_workflows(nn),
  channel       TEXT NOT NULL CHECK(channel IN ('sms','email')),
  timing        TEXT,                       -- 'T+1d', 'Morning of', branch name...
  subject       TEXT,                       -- email only
  body          TEXT NOT NULL,
  origin        TEXT NOT NULL CHECK(origin IN ('spec','captured','builder')),
  source_workflow TEXT,                     -- legacy workflow name if captured
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft','approved','built','retired')),
  brand_ok      INTEGER DEFAULT NULL,       -- 1 = passed brand-voice lint
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(target_nn, channel, timing, origin, source_workflow)
);

-- Email builder templates (API-extractable; preserved raw).
CREATE TABLE IF NOT EXISTS email_builder_templates (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  last_updated  TEXT,
  preview_url   TEXT,
  raw_json      TEXT
);

-- Opportunity stage mapping for the backfill (old → new).
CREATE TABLE IF NOT EXISTS stage_map (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  old_pipeline_id   TEXT NOT NULL,
  old_pipeline_name TEXT NOT NULL,
  old_stage_name    TEXT NOT NULL DEFAULT '*',   -- '*' = any stage in pipeline
  new_pipeline      TEXT NOT NULL DEFAULT 'Sales — Lead to Close',
  new_stage         TEXT,
  new_status        TEXT CHECK(new_status IN ('open','won','lost','abandoned')),
  lost_reason       TEXT,
  rule              TEXT,                        -- special handling, e.g. A&D evidence split
  reviewed          INTEGER DEFAULT 0            -- human approved this row
);

-- Gates: nothing advances until its gate row is passed.
CREATE TABLE IF NOT EXISTS gates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phase         TEXT NOT NULL,               -- '0.1','2.1','slice-B',...
  name          TEXT NOT NULL,
  criteria      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','passed','failed','waived')),
  evidence      TEXT,
  decided_at    TEXT
);

-- Frozen engine tag surface (never rename/delete; verified by Phase 4 check).
CREATE TABLE IF NOT EXISTS frozen_tags (
  tag           TEXT PRIMARY KEY,
  reason        TEXT DEFAULT 'dormant engine surface'
);

-- Append-only audit log of every mutation the app performs.
CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT DEFAULT (datetime('now')),
  actor         TEXT DEFAULT 'fable',
  action        TEXT NOT NULL,
  detail        TEXT
);
