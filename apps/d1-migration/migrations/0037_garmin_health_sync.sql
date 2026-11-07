-- Separate consent and storage for optional health/sleep recovery feeds.
ALTER TABLE garmin_connections ADD COLUMN health_consented_at TEXT;
ALTER TABLE garmin_connections ADD COLUMN health_last_push_at TEXT;
CREATE TABLE garmin_health_summaries (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('dailies','sleeps','hrv','stressDetails')),
  start_at TEXT NOT NULL,
  calendar_date TEXT NOT NULL,
  summary TEXT NOT NULL CHECK(json_valid(summary)),
  received_at TEXT NOT NULL,
  PRIMARY KEY(user_id,kind,start_at)
);
CREATE INDEX garmin_health_dates ON garmin_health_summaries(user_id,calendar_date DESC);
CREATE INDEX garmin_health_retention ON garmin_health_summaries(calendar_date);
CREATE TABLE garmin_health_inbox (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consented_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  received_at TEXT NOT NULL,
  retry_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  lease_until TEXT,
  completed_at TEXT
);
CREATE INDEX garmin_health_due ON garmin_health_inbox(retry_at);
CREATE INDEX garmin_health_expiry ON garmin_health_inbox(expires_at);
CREATE INDEX garmin_health_owner ON garmin_health_inbox(user_id);
