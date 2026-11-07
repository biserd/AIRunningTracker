-- Additive direct-sync pilot. Garmin data is isolated from AI and Strava tables.
CREATE TABLE IF NOT EXISTS garmin_connections (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  garmin_user_id TEXT NOT NULL UNIQUE,
  tokens TEXT,
  access_expires_at TEXT,
  refresh_expires_at TEXT,
  permissions TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(permissions)),
  status TEXT NOT NULL CHECK(status IN ('connected','permission_required','disconnect_pending','reconnect_required','not_connected')),
  connected_at TEXT NOT NULL,
  permission_changed_at REAL NOT NULL DEFAULT 0,
  last_push_at TEXT,
  operation_owner TEXT,
  operation_until TEXT
);
CREATE TABLE IF NOT EXISTS garmin_oauth_sessions (
  state_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verifier TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS garmin_oauth_expiry ON garmin_oauth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS garmin_activity_summaries (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  summary TEXT NOT NULL CHECK(json_valid(summary)),
  received_at TEXT NOT NULL,
  PRIMARY KEY(user_id,activity_id)
);
CREATE INDEX IF NOT EXISTS garmin_activity_dates ON garmin_activity_summaries(user_id,start_date DESC);
CREATE TABLE IF NOT EXISTS garmin_deleted_activities (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  PRIMARY KEY(user_id,activity_id)
);
CREATE TABLE IF NOT EXISTS garmin_push_inbox (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  received_at TEXT NOT NULL,
  retry_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS garmin_push_due ON garmin_push_inbox(retry_at);
