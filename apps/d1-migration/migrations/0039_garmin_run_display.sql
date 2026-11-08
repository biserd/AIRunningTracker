-- User corrections affect display matching only; source records remain intact.
CREATE TABLE IF NOT EXISTS garmin_run_match_exclusions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strava_record_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  garmin_activity_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,strava_record_id,garmin_activity_id),
  FOREIGN KEY(user_id,garmin_activity_id) REFERENCES garmin_activity_summaries(user_id,activity_id) ON DELETE CASCADE
);
