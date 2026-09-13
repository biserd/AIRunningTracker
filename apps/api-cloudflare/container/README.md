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
Postgres transactions, blocks non-read requests except password login, disables
scheduled jobs and Strava job processing, and does not forward provider keys.
Login does not reactivate dormant accounts in this environment.
Email, AI calls, registration, billing, OAuth callback processing and uploads are
not enabled in this rehearsal. Do not advertise this target as production-ready.

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
6. Switch the main domain only after verification, then stop Replit execution.

The production DB host was verified in Replit's Production Database settings on
2026-09-13 as `ep-falling-bird-ahn3og92.c-3.us-east-1.aws.neon.tech` (1.61 GB shown).
This corrects the earlier assumption that the supplied URL was a separate Dev DB.
