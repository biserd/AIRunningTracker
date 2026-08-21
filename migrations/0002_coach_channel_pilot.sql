BEGIN;

CREATE TABLE IF NOT EXISTS coach_agent_pilot_users (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  added_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_channel_link_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel = 'telegram'),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_channel_link_tokens_user_idx ON coach_channel_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS coach_channel_link_tokens_expiry_idx ON coach_channel_link_tokens(expires_at);

CREATE TABLE IF NOT EXISTS coach_channel_bindings (
  id serial PRIMARY KEY,
  binding_id text NOT NULL UNIQUE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel = 'telegram'),
  provider_user_hash text NOT NULL,
  provider_chat_hash text NOT NULL,
  mcp_token_id integer REFERENCES mcp_oauth_tokens(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'provisioning_failed', 'revoked')),
  created_at timestamp NOT NULL DEFAULT now(),
  linked_at timestamp,
  revoked_at timestamp
);
CREATE INDEX IF NOT EXISTS coach_channel_bindings_user_idx ON coach_channel_bindings(user_id);
CREATE INDEX IF NOT EXISTS coach_channel_bindings_provider_user_idx ON coach_channel_bindings(provider_user_hash);
CREATE INDEX IF NOT EXISTS coach_channel_bindings_provider_chat_idx ON coach_channel_bindings(provider_chat_hash);
CREATE UNIQUE INDEX IF NOT EXISTS coach_channel_bindings_active_user_channel_uidx
  ON coach_channel_bindings(user_id, channel) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS coach_channel_bindings_active_provider_user_uidx
  ON coach_channel_bindings(channel, provider_user_hash) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS coach_channel_bindings_active_provider_chat_uidx
  ON coach_channel_bindings(channel, provider_chat_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS coach_agent_callback_events (
  delivery_id text PRIMARY KEY,
  received_at timestamp NOT NULL DEFAULT now()
);

COMMIT;

-- After deployment, invite test runners explicitly by email. Replace the
-- examples; do not remove the WHERE clause or bulk-enable the user table.
-- INSERT INTO coach_agent_pilot_users (user_id, enabled)
-- SELECT id, true FROM users
-- WHERE lower(email) IN ('runner-one@example.com', 'runner-two@example.com')
-- ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Remove pilot access and disconnect through the Settings UI before deleting
-- an allowlist row so the associated MCP grant is revoked cleanly.
