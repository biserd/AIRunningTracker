# Full application migration rehearsal

This target runs the existing root Express server and React frontend in Cloudflare
Containers. It does not replace the separate `new.aitracker.run` coach preview.

## Build

Cloudflare Workers Builds, repository `biserd/AIRunningTracker`, branch
`codex/cloudflare-coach`, root `/`:

- Build command: `npm ci --prefix apps/api-cloudflare --ignore-scripts --no-audit --no-fund`
- Deploy command: `npx --prefix apps/api-cloudflare wrangler deploy --config apps/api-cloudflare/container/wrangler.jsonc`
- Disable preview builds from other branches.
- The Docker build installs root dependencies and builds the existing application.
- Local image builds require Docker. Workers Builds supplies the remote builder.

## Safety boundary

This configuration is deliberately staging-only, even if an external environment
variable says production. It uses an independent session signing key, read-only
Postgres transactions, blocks non-read requests except the supported sign-in paths, disables
scheduled jobs and Strava job processing, and does not forward provider keys.
Login does not reactivate dormant accounts in this environment.
Existing-account magic-link email is enabled for the approved test recipient using
Cloudflare Email Service; see MAGIC_LINKS.md. AI calls, registration, billing,
Strava OAuth callback processing and uploads are not enabled in this rehearsal.
Do not advertise this target as production-ready.

`DATABASE_URL` must be stored as an encrypted Worker secret. Never put it in a
build variable, Docker build argument, image layer or repository file.
`JWT_SIGNING_SECRET` is independent from the live production key.
The existing encrypted `CUTOVER_EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2` is used only
to satisfy application initialization; no mail provider is configured.

## Verification

- Root `npm run build`
- `node scripts/test-cloudflare-runtime.mjs`
- `tsx --test server/config/runtime.test.ts`
- In this directory: `../node_modules/.bin/wrangler types` then
  `../node_modules/.bin/tsc --noEmit`

## Cutover blockers

Do not disable Replit until all are complete:

1. Deploy and smoke-test the container image, including authenticated read paths.
2. Replace Replit App Storage, copy required objects, preserve private ownership.
3. Provide durable sync processing and a single scheduled-job owner across hosts.
4. Verify production provider configuration, session continuity, billing and webhook
   signatures with the existing production database and callback URLs.
5. Rehearse backups, rollback, traffic switch and queue draining.
6. Drain Replit jobs, stop Replit execution, and verify its scheduler is stopped
   BEFORE starting the Cloudflare production container. The old Replit process
   does not participate in the new PostgreSQL scheduler lock. Switch traffic only
   after the production configuration and rollback procedure are verified.

The production DB host was verified in Replit's Production Database settings on
2026-09-13 as `ep-falling-bird-ahn3og92.c-3.us-east-1.aws.neon.tech` (1.61 GB shown).
This corrects the earlier assumption that the supplied URL was a separate Dev DB.

## Latest local verification (2026-09-13)

The root production build, full-app runtime smoke test, container TypeScript check,
18 API adapter tests, and `test:phase1` pass. The PostgreSQL OAuth lifecycle test
inside `test:phase1` is skipped without a dedicated `MCP_TEST_DATABASE_URL`; it must
not be run against the live database. Cloudflare Builds is connected using the
AITracker migration staging builds token. The runtime DATABASE_URL secret was
verified as encrypted in the dashboard.

The remote image deployed successfully as Worker version
`edaccfdd-764b-453a-b50f-5b1f7865b3d8`, container application
`a0388380-9721-4a1a-a85e-7c9c733a7070`. Live checks against
`https://aitracker-api-staging.biser-d.workers.dev` returned:

- `/health`, `/auth`, `/tools/race-predictor`: 200
- `/api/shoes/brands`: 200, 32 brands (verifies the database connection)
- `/api/user` without credentials: 401
- POST `/api/stripe/webhook/test`: 503, expected staging refusal

R2 was activated by the account owner. All 91 public images (36,050,640 bytes)
were copied into `aitracker-main-assets` and individually verified against the
source using SHA-256 after downloading them back from R2. Source files remain
unchanged. The Worker preserves `/public-objects/og/` and `/public-objects/shoes/`
URLs and serves only approved image keys through its R2 binding. The bucket
does not require public access. Private uploads still require migration.

The inventory is in `scripts/replit-public-assets.mjs`. Run
`node scripts/migrate-public-assets-r2.mjs` to verify existing copies, or add
`--apply` to copy missing objects. Existing objects are never overwritten.
Replit remains live pending the other cutover checks above.

The R2 deployment from `6c08434` completed successfully through Cloudflare
Builds. `node scripts/verify-staging-public-assets.mjs` verified all 91 existing
public URLs on the staging HTTPS endpoint against production SHA-256 hashes,
plus HEAD, conditional 304 responses and rejection of private/traversal paths.
After deployment `/health` and `/api/shoes/brands` returned 200, and unauthenticated
`/api/user` returned 401. All 21 API tests and both TypeScript checks pass.

## Current cutover gate (2026-09-13)

The migration branch now includes an explicit read-only banner, route titles,
disabled primary mutation controls, and an admin-only `/migration-checks` page.
The GET `/api/admin/migration/readiness` endpoint verifies the signed-in account's
current admin status in PostgreSQL and returns only readiness booleans. It is not
a generic SQL interface and never returns credentials or runner records.

28 adapter tests pass, including job lease loss, renewal failure, completion races,
queue recovery/owner fencing and readiness authorization. These are local tests,
not proof of real production multi-process failover. A lost or stalled job renewal
terminates its process. Already accepted external requests are still subject to
provider idempotency; delivery must not be described as exactly-once.

Before traffic changes:

1. Apply `migrations/20260913_cloudflare_jobs.sql` to production with the owner's
   approval. It is additive and does not enable workers. Confirm the expected
   columns and constraints, not merely the table name.
2. Deploy the production target with the original production signing/provider
   secrets. Staging's independent signing key must never replace the live key.
3. Validate Strava callback subscription, Stripe webhook destination/signature,
   MCP token continuity, a dedicated test runner's email and private upload, and
   actual scheduler takeover in a writable rehearsal environment. Do not send
   campaigns or purchase a subscription as an unannounced smoke test.
4. Verify a recoverable database backup and record the current DNS/Worker route
   configuration and deployed image version.
5. Drain Replit's in-memory queue and stop its deployment before Cloudflare's
   jobs-role container starts. Keep the project and database for rollback.
6. Route the main domain, verify authenticated reads and expected callbacks, then
   enable the keepalive cron. Watch failures and queue age before declaring done.

Rollback: stop Cloudflare's cron AND running jobs container first, restore the
previous route, then restart Replit. Do not start both schedulers concurrently.
Pending durable Cloudflare jobs remain in PostgreSQL and need deliberate recovery;
the old Replit process cannot consume that queue. Do not drop the queue table.
