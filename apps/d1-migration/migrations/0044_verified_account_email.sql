-- Purpose-bound, short-lived email attachment. Existing accounts and consent stay unchanged.
CREATE TABLE IF NOT EXISTS account_email_challenges (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK(marketing_consent IN (0,1)),
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_email_challenge_expiry ON account_email_challenges(expires_at);
