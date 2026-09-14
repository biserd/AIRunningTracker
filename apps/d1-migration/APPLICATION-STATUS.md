# Application migration verification

Status: local implementation in progress. Not a production cutover certificate.

The isolated `scripts/d1/build-application.ts` build bundles the existing Express
application against the generated SQLite schema and D1 transport. It does not
replace the production build or bind production traffic to the imported snapshot.
The transport must only be mounted on a Container private outbound handler, never
on the site's public fetch router. Runtime database access uses native bindings,
not Cloudflare's administrative REST API.

Implemented locally:

- Typed application ORM with date, JSON, array and boolean codecs.
- Atomic activity/conversation deletion and owner-scoped message insertion.
- D1 queue, scheduler lease and durable Stripe receipt selection in the D1 build.
- Dedicated Stripe signature verification without the PostgreSQL catalog mirror.
- Single-statement subscription identity and entitlement update.
- SQLite-compatible reporting, email claim and rate-limit queries.
- Goal read/write ownership enforcement and Strava connection subject enforcement.
- No automatic demo account creation in Cloudflare deployments.

Verified locally on synthetic data:

- 30 unit/integration tests pass.
- Full Express application login, identity, user, activities, dashboard, fitness,
  training-plan list and goal reads pass.
- Goal creation ignores a foreign caller-supplied owner; cross-account completion
  and deletion cannot change the other account; own goal lifecycle persists.
- Cross-account Strava connection is rejected before contacting the provider.

Commands, from repository root:

```text
node node_modules/tsx/dist/cli.mjs scripts/d1/build-application.ts
node node_modules/tsx/dist/cli.mjs scripts/d1/application-smoke.ts
node node_modules/tsx/dist/cli.mjs --test scripts/d1/*.test.ts
```

Remaining release gates:

1. Port the three interactive Telegram binding transactions while preserving
   atomic token consumption, identity uniqueness and grant revocation.
2. Verify remaining route/service SQL and large activity result bounds.
3. Exercise signed billing events through the full deployed handler, including
   retries and event ordering; provision the correct endpoint signing secret.
4. Deploy the isolated application container and private D1 binding transport;
   test real authentication, provider callbacks and scheduler handover there.
5. Refresh production data under a controlled write handover and verify deterministic
   payload parity, exclusions, quarantine, referential integrity and counts.
6. Switch production only after the above gates pass, with rollback prepared.

The focused runtime typecheck currently also reaches an existing Stripe API-version
type mismatch (2025-08-27.basil versus installed SDK's 2025-11-17.clover). An API
version upgrade must be tested, not silently made to satisfy a typecheck.

Neon remains authoritative. The prior D1 snapshot is stale and its full payload
checksum parity has not been certified. No production route or scheduler change
was made during these local application tests.
