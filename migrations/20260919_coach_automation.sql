-- Additive. Does not opt anyone in or alter existing reminders or workouts.
CREATE TABLE IF NOT EXISTS coach_reminder_schedules (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id TEXT NOT NULL,
 title TEXT NOT NULL,
 timezone TEXT NOT NULL,
 recurrence TEXT NOT NULL CHECK(recurrence IN ('daily','weekly')),
 anchor_at INTEGER NOT NULL,
 next_at INTEGER NOT NULL,
 cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN (0,1)),
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS coach_reminder_schedules_due ON coach_reminder_schedules(cancelled,next_at);
CREATE TABLE IF NOT EXISTS coach_notification_deliveries (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_key TEXT NOT NULL,
 channel TEXT NOT NULL CHECK(channel IN ('push','email','whatsapp','none')),
 state TEXT NOT NULL DEFAULT 'pending',
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,event_key)
);
