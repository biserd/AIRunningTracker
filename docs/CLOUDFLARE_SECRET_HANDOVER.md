# Replit retirement: credentials and cutover

Never put secret values in this file, Wrangler vars, GitHub issues or build logs.
This records verified transfers and the remaining cutover gates. It contains no secret values.

## Current state (2026-09-13)

- The supplied Neon connection is stored in staging Hyperdrive. Query caching is disabled.
- A read-only schema inventory succeeded. The public application tables and Stripe schema exist.
- Replit's Production Database UI independently confirmed this is the live 1.61 GB database.
- Nineteen application/provider/config entries are now installed as encrypted
  `CUTOVER_*` secrets in `aitracker-api-staging`. The admin preflight now uses the
  provider keys for fixed read-only checks; they are not passed into the staging application container. Sources were copied from Replit and compared in memory before
  saving. The live and test Stripe key prefixes were checked independently.
- `JWT_SIGNING_SECRET` is a separately generated staging key. Never replace it
  with `CUTOVER_JWT_SIGNING_SECRET` while using a different database from production.
- Preserved entries cover the seven signing/identity secrets, coach webhook URL,
  OpenAI, Resend key/webhook/sender, Strava secret/client ID, app URL, and live/test
  Stripe private/public keys. VAPID keys and a destination-specific Stripe webhook
  signing secret have not been provisioned or verified.
- Replit remains the sole production owner. Do not stop its deployment yet.
- On September 13, the user separately approved the same production secret transfer
  to `aitracker-main`. Sixteen application entries, `DATABASE_URL` and the verified
  `STRAVA_SUBSCRIPTION_ID` (327049) were saved as encrypted secrets. The Worker was
  created as an inert placeholder; its workers.dev and preview URLs are disabled.
  No main-domain route or scheduler was enabled.
- Live preflight passed Stripe live recurring prices, matching enabled Stripe
  webhook configuration, Strava subscription and OpenAI model discovery.
  These are configuration reads, not signed delivery or paid-inference tests.
- Resend domain listing returned 401. Sending-only keys can legitimately return
  this response. Do not replace the key or grant broader permissions based on
  that status alone. The bounded error classification confirmed `restricted_api_key`.
  The user approved one test email to biserd@gmail.com. Resend accepted that
  fixed-recipient, idempotent test from the Cloudflare edge at approximately
  09:22 America/New_York. Inbox receipt remains to be confirmed by the user.
- Detailed production `cloudflare_jobs` verification passed: all 14 columns,
  five validated constraints and three valid/ready indexes match the SQL migration.
- Scheduler standby takeover, connection loss, stalled heartbeat and startup
  failure have controlled test coverage. Live failover and Replit drain/stop
  have NOT been executed. Production defaults to `APP_ROLE=web`; only switch
  to `jobs` after Replit timers have stopped and pending work is accounted for.

## Preserve these values at production cutover

At cutover, verify against the current production deployment, not an old unused secret.
Use distinct values in staging. These names are verified against current server code.

| Secret | Why preserve it |
| --- | --- |
| `JWT_SIGNING_SECRET` | Existing web sessions and signed email authentication links |
| `EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2` | Existing unsubscribe links must keep working |
| `MARKETING_LINK_SIGNING_SECRET` | Existing signed marketing links |
| `MCP_TOKEN_HASH_SECRET` | Validation of existing stored MCP tokens |
| `CHANNEL_IDENTITY_HASH_SECRET` | Existing Telegram identity bindings |
| `COACH_BINDING_CALLBACK_SECRET` | Must match the Hermes binding callback signer |
| `COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2` | Must match the current coach webhook verifier |
| `VAPID_PRIVATE_KEY` | Existing web push subscriptions; preserve its public-key pair |

Do not substitute legacy `JWT_SECRET`, `UNSUBSCRIBE_TOKEN_SECRET`, or
`COACH_AGENT_WEBHOOK_SECRET` merely because they exist in Replit. The current code
uses the names above. Rotate separately with a compatibility plan, not as an
uncoordinated side effect of changing hosting.

## External providers

| Integration | Required configuration | Verification before cutover |
| --- | --- | --- |
| Neon | Hyperdrive origin credentials | Confirm production database identity, backups and least-privilege role |
| Strava | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_VERIFY_TOKEN` | Existing athlete tokens retained; callback and webhook replay test |
| Stripe | `STRIPE_SECRET_KEY`, public key, approved price IDs | Obtain actual live keys from the existing connector; never use `TESTING_*` values for production |
| Stripe webhook | Signing secret for the destination endpoint | New verifier must validate raw bodies; endpoint-specific secret is not interchangeable |
| Resend | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, sender configuration | Preserve delivery, unsubscribe, bounce and complaint handling; no staging campaign sends |
| OpenAI | `OPENAI_API_KEY` | Server-side only, never `VITE_OPENAI_API_KEY` or client bundle |
| Hermes | Existing signing secrets plus URL and MCP client ID | Per-runner ownership, callback verification, token refresh and duplicate-event tests |
| Web push | VAPID key pair and subject | Existing subscriber can receive a single controlled test |

Public configuration includes `PUBLIC_APP_URL`, `APP_URL`, `RESEND_FROM_EMAIL`,
`ALLOWED_PRICE_IDS`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL`,
`TELEGRAM_BOT_USERNAME`, `HERMES_MCP_CLIENT_ID`, `COACH_AGENT_WEBHOOK_URL`,
`MCP_ISSUER`, `MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS`, and `VAPID_PUBLIC_KEY`.
Preserve whichever of these are used by the migrated module. Validate URLs rather
than copying Replit development URLs into production configuration.

Do not copy Replit connector identity or object-storage sidecar configuration.
Replace the connector with direct provider credentials. Copy storage objects to
R2 with ACL and checksum verification before retiring the source.

## Job ownership

Keep Cloudflare production delivery disabled until cutover. Port each timer to
durable Queues or scheduled handlers with atomic job claims and deduplication.
`ENABLE_NOTIFICATION_DELIVERY` and `ENABLE_PROACTIVE_COACH_WORKER` are existing
code settings, not proof that every campaign/sync worker is disabled. Inventory
and explicitly stop every scheduler on Replit before enabling its replacement.

## Required shutdown evidence

1. Production database identified and backup restore rehearsed.
2. Login, Strava login/refresh, password reset and existing sessions tested.
3. Activities, plans and representative analytics match the existing application.
4. Paid access and checkout work without changing customer/subscription IDs.
5. Stripe, Strava, Resend and Hermes callbacks survive duplicate delivery.
6. Stored files are copied and private files remain private.
7. Campaign opt-outs, scheduled coaching and deletion work on Cloudflare.
8. Public pages, robots, sitemap, canonical URLs and redirects retain parity.
9. Only one deployment runs scheduled jobs; in-flight work is drained or handed over.
10. DNS cutover, observation and rollback are tested before deleting the Replit deployment.

The new coach preview is a separate deployment and is not evidence of these gates.
The user declined the optional Cloudflare Access email gate on 2026-09-13.
Application authentication remains mandatory; no caller-supplied user ID grants access.
