CREATE TABLE IF NOT EXISTS coach_waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  consent_version TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  unsubscribed_at INTEGER,
  launch_status TEXT NOT NULL DEFAULT 'pending' CHECK (launch_status IN ('pending','sending','accepted','review')),
  claimed_at INTEGER,
  notified_at INTEGER
);
CREATE INDEX IF NOT EXISTS coach_waitlist_delivery ON coach_waitlist(launch_status, joined_at);
CREATE TABLE IF NOT EXISTS coach_launch (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  cutoff_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO coach_launch(id,enabled,cutoff_at) VALUES (1,0,0);
