-- RunAnalytics recordings belong to an account, never to an external provider.
CREATE TABLE phone_runs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  distance REAL NOT NULL CHECK(distance >= 0),
  moving_time INTEGER NOT NULL CHECK(moving_time > 0),
  elapsed_time INTEGER NOT NULL CHECK(elapsed_time >= moving_time),
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX phone_runs_owner_date ON phone_runs(user_id,start_date DESC,id);
-- A browser-only, one-use launch establishes the OAuth cookie for native clients.
CREATE TABLE native_garmin_sessions (
  state_hash TEXT PRIMARY KEY REFERENCES garmin_oauth_sessions(state_hash) ON DELETE CASCADE,
  launched INTEGER NOT NULL DEFAULT 0 CHECK(launched IN (0,1))
);
