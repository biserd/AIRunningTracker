CREATE TABLE whatsapp_oauth_pending (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 state_hash TEXT NOT NULL UNIQUE, verifier TEXT NOT NULL, client_id TEXT NOT NULL,
 email_hash TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE whatsapp_oauth_grants (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 client_id TEXT NOT NULL, email_hash TEXT NOT NULL, credentials TEXT NOT NULL,
 access_expires INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 generation TEXT NOT NULL, refresh_lock INTEGER NOT NULL DEFAULT 0
);
