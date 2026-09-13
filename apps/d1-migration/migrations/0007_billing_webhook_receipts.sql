CREATE TABLE billing_webhook_receipts (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  lease_owner TEXT,
  lease_until INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  completed_at INTEGER,
  received_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX billing_webhook_pending ON billing_webhook_receipts(lease_until) WHERE completed_at IS NULL;
