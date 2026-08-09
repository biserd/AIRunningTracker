ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_timezone text DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_briefing_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_briefing_hour integer DEFAULT 7;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_weather_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_weather_location jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_preferred_channel text DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_snoozed_until timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_availability text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_availability_date text;

ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS processing_started_at timestamp;

CREATE TABLE IF NOT EXISTS coach_message_feedback (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  notification_id integer NOT NULL,
  rating text NOT NULL,
  reason text,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS coach_message_feedback_user_id_idx
  ON coach_message_feedback(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS coach_message_feedback_user_notification_idx
  ON coach_message_feedback(user_id, notification_id);

-- PostgreSQL permits multiple NULL values in a unique index. If this statement
-- reports existing duplicate non-null keys, reconcile those legacy rows first;
-- runtime advisory locks still prevent new duplicates during the rollout.
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_dedupe_unique_idx
  ON notification_outbox(dedupe_key);
