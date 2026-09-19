CREATE TABLE IF NOT EXISTS coach_delivery_events (
 session_id TEXT NOT NULL,
 event_key TEXT NOT NULL,
 state TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(session_id,event_key)
);
