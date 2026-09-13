# Production migration on codex/cloudflare-coach

## Decision and current status

Use `codex/cloudflare-coach` as the single migration branch. GitHub main at
`c6f490feb9b7584759219402f9cc397bb4c30374` is already an ancestor; fetch/merge
verified on 2026-09-13 with no conflicts. No separate long-lived branch is needed.

This is migration groundwork, NOT a migrated production backend.

| Target | Code | Role |
| --- | --- | --- |
| Replit / aitracker.run | root server + client | Existing production; unchanged |
| aitracker-coach-preview / new.aitracker.run | apps/coach-cloudflare | Live waitlist and sample-data coach; unchanged |
| aitracker-api-staging | apps/api-cloudflare | Separate Worker, liveness only; all other requests return 503 |

Do not point live Strava, Stripe, Resend, or Hermes callbacks to staging.
Do not change the preview deployment build path to the migration API.
Use path-scoped CI/build triggers so API-only work does not redeploy the waitlist.
This repository setup does not itself modify Cloudflare dashboard build triggers.

## Local verification and optional staging deployment

From apps/api-cloudflare:

```sh
npm ci
npm run types
npm run check
npm test
npm run build
npm run dev
```

Local URL: http://localhost:8792/health. `migrationReady: false` is intentional.
`npm run deploy:staging` targets only aitracker-api-staging, with no custom domains.
No database, email, cron, queue or production service bindings exist yet.
Before any private API is enabled, protect staging with verified Cloudflare Access
authentication (including workers.dev bypass protection), plus application auth.
Never treat a supplied user ID or an unverified Access header as authentication.

## Database decision

Keep production Neon initially. Use a separate sanitized staging database and a
least-privilege role through Hyperdrive, with query caching disabled initially.
Never attach the production database to experimental staging code. Preview D1
sessions are not production identities and must not be imported as real users.

D1 evaluation follows hosting parity: measure total/table size, large stream rows,
query latency, growth and concurrency. Port PostgreSQL arrays/JSONB/casts/date SQL,
Stripe schema and transaction/claim semantics before considering cutover. Move
large stream/file payloads to R2 where justified. Preserve one source of truth per
dataset; do not implement uncoordinated dual writes.

## Ordered migration gates

- [x] Confirm main ancestry and keep one migration branch.
- [x] Add an isolated API Worker config and fail-closed health shell.
- [ ] Protect staging, attach a sanitized Neon copy via Hyperdrive, validate schema.
- [ ] Port real authentication, refresh/recovery and user-scoped storage; preserve
      password hashes with a Worker-compatible verifier and test cross-user denial.
- [ ] Port bounded profile/activity reads and analytics; compare fixtures/results
      against main. Keep units, time zones, missing-data behavior and pagination.
- [ ] Port plan reads/writes and reconciliation with ownership/idempotency tests.
- [ ] Replace in-memory Strava jobs with durable Queues; test replay, deletion,
      throttling, token refresh, historical backfill and recovery after restart.
- [ ] Move object storage to R2 with checksums, ACL checks and URL compatibility.
- [ ] Replace Replit Stripe connector/sync with explicit credentials and verified
      event handling; retain customer/subscription IDs and entitlement semantics.
- [ ] Port notifications, campaigns and MCP/Hermes. Preserve unsubscribe/suppression,
      consent, token audiences, scopes, revocation, channel identity and job dedupe.
- [ ] Serve existing public content/tools with SEO parity; connect the new coach UI
      to real accounts only once backend gates pass. Do not drop existing features.
- [ ] Rehearse production cutover and rollback, then merge back to main.

## Cutover rules

Keep main deployable and merge urgent main fixes regularly. Before switching DNS,
compare account/activity counts and representative analytics, verify paid access,
test data deletion and restore, and inspect logs for private content/token leakage.
Only one system may own notification scheduling and non-idempotent job execution.
Drain/record in-flight work and dedupe external events across the handover.
Rollback requires explicit job ownership transfer, not just reversing DNS.
Do not retire Replit until the observation window and restore rehearsal pass.

## Next required input

A separate staging Neon database/branch and credentials are needed for the first
real-data adapter. Use sanitized records or synthetic fixtures, distinct OAuth and
signing secrets, Stripe test mode and captured email delivery. Never paste production
secrets into this document or commit them. No production SQL is required by this step.
