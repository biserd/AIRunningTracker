-- Saved free preview, deliberately separate from the adaptive training plans.
CREATE TABLE IF NOT EXISTS starter_weeks (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL CHECK (json_valid(settings_json)),
  saved_at TEXT NOT NULL
);
