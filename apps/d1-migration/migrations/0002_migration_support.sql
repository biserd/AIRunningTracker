-- No source mutations. These tables exist only in the D1 migration target.
CREATE TABLE migration_activity_exclusions (
  activity_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  strava_id TEXT NOT NULL,
  payload_bytes INTEGER NOT NULL CHECK(payload_bytes > 2000000),
  reason TEXT NOT NULL DEFAULT 'oversized_left_in_neon',
  UNIQUE(user_id,strava_id)
);
CREATE TABLE migration_runs (
  id TEXT PRIMARY KEY,
  source_commit TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('importing','verifying','verified','failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  manifest_json TEXT NOT NULL CHECK(json_valid(manifest_json))
);
CREATE TABLE coach_message_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  notification_id INTEGER NOT NULL,
  rating TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id,notification_id)
);
CREATE INDEX coach_message_feedback_user_id_idx ON coach_message_feedback(user_id);
CREATE UNIQUE INDEX notification_outbox_dedupe_unique_idx ON notification_outbox(dedupe_key);
CREATE TABLE cloudflare_jobs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('LIST_ACTIVITIES','HYDRATE_ACTIVITY','GENERATE_COACH_RECAP','FINALIZE_SYNC','STRAVA_WEBHOOK')),
  data TEXT NOT NULL CHECK(json_valid(data)),
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  scheduled_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL CHECK(max_attempts BETWEEN 1 AND 20),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  lease_owner TEXT,
  lease_until TEXT,
  finished_at TEXT,
  error_code TEXT
);
CREATE INDEX cloudflare_jobs_due_idx ON cloudflare_jobs(status,scheduled_at,priority);
CREATE INDEX cloudflare_jobs_user_idx ON cloudflare_jobs(user_id,status,created_at DESC);
-- Independent of ingestion path: imports, webhooks and manual sync cannot recreate these activities.
CREATE TRIGGER prevent_excluded_activity_insert BEFORE INSERT ON activities
WHEN EXISTS (SELECT 1 FROM migration_activity_exclusions e
  WHERE e.activity_id=NEW.id OR (e.user_id=NEW.user_id AND e.strava_id=NEW.strava_id))
BEGIN SELECT RAISE(ABORT,'ACTIVITY_EXCLUDED_FROM_D1'); END;
CREATE TRIGGER prevent_excluded_activity_update BEFORE UPDATE ON activities
WHEN EXISTS (SELECT 1 FROM migration_activity_exclusions e
  WHERE e.activity_id=NEW.id OR (e.user_id=NEW.user_id AND e.strava_id=NEW.strava_id))
BEGIN SELECT RAISE(ABORT,'ACTIVITY_EXCLUDED_FROM_D1'); END;
