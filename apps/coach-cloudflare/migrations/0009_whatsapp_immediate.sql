ALTER TABLE whatsapp_inbox ADD COLUMN received_at_ms INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN processing_path TEXT;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_last_status INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_last_code INTEGER;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_last_outcome TEXT;
ALTER TABLE whatsapp_inbox ADD COLUMN typing_last_ms INTEGER;
