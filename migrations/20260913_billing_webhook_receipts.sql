-- Apply before deploying the durable webhook handler. Additive; no runner records changed.
CREATE TABLE IF NOT EXISTS billing_webhook_receipts (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  lease_owner TEXT,
  lease_until TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_webhook_pending ON billing_webhook_receipts(lease_until) WHERE completed_at IS NULL;
