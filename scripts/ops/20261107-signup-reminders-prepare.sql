-- Owner-requested preparation, not a schema migration. Dry-run stays ON.
-- Preserve old jobs and campaign history; do not replay legacy email backlogs.
UPDATE email_jobs SET status='cancelled',error_message='superseded_signup_1_7_14_launch',claimed_at=NULL,claimed_by=NULL,lease_expires_at=NULL
WHERE job_type='drip' AND COALESCE(campaign,'')<>'signup_unpaid' AND status IN ('pending','processing','retry_scheduled');
UPDATE user_campaigns SET state='exited',exit_reason='superseded_signup_1_7_14_launch',exited_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE state='active' AND campaign<>'signup_unpaid';
INSERT INTO system_settings(key,value,updated_at) VALUES
('drip_campaigns_enabled','true',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('drip_campaigns_dry_run','true',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('drip_campaigns_rollout_percent','100',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('drip_campaigns_holdout_percent','0',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('drip_campaigns_hourly_limit','25',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at;
