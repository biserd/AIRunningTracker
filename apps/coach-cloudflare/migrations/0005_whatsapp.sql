CREATE TABLE whatsapp_links (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 generation TEXT NOT NULL,
 token_hash TEXT UNIQUE,
 token_expires INTEGER NOT NULL,
 address TEXT UNIQUE,
 last_inbound INTEGER NOT NULL DEFAULT 0,
 consent_at INTEGER NOT NULL,
 disabled INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE email_reminders ADD COLUMN channel TEXT NOT NULL DEFAULT 'email' CHECK(channel IN ('email','whatsapp'));
ALTER TABLE email_reminders ADD COLUMN channel_generation TEXT;
ALTER TABLE email_reminders ADD COLUMN delivery_status TEXT;
CREATE UNIQUE INDEX reminders_provider ON email_reminders(provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE whatsapp_inbox (
 sid TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 generation TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed'))
);
CREATE INDEX whatsapp_pending ON whatsapp_inbox(status,created_at);
CREATE TABLE whatsapp_receipts (sid TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
