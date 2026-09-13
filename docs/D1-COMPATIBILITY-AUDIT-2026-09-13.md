# Neon to D1 compatibility audit

Date: 2026-09-13. Repository: biserd/AIRunningTracker, branch `codex/cloudflare-coach`, commit `85bdebe`.

## Subsequent implementation decision

The user superseded the R2 recommendation below: leave the 33 oversized activities
unchanged in Neon and exclude them from D1. No R2 storage is added for this migration.
The original audit below is retained as historical evidence, not the current payload
storage plan. See `apps/d1-migration/README.md` for the implementation and release gates.

## Verdict

No-go for a direct database copy or connection-string swap. A Cloudflare-only implementation is feasible in principle, but requires a D1 + private R2 data design and changes to billing persistence, transactions, scheduling and the data-access layer. This is a backend migration, not a hosting setting.

Keep production Neon running during implementation. Connecting both frontends to the existing backend does not require this migration and can happen independently.

## Evidence and scope

Read source, migrations and deployment configuration. Ran SELECT-only metadata and aggregate queries through the authenticated Neon SQL editor against project `jolly-morning-62607327`, branch `AITracker-prod` (`br-sparkling-tree-avsmhf97`), database `neondb`, primary endpoint `ep-green-salad-avs106uo`. Did not fetch credentials or individual runner payloads. No production data, settings, deployments or integrations were changed. The console retains query history.

This is a compatibility assessment, not a completed D1 import, load test, full referential-integrity audit or proof that all application behavior has parity.

## Live database findings

| Measurement | Observed result |
|---|---:|
| PostgreSQL database physical size | 1,575 MB |
| Public application tables | 47 |
| Stripe schema tables | 29 |
| Internal `_system` tables | 1 |
| Activities, exact count at audit | 79,955 |
| Users, statistics estimate | 570 |
| Largest public table column count | users: 79 |
| Activities column count | 51 |
| Installed extensions | plpgsql only |
| Public tables with RLS enabled | 0 |
| Public non-internal triggers | 0 |
| Public foreign-key constraints | 7 |
| Largest streams_data value | 25,769,457 bytes |
| Largest combined streams/laps/polylines payload | 25,985,045 bytes |
| Activity payloads exceeding 2,000,000 bytes | 33 |
| Total uncompressed streams_data text | 3,500,238,351 bytes |

Largest tables by PostgreSQL total relation size (including associated storage/indexes): activities 1,249 MB; performance_logs 259 MB, about 295,485 rows; strava_webhook_logs 38 MB, about 107,175 rows. Row estimates are PostgreSQL statistics, not exact counts except where noted.

Important: physical PostgreSQL size is NOT projected D1 size. PostgreSQL compression explains how stream text alone is approximately 3.5 GB despite the whole physical database being around 1.6 GB. A converted import must be measured, including indexes and growth. The combined-payload measurement excludes other columns, so 33 is a lower bound on oversized full rows.

## Migration blockers and required changes

### P0: Oversized activity data

`shared/schema.ts:167-170` stores polylines, streams and laps inline. At least 33 activities cannot fit unchanged into D1's 2 MB row limit. The largest stream alone exceeds it by more than twelve times.

Move large immutable activity payloads into PRIVATE R2, not the existing public marketing-assets path. Keep owner ID, activity ID, object key, content hash, format version and size in D1. Authorize every download from the signed-in runner. Do not expose permanent public URLs for GPS/health data. Implement upload-first/checksum verification followed by metadata publication, retries and orphan cleanup because D1 and R2 do not share a transaction. Preserve deletion/export behavior.

### P0: PostgreSQL-specific runtime and ORM

`server/db.ts` uses `pg.Pool` and `drizzle-orm/node-postgres`. `shared/schema.ts` uses `pg-core`: 45 declared tables, 11 array fields, 24 JSON/JSONB fields and 122 timestamp fields (source declaration counts, not live column counts).

Rebuild the schema with SQLite-compatible types and a D1 adapter. Preserve IDs; map booleans consistently; choose one timestamp encoding and timezone policy; encode arrays as validated JSON or normalize frequently queried collections; preserve null versus empty semantics. Recheck generated Zod schemas and API serialization. Existing text-enum hints must not be assumed to enforce database constraints.

The production app executes in a Node container, not directly in a Worker. D1 is not a PostgreSQL socket. A D1 binding on the edge does not make `pg.Pool` compatible. Put the D1 repository behind a bounded, authenticated Worker API or migrate the applicable backend handlers into Workers. Do not expose a generic SQL gateway to browsers or the model. Avoid the account-level administrative REST API as the normal application query path.

### P0: Billing has its own PostgreSQL dependency

`server/stripeClient.ts:113` constructs `StripeSync` with a PostgreSQL pool. `server/index.ts:143` initializes Stripe schema migrations. `server/routes.ts:232`, `:1176` and `:1446` read `stripe.prices` / `stripe.products`; webhook handling also uses the sync package. Package: `stripe-replit-sync`.

The hosting migration did not remove this library dependency. Do not equate its presence with a currently running Replit host.

To remove Neon completely, replace this persistence integration with Stripe SDK + signed, idempotent webhook processing and a minimal D1 billing projection. Preserve customer/subscription/price IDs and entitlement rules. Inventory all 29 Stripe tables and classify authoritative application needs versus reproducible mirrors; do not blindly import internal schemas or discard billing history. The `_system` table also needs classification before retirement. Rehearse webhook replay, duplicate/out-of-order events, cancellation and trial changes. Never create replacement live subscriptions during migration.

### P0: Job ownership and transactions

`server/services/schedulerLeadership.ts:17` depends on a session-scoped PostgreSQL advisory lock. `server/services/queue/durableJobStore.ts:27-80` uses BEGIN/COMMIT/ROLLBACK, leased claims, `FOR UPDATE SKIP LOCKED` and conditional completion. `server/storage.ts:1631` uses row locking for email jobs.

These mechanisms cannot be copied verbatim to D1. Replace scheduler ownership with a deliberately designed coordinator (for example a Durable Object), and job dispatch with an idempotent queue/outbox design. Cloudflare Queues is a candidate, not an automatic exactly-once guarantee. Preserve per-runner ownership, backoff, lease loss, dead-letter handling, dedupe and sync-progress consistency. Never run the old and new sending schedulers simultaneously.

`server/services/coachChannelBindings.ts:153,206,341` and `server/storage.ts:681,1383,1400` contain additional transactions. D1 batch operations are not a drop-in replacement for interactive read/check/write transaction callbacks. Rework conditional updates and uniqueness guarantees explicitly, especially Telegram identity binding, one-time token use, activity deletion and conversation ownership. Replace PostgreSQL error-code handling such as `23505` with adapter-level errors.

### P1: Query and batch compatibility

Rewrite PostgreSQL casts, interval arithmetic, `date_trunc`, `ANY(ARRAY...)`, `ILIKE`, JSON access and schema-qualified billing SQL. Examples: `server/storage.ts:2456`, `:2577`, `:3245`; `server/services/weeklySummaryWorker.ts:139`; `server/services/premiumPreview.ts:415`; `server/routes.ts:7181`.

Do not indiscriminately rewrite standard SQL: SQLite supports many constructs, including window functions, and compatibility must be tested query by query.

`server/storage.ts:983-988` and `:1038-1043` bulk-insert plan weeks/days without a D1 parameter budget. D1 allows 100 bound parameters per statement. Chunk by populated column count, not merely number of rows. Apply the same rule to IN lists, imports and backfills, while preserving logical atomicity.

### P1: Live schema is larger than shared/schema.ts

Public tables number 47, while the shared ORM declares 45. The additional public tables are `cloudflare_jobs` and `coach_message_feedback`, defined elsewhere. `server/mcp/oauthService.ts:88` and `server/services/proactiveCoach.ts:26` also contain runtime schema initialization. Consolidate versioned migrations; do not rely on the ORM file as the complete export manifest or run PostgreSQL DDL at D1 startup.

### P1: Isolation and referential integrity

Live public tables have no RLS policies enabled and only seven foreign keys. This is not proof of a current data leak; it means the migration cannot rely on an existing database-level tenant boundary. Preserve application ownership checks and test two-runner IDOR cases across HTTP, MCP, coach tools, object retrieval and scheduled deliveries. Identify orphan records before adding new SQLite foreign keys; do not silently drop them.

### P1: Analytics and retention

Activities dominate storage, while performance/webhook logs are the next largest tables. Avoid unbounded retention in the primary runner database. Propose a retention/archive policy for approval; do not delete historical logs as part of an audit. Retain operational aggregates and offload older raw logs as appropriate.

D1 serializes queries within each database. Broad dashboard/admin scans can contend with writes. Keep the existing user/date activity index, add evidence-based indexes, bound date ranges and measure realistic concurrent sync + dashboard + coach traffic. Do not claim a cost saving before measuring scanned/written rows and R2 operations.

## Recommended target

- One authenticated backend for both frontends.
- D1 for relational runner/account/plan/entitlement/conversation metadata, if import and load tests pass.
- Private R2 for large streams, route payloads and generated private media.
- Durable Objects and/or Queues for coordination and durable asynchronous processing, with explicit dedupe and tenant checks.
- Existing providers retained for Stripe, Strava and email, with only one production webhook/scheduler owner.

Start with one application D1 database only if measured size and load leave sufficient headroom. Do not start with per-user sharding just to work around oversized streams. Multi-database partitioning makes cross-runner administration, uniqueness and transactions more complex.

## Implementation order and release gates

1. Freeze a full schema/dependency manifest, including Stripe and internal tables. Record baseline IDs, constraints, counts and representative analytics outputs.
2. Extract large payloads to private R2 with checksums; test owner-scoped access and deletion.
3. Introduce the data-access boundary and SQLite schema, convert SQL and parameter batching. Keep Neon production authoritative.
4. Replace PostgreSQL-dependent billing and job coordination. Validate retries and race conditions in isolated staging.
5. Import a protected staging copy. Suppress real emails, Strava writes and live billing side effects. Reconcile exact counts, IDs, relationships, checksums, JSON/nulls, timestamp semantics and entitlements.
6. Test real D1 behavior: login and magic links, OAuth expiry/revocation/rotation, two-user isolation, plans, analytics, webhook duplicates, queue recovery and messages. Load-test and measure total imported storage, largest rows and growth. Existing tests have not been run against D1 during this audit.
7. Rehearse cutover: stop writes/ingestion, capture a consistent snapshot and final delta, validate, switch backend, then resume one set of processors. Reconcile events arriving during the pause.
8. Keep Neon recoverable. Once D1 accepts writes, rollback is NOT merely changing a URL: reconcile those writes back or use a planned recovery procedure. Retire Neon only after an agreed observation window and recovery drill.

## Current decision

Approve a staged D1 + R2 migration project, not an immediate production move. The relational footprint and public column counts do not by themselves rule out D1. Oversized payloads, billing coupling and concurrency semantics do rule out an unchanged copy. Migration effort is substantial and cross-cutting; a defensible schedule requires the adapter/import spike, not an arbitrary promise of days.

Unmeasured: actual D1 import size, growth rate, production query percentiles, all indexes/views/functions in non-public schemas, full data integrity, projected D1 cost and end-to-end behavior. No PostgreSQL extension dependency beyond plpgsql was found, but this does not prove no stored functions or non-public triggers exist.

## Current platform references

- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): 10 GB paid database maximum, 2 MB row/string/BLOB maximum, 100 columns/table, 100 bound parameters/query, 30-second query limit. These are not interchangeable with PostgreSQL physical-size measurements.
- [D1 concurrency FAQ](https://developers.cloudflare.com/d1/reference/faq/): single-threaded execution per database; throughput depends on query duration.
- [D1 from an external application](https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/): use a Worker API; administrative REST access is not the preferred normal application path.
- [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/): review actual supported batch/session semantics when implementing the adapter.

Cloudflare skill used to route the platform review; current official documentation took precedence over outdated numeric examples in the bundled reference.
