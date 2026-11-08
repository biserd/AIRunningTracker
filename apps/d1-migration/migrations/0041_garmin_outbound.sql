-- A metadata-only ledger prevents duplicate remote creation after retries/reconnects.
-- Retained on disconnect; user deletion removes it. No routes or workout content stored here.
CREATE TABLE garmin_outbound (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 account_hash TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('workout','course')),
 source_key TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('creating','created','scheduling','sent','uncertain','failed')),
 remote_id TEXT,
 schedule_id TEXT,
 calendar_date TEXT,
 error_code TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(user_id,account_hash,kind,source_key)
);
CREATE INDEX garmin_outbound_limits ON garmin_outbound(user_id,created_at);
CREATE TABLE garmin_outbound_calls (
 id TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL
);
CREATE INDEX garmin_outbound_calls_time ON garmin_outbound_calls(created_at,user_id);
