CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (json_valid(state)),
  version INTEGER NOT NULL DEFAULT 1,
  last_action TEXT,
  expires_at INTEGER NOT NULL
);
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  expected_version INTEGER NOT NULL,
  before_state TEXT NOT NULL CHECK (json_valid(before_state)),
  after_state TEXT NOT NULL CHECK (json_valid(after_state)),
  description TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX proposals_session ON proposals(session_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
