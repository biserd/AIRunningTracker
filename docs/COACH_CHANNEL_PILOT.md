# Multi-runner Telegram coach pilot

This pilot connects an invited RunAnalytics runner to one Telegram identity and
one dedicated, read-only MCP grant. It is not a global launch switch.

## Security boundary

- The runner starts linking while authenticated in AI Coach Settings.
- RunAnalytics creates a random, single-use link valid for 10 minutes. Only its
  SHA-256 hash is stored.
- Hermes handles `/start <link>` and posts the exact Telegram user/chat IDs to
  the RunAnalytics callback over a timestamp-bound HMAC request.
- RunAnalytics derives the runner from the consumed link. The callback cannot
  supply a RunAnalytics user ID.
- Telegram user/chat IDs are HMAC-hashed before storage. Raw identifiers,
  OAuth tokens and response bodies are excluded from application logs.
- The dedicated MCP token is bound to the fixed Hermes OAuth client, the MCP
  resource and the linked runner. The model never selects or supplies a user ID.
- Events sent to Hermes contain only the opaque `binding_id` and the bounded
  domain record ID. Hermes must resolve that binding outside model context.
- Disconnect revokes the binding and its MCP token.

## Production configuration

Apply `migrations/0002_coach_channel_pilot.sql`, then configure:

```text
COACH_MULTI_RUNNER_PILOT_ENABLED=true
TELEGRAM_BOT_USERNAME=<bot username without @>
HERMES_MCP_CLIENT_ID=<the fixed active OAuth client ID stored in mcp_oauth_clients>
COACH_AGENT_WEBHOOK_URL=https://<hermes-host>/<private-event-route>
COACH_AGENT_WEBHOOK_SECRET=<independent random secret, 32+ characters>
COACH_BINDING_CALLBACK_SECRET=<independent random secret, 32+ characters>
CHANNEL_IDENTITY_HASH_SECRET=<independent random secret, 32+ characters>
MCP_TOKEN_HASH_SECRET=<existing MCP token hashing secret, 32+ characters>
```

Do not reuse `JWT_SIGNING_SECRET`, Telegram bot tokens, MCP access/refresh tokens, or
any Stripe/Strava secret for these values. Keep the existing
`COACH_AGENT_PILOT_USER_ID` only if a rollback to the legacy single-runner
delivery path is required.

Add test accounts with an explicit email allowlist:

```sql
INSERT INTO coach_agent_pilot_users (user_id, enabled)
SELECT id, true
FROM users
WHERE lower(email) IN ('first-runner@example.com', 'second-runner@example.com')
ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled;
```

The account must also have active Premium/trial AI Coach entitlement.

## Hermes callback contract

Hermes receives the Telegram deep-link command. Before invoking any model, its
service layer sends:

```http
POST https://aitracker.run/api/integrations/hermes/telegram-binding
Content-Type: application/json
X-Hermes-Timestamp: <unix-seconds>
X-Hermes-Delivery: <unique 16-128 character delivery ID>
X-Hermes-Signature: v1=<hex HMAC-SHA256>

{"event_type":"telegram.binding.complete","link_token":"ra_tg_link_...","telegram_user_id":"123","telegram_chat_id":"123","telegram_chat_type":"private"}
```

The signature input is the UTF-8 bytes of:
`<timestamp>.<exact raw JSON body>`, keyed with
`COACH_BINDING_CALLBACK_SECRET`. Requests older/newer than five minutes and
reused delivery IDs are rejected.
Group, channel and supergroup chats are rejected; a runner must link the bot in
a private Telegram conversation.

On success, RunAnalytics returns the opaque binding ID and the dedicated MCP
access/refresh grant once. Hermes stores these in its credential store keyed by
`binding_id`; none of these values may enter a prompt, transcript or log.

## Incoming RunAnalytics events

RunAnalytics signs events with `COACH_AGENT_WEBHOOK_SECRET` in
`X-RunAnalytics-Signature` over `<timestamp>.<exact raw body>`. Hermes must
reject stale timestamps and reused `X-RunAnalytics-Delivery` IDs. Events include
`binding_id` and never include a RunAnalytics user ID or MCP token.

Supported pilot events:

- `activity.ready`: select the credential for `binding_id`, then query that
  runner's activity through the bounded MCP tools.
- `binding.revoked`: delete all cached credentials and routing state for that
  `binding_id` immediately.

## Rollout and rollback

1. Apply the migration and configure secrets while the feature flag is false.
2. Deploy and verify normal web/MCP behavior.
3. Enable the flag and add two internal test accounts.
4. Test link, cross-account isolation, activity event, refresh, disconnect and
   reconnect for each account.
5. Inspect logs to confirm no link, Telegram identity, bearer token or private
   response body appears.
6. Expand the allowlist gradually. Do not enable all users during this pilot.

Emergency rollback: set `COACH_MULTI_RUNNER_PILOT_ENABLED=false`, restart the
app, disconnect active bindings through the service/UI when available, and
revoke affected `mcp_oauth_tokens`. Keep the tables for audit/forensics.
