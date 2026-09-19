CREATE TABLE whatsapp_schedules (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 link_generation TEXT NOT NULL,
 grant_generation TEXT NOT NULL,
 title TEXT NOT NULL,
 timezone TEXT NOT NULL,
 local_time TEXT NOT NULL,
 recurrence TEXT NOT NULL CHECK(recurrence IN ('daily','weekly')),
 anchor_at INTEGER NOT NULL,
 next_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN (0,1))
);
CREATE INDEX whatsapp_schedules_due ON whatsapp_schedules(cancelled,next_at);
CREATE TABLE whatsapp_schedule_occurrences (
 schedule_id TEXT NOT NULL REFERENCES whatsapp_schedules(id) ON DELETE CASCADE,
 reminder_id TEXT PRIMARY KEY REFERENCES whatsapp_reminders(id) ON DELETE CASCADE
);
