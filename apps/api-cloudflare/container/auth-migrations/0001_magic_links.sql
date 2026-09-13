-- Isolated Cloudflare authentication state. No changes to the live Neon database.
CREATE TABLE IF NOT EXISTS magic_links (
  email_hash TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS magic_links_expiry ON magic_links(expires_at);
