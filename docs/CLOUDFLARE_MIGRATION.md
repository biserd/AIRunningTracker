# Production migration on codex/cloudflare-coach

## Decision and current status

Use `codex/cloudflare-coach` as the single migration branch. GitHub main at
`c6f490feb9b7584759219402f9cc397bb4c30374` is already an ancestor; fetch/merge
verified on 2026-09-13 with no conflicts. No separate long-lived branch is needed.

This is migration groundwork, NOT a migrated production backend.

Additional progress on 2026-09-13: the approved Neon database responded to a
read-only schema inventory and contains public application tables and a Stripe
schema. Initial isolated session verification and owner-scoped profile/activity
read adapters now have automated tests. Password login and initial authenticated
reads are deployed, but do not establish full authentication or production data parity.
Eighteen tests pass, including bcrypt login, token purposes, ownership, request
limits and safe errors. Live health, unauthorized reads, invalid login and closed
billing/MCP routes were checked. Version: `61db2020-ce2b-410e-9c39-0e6486cf6dd6`.
Credential continuity and shutdown gates
are recorded in [the secret handover](CLOUDFLARE_SECRET_HANDOVER.md).

| Target | Code | Role |
| --- | --- | --- |
| Replit / aitracker.run | root server + client | Existing production; unchanged |
| aitracker-coach-preview / new.aitracker.run | apps/coach-cloudflare | Live waitlist and sample-data coach; unchanged |
| aitracker-api-staging | apps/api-cloudflare | Separate Worker with initial password login and authenticated reads; remaining routes return 503 |

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
A user-approved Neon Hyperdrive binding exists. No email, cron, queue or
production service bindings exist. Initial reads use explicit read-only transactions.
The user declined optional Cloudflare Access on 2026-09-13. Application authentication
and ownership checks apply on every runner route, including workers.dev.
Never treat a supplied user ID or an unverified Access header as authentication.

## Database decision

Keep production Neon initially. The target for full integration is a separate sanitized staging database and a
least-privilege role through Hyperdrive, with query caching disabled initially.
Do not enable experimental write code on production data. Preview D1
sessions are not production identities and must not be imported as real users.

D1 evaluation follows hosting parity: measure total/table size, large stream rows,
query latency, growth and concurrency. Port PostgreSQL arrays/JSONB/casts/date SQL,
Stripe schema and transaction/claim semantics before considering cutover. Move
large stream/file payloads to R2 where justified. Preserve one source of truth per
dataset; do not implement uncoordinated dual writes.

## Ordered migration gates

- [x] Confirm main ancestry and keep one migration branch.
- [x] Add an isolated API Worker config and fail-closed health shell.
- [ ] Verify a sanitized Neon copy and least-privilege role; connectivity is established.
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

On 2026-09-13 the user explicitly approved the supplied Neon endpoint
`ep-falling-bird-ahn3og92` after the Replit internal `helium` connection proved
unreachable and the stored `NEON_DATABASE_URL` endpoint proved disabled.
Hyperdrive `aitracker-neon-staging` (`a75ea8f13ccd4939bb0178b798e1ffc8`) validates
and stores that connection, with caching disabled. Only its non-secret ID is in git.
No Replit secret values, records, schema or production deployments were changed.
Selected secrets were copied into encrypted inactive `CUTOVER_*` staging entries.

This is not confirmation that the database is sanitized or development-only.
The supplied role is `neondb_owner`. Before write paths are enabled, verify database
ownership/environment, use a least-privilege role and rotate the credential shared
in chat. Retain application authentication. Use distinct staging signing secrets, Stripe
test mode and captured email delivery. No production SQL is required by this step.
