-- Operator-selected final reminder hold. Substitute the verified account ID
-- and original signup timestamp. Never changes email switches or user consent.
-- Refuses to reserve while delivery is enabled or dry-run is off.
INSERT INTO user_campaigns(user_id,campaign,campaign_version,state,current_step,experiment_variant,is_holdout)
SELECT u.id,'signup_unpaid',3,'active',3,'signup_1_7_14',0 FROM users u
WHERE u.id='__USER_ID__' AND u.created_at='__SIGNUP_AT__'
  AND u.email IS NOT NULL AND COALESCE(u.marketing_opt_out,0)=0
  AND COALESCE(u.marketing_consent_status,'unknown') IN ('unknown','consented') AND COALESCE(u.is_admin,0)=0
  AND u.subscription_plan IN ('free','pro','premium') AND u.subscription_status IN ('free','active','canceled')
  AND NOT(u.subscription_plan IN ('pro','premium') AND u.subscription_status='active')
  AND (u.subscription_ends_at IS NULL OR julianday(u.subscription_ends_at)<=julianday('now'))
  AND NOT EXISTS(SELECT 1 FROM apple_subscriptions a WHERE a.user_id=u.id AND a.expires_at>unixepoch()*1000 AND a.revoked_at IS NULL)
  AND NOT EXISTS(SELECT 1 FROM user_campaigns c WHERE c.user_id=u.id AND c.state='active' AND c.campaign<>'signup_unpaid')
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_enabled')='false'
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_dry_run')='true'
ON CONFLICT DO NOTHING;

INSERT INTO email_jobs(user_id,enrollment_id,job_type,campaign,campaign_version,step,status,scheduled_at,dedupe_key,experiment_variant,channel,metadata)
SELECT u.id,c.id,'drip','signup_unpaid',3,'DAY14','pending',strftime('%Y-%m-%dT%H:%M:%fZ','now'),u.id||':signup_unpaid:v3:DAY14','signup_1_7_14','email',
  json_object('ctaUrl','/pricing?source=signup_day14','ctaKey','signup_day14','subject','Still exploring Run Analytics?','previewText','Your final signup follow-up','operatorHeldFinalReminder',1)
FROM users u JOIN user_campaigns c ON c.user_id=u.id AND c.campaign='signup_unpaid' AND c.campaign_version=3 AND c.state='active'
WHERE u.id='__USER_ID__' AND u.created_at='__SIGNUP_AT__'
  AND u.email IS NOT NULL AND COALESCE(u.marketing_opt_out,0)=0
  AND COALESCE(u.marketing_consent_status,'unknown') IN ('unknown','consented')
  AND COALESCE(u.is_admin,0)=0 AND u.subscription_plan IN ('free','pro','premium') AND u.subscription_status IN ('free','active','canceled')
  AND NOT(u.subscription_plan IN ('pro','premium') AND u.subscription_status='active')
  AND (u.subscription_ends_at IS NULL OR julianday(u.subscription_ends_at)<=julianday('now'))
  AND NOT EXISTS(SELECT 1 FROM apple_subscriptions a WHERE a.user_id=u.id AND a.expires_at>unixepoch()*1000 AND a.revoked_at IS NULL)
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_enabled')='false'
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_dry_run')='true'
ON CONFLICT(dedupe_key) DO NOTHING;

INSERT INTO system_settings(key,value,updated_at)
SELECT 'drip_campaigns_preserved_final_users','[__USER_ID__]',strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE EXISTS(SELECT 1 FROM email_jobs j JOIN users u ON u.id=j.user_id WHERE u.id='__USER_ID__' AND u.created_at='__SIGNUP_AT__'
  AND j.dedupe_key=u.id||':signup_unpaid:v3:DAY14' AND j.status IN ('pending','processing','retry_scheduled'))
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_enabled')='false'
  AND (SELECT value FROM system_settings WHERE key='drip_campaigns_dry_run')='true'
ON CONFLICT(key) DO UPDATE SET value=CASE
  WHEN json_valid(system_settings.value) AND json_type(system_settings.value)='array' THEN
    CASE WHEN EXISTS(SELECT 1 FROM json_each(system_settings.value) WHERE value=__USER_ID__) THEN system_settings.value
      ELSE json_insert(system_settings.value,'$[#]',__USER_ID__) END
  ELSE system_settings.value END,updated_at=excluded.updated_at;
