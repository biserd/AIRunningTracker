-- Short-lived encrypted context, never an authorization cache.
CREATE TABLE whatsapp_context_cache (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 generation TEXT NOT NULL,
 payload TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX whatsapp_context_expiry ON whatsapp_context_cache(expires_at);
