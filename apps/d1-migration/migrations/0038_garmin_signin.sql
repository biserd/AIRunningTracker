-- Anonymous sign-in challenges are separate from authenticated account linking.
CREATE TABLE IF NOT EXISTS garmin_signin_sessions (
  state_hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  return_to TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS garmin_signin_expiry ON garmin_signin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS garmin_signin_rate ON garmin_signin_sessions(created_at);
