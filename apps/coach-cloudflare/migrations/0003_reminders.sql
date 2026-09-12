CREATE TABLE reminder_contacts (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  generation TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL,
  verified_at INTEGER,
  code_hash TEXT,
  code_expires INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  disabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE email_reminders (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  generation TEXT NOT NULL,
  title TEXT NOT NULL,
  local_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','scheduled','sending','sent','failed','unknown','cancelled','expired')),
  draft_expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  claimed_at INTEGER,
  sent_at INTEGER,
  provider_id TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX reminders_due ON email_reminders(status,next_attempt_at);
CREATE INDEX reminders_owner ON email_reminders(session_id,created_at);
CREATE TABLE reminder_optouts (
  token_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  generation TEXT NOT NULL
);
