-- Run once against production during the P0 security deployment.
-- Preconditions:
--   1. New independent JWT_SECRET, UNSUBSCRIBE_TOKEN_SECRET, and
--      COACH_AGENT_WEBHOOK_SECRET values have been saved in Replit Secrets.
--   2. The new application version is ready to deploy immediately.
--
-- JWTs are stateless, so rotating JWT_SECRET invalidates web and magic-link
-- sessions without a database update. The statements below revoke every MCP
-- grant and invalidate unfinished OAuth requests/codes that could have been
-- authorized by a fallback-era web session.

BEGIN;

UPDATE mcp_oauth_tokens
SET revoked_at = now()
WHERE revoked_at IS NULL;

UPDATE mcp_oauth_authorization_codes
SET consumed_at = now()
WHERE consumed_at IS NULL;

UPDATE mcp_oauth_requests
SET consumed_at = now()
WHERE consumed_at IS NULL;

INSERT INTO mcp_audit_events (
  event_type,
  user_id,
  client_id,
  tool_name,
  success,
  error_code,
  duration_ms,
  created_at
) VALUES (
  'security_rotation_bulk_revoke',
  NULL,
  NULL,
  NULL,
  true,
  NULL,
  NULL,
  now()
);

COMMIT;
