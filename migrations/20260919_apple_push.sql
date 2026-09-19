-- Additive D1 migration. No changes to existing runner, email or Expo records.
CREATE TABLE IF NOT EXISTS apple_push_devices (
  installation TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('production','sandbox')),
  generation TEXT NOT NULL,
  reminders INTEGER NOT NULL DEFAULT 1 CHECK(reminders IN (0,1)),
  runs INTEGER NOT NULL DEFAULT 1 CHECK(runs IN (0,1)),
  enabled_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(token,environment)
);
CREATE INDEX IF NOT EXISTS apple_push_devices_user ON apple_push_devices(user_id);
CREATE TABLE IF NOT EXISTS apple_push_reminders (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  cancelled INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS apple_push_reminders_due ON apple_push_reminders(due_at,cancelled);
CREATE TABLE IF NOT EXISTS apple_push_outbox (
  id TEXT PRIMARY KEY,
  installation TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  generation TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('run','reminder','test')),
  reference TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER,
  error_code TEXT,
  UNIQUE(installation,generation,kind,reference)
);
CREATE INDEX IF NOT EXISTS apple_push_outbox_pending ON apple_push_outbox(state,next_attempt);
