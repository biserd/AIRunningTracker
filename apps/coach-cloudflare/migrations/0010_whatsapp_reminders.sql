-- Coach-owned reminders are separate from email verification and read-only MCP.
CREATE TABLE whatsapp_reminders (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 link_generation TEXT NOT NULL,
 grant_generation TEXT NOT NULL,
 title TEXT NOT NULL,
 local_time TEXT NOT NULL,
 timezone TEXT NOT NULL,
 due_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','sending','sent','cancelled','expired','unknown')),
 confirmation_hash TEXT,
 confirmation_kind TEXT CHECK(confirmation_kind IN ('create','cancel')),
 confirmation_expires INTEGER,
 created_at INTEGER NOT NULL,
 started_at INTEGER,
 provider_id TEXT,
 delivery_status TEXT
);
CREATE INDEX whatsapp_reminders_due ON whatsapp_reminders(status,due_at);
CREATE INDEX whatsapp_reminders_owner ON whatsapp_reminders(session_id,created_at);
CREATE UNIQUE INDEX whatsapp_reminders_confirmation ON whatsapp_reminders(confirmation_hash);
CREATE INDEX whatsapp_reminders_provider ON whatsapp_reminders(provider_id);
