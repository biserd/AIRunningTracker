BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consented_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_suppression_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_source text;

UPDATE users
SET marketing_consent_status = CASE
  WHEN marketing_opt_out = true THEN 'unsubscribed'
  ELSE 'unknown'
END
WHERE marketing_consent_status IS NULL OR marketing_consent_status = '';

ALTER TABLE user_campaigns ADD COLUMN IF NOT EXISTS campaign_version integer NOT NULL DEFAULT 2;
ALTER TABLE user_campaigns ADD COLUMN IF NOT EXISTS experiment_variant text NOT NULL DEFAULT 'control';
ALTER TABLE user_campaigns ADD COLUMN IF NOT EXISTS is_holdout boolean NOT NULL DEFAULT false;

UPDATE user_campaigns
SET campaign_version = 1
WHERE campaign IN ('segment_a', 'segment_b', 'segment_c', 'segment_d') AND campaign_version = 2;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, campaign, campaign_version ORDER BY id) AS duplicate_number
  FROM user_campaigns
)
UPDATE user_campaigns AS campaigns
SET campaign_version = -ranked.duplicate_number
FROM ranked
WHERE campaigns.id = ranked.id AND ranked.duplicate_number > 1;

DROP INDEX IF EXISTS user_campaigns_user_campaign_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS user_campaigns_user_campaign_unique_idx ON user_campaigns(user_id, campaign, campaign_version);

WITH active_ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, id DESC) AS active_number
  FROM user_campaigns WHERE state = 'active'
)
UPDATE user_campaigns AS campaigns
SET state = 'exited', exited_at = COALESCE(exited_at, NOW()), exit_reason = COALESCE(exit_reason, 'migration_duplicate_active'), updated_at = NOW()
FROM active_ranked
WHERE campaigns.id = active_ranked.id AND active_ranked.active_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_campaigns_one_active_idx ON user_campaigns(user_id) WHERE state = 'active';

ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS enrollment_id integer;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS campaign_version integer NOT NULL DEFAULT 2;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS experiment_variant text NOT NULL DEFAULT 'control';
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS claimed_at timestamp;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS claimed_by text;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS lease_expires_at timestamp;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS next_attempt_at timestamp;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS delivered_at timestamp;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS bounced_at timestamp;
ALTER TABLE email_jobs ADD COLUMN IF NOT EXISTS complained_at timestamp;

WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY dedupe_key ORDER BY id) AS duplicate_number
  FROM email_jobs
)
UPDATE email_jobs AS jobs
SET dedupe_key = jobs.dedupe_key || ':legacy:' || jobs.id
FROM duplicates
WHERE jobs.id = duplicates.id AND duplicates.duplicate_number > 1;

DROP INDEX IF EXISTS email_jobs_dedupe_key_idx;
CREATE UNIQUE INDEX IF NOT EXISTS email_jobs_dedupe_key_idx ON email_jobs(dedupe_key);
CREATE INDEX IF NOT EXISTS email_jobs_claim_idx ON email_jobs(status, scheduled_at, next_attempt_at, lease_expires_at);
CREATE INDEX IF NOT EXISTS email_jobs_provider_message_id_idx ON email_jobs(provider_message_id) WHERE provider_message_id IS NOT NULL;

ALTER TABLE email_clicks ADD COLUMN IF NOT EXISTS job_id integer;
ALTER TABLE email_clicks ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS email_clicks_dedupe_key_idx ON email_clicks(dedupe_key) WHERE dedupe_key IS NOT NULL;

INSERT INTO system_settings(key, value) VALUES ('drip_campaigns_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET value = 'false', updated_at = NOW();

INSERT INTO system_settings(key, value) VALUES ('drip_campaigns_dry_run', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW();

INSERT INTO system_settings(key, value) VALUES
  ('drip_campaigns_rollout_percent', '5'),
  ('drip_campaigns_holdout_percent', '10'),
  ('drip_campaigns_hourly_limit', '50')
ON CONFLICT (key) DO NOTHING;

COMMIT;
