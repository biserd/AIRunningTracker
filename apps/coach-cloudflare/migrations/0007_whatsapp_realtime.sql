-- Additive, coach-only migration. No changes to the main runner database.
CREATE TABLE whatsapp_conversation_leases (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 owner TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX whatsapp_session_pending ON whatsapp_inbox(session_id,status,created_at);
ALTER TABLE whatsapp_inbox ADD COLUMN started_at_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN finished_at_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN queue_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN context_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN ai_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN delivery_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN failure_stage TEXT;
