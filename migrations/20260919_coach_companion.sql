CREATE TABLE IF NOT EXISTS coach_companion_preferences (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), settings TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coach_companion_checkins (
 user_id INTEGER NOT NULL REFERENCES users(id), date TEXT NOT NULL, activity_id INTEGER NOT NULL DEFAULT 0,
 feeling TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,date,activity_id)
);
CREATE TABLE IF NOT EXISTS coach_companion_briefings (
 user_id INTEGER NOT NULL REFERENCES users(id), kind TEXT NOT NULL, reference TEXT NOT NULL,
 title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(user_id,kind,reference)
);
CREATE INDEX IF NOT EXISTS coach_companion_briefings_date ON coach_companion_briefings(user_id,created_at);
