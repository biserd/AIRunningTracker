-- One private result per account. No activity names, source run data, or routes.
CREATE TABLE IF NOT EXISTS latest_race_estimates (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  estimate_json TEXT NOT NULL CHECK (json_valid(estimate_json)),
  calculated_at TEXT NOT NULL
);
