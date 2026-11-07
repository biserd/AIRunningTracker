-- Enable only after the deployed worker reports current, complete readiness.
-- No effect if the sender, suppression lookup or new sequence is not ready.
UPDATE system_settings SET value='false',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='drip_campaigns_dry_run'
AND EXISTS (SELECT 1 FROM system_settings AS runtime WHERE runtime.key='drip_campaigns_runtime_status'
  AND json_valid(runtime.value)
  AND json_extract(runtime.value,'$.signupReminders')=1
  AND json_extract(runtime.value,'$.campaignsEnabled')=1
  AND json_extract(runtime.value,'$.readiness.ready')=1
  AND julianday(json_extract(runtime.value,'$.checkedAt'))>=julianday('now','-15 minutes'));
