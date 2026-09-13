# AITracker D1 migration target

This is an ISOLATED migration database, not the production backend. Neither
`aitracker.run` nor `new.aitracker.run` is routed to it. There is no public Worker,
scheduler, outbound email, billing execution or R2 binding in this project.

Database: `aitracker-d1-migration`, ID `5ee1a1a5-44a5-42c9-aa74-d12fe63b08f2`.
Source: existing production Neon, opened in a repeatable-read, read-only transaction.

## Snapshot result (2026-09-13)

- All 47 application tables copied: 503,684 rows, including 570 users and 79,923 activities.
- Source activity count: 79,956. Exactly 33 approved activities excluded, unchanged in Neon.
- Stripe/internal tables preserved in the private archive; not a live billing projection.
- Independent table-count and exclusion-reference checks passed. Declared foreign keys passed.
- The initial integrity stop found 364 activities referencing seven missing account IDs,
  and 1,345 missing-user references across 14 tables in total.
- With explicit user approval, all 1,345 records were moved atomically to
  `migration_quarantine_<table>` tables. Stored column values are preserved without JSON
  reserialization. Nothing was changed in Neon, reassigned to another runner or put in R2.
- There are now 502,339 active rows, including 79,559 activities, plus 1,345 archived rows.
  Active-plus-archive counts reconcile with the 503,684-row import. The 570 users are unchanged.
- Independent count, exclusion, missing-user and declared-FK checks pass. Migration status
  is `verifying`, stage `snapshot_imported_runtime_not_ready`, not production-ready.
- Seventeen SQLite tests pass. Focused strict type checking of implementation files passes.
- Full target payload checksum parity, runtime port, end-to-end tests and cutover remain open.

The complete copy is retained for review. Do not clear/restart it using the activity-only
recovery helper. Quarantine archives are not part of any application repository or public API.
They preserve audit/deletion history as well as runner records. Restoring them requires
deliberate administrative review and valid ownership; never automatically reassign user IDs.
Production remains on Neon.

Read-only diagnosis: `tsx scripts/d1/diagnose-integrity.ts`.
Current count/reference review: `npm run d1:verify`.
The approved, inventory-guarded quarantine command is
`tsx scripts/d1/quarantine.ts --execute-approved-quarantine`. It can recover an interrupted
quarantine but refuses changed counts or columns. Each DELETE first archives the entire row
in the same transaction through a trigger; an archive conflict aborts the removal.

## User-approved exclusion policy

- Leave the 33 oversized activities unchanged in Neon; do not import them to D1.
- Require exactly 33 exclusions at preflight. Abort if the count changes.
- Store their original IDs and runner/Strava identities in a private exclusion table.
- Block reimport by original ID or runner/Strava identity using D1 triggers.
- Omit their dependent activity features, route mappings, similarity caches and coach recaps.
- Detach training-plan links while preserving completion status, actual metrics and notes.
- Detach agent-run links; invalidate affected runners' recovery, preview and similarity caches.
- No extra activity exclusions are automatic. Oversized retained rows stop the import.
- The largest retained estimated record measured during preflight is 1,973,114 bytes.
  D1 triggers allow at most 1,998,000 bytes, reserving space below the platform limit.
- Preserve source ID allocation high-water marks so future inserts do not reuse excluded IDs.

## Components

- `scripts/d1/schema.ts`: converts the existing 45 Drizzle tables to SQLite DDL,
  indexes, foreign keys, boolean checks, JSON checks and UTC timestamp codecs.
- `shared/schema.d1.ts`: generated typed SQLite model with date, boolean, JSON and
  array codecs. Regenerate with `d1:schema`; do not edit the generated file.
- Supplemental migration: feedback and job tables bring application coverage to 47.
- `scripts/d1/source.ts`: verified TLS, read-only source, schema-drift check and exclusion checks.
- `scripts/d1/import.ts`: bounded transport, fixed isolated target, no sensitive console output,
  table counts, source-content hashes, FK checks and billing/internal snapshots.
- `scripts/d1/verify.ts`: independent target-only count, exclusion and reference checks.
  It does not claim complete payload checksum parity or mark the app ready.
- `server/d1/activities.ts`: runner-scoped D1 activity repository with bounded cursor pagination.
- `server/d1/jobLeases.ts`: SQLite atomic claims, heartbeat, lease-loss and retry handling.
- `server/d1/jobStore.ts`: D1 batch-based completion receipts, child enqueue, progress,
  deduplicated enqueue, runner-scoped job history and queue stats. Migration 0006 is
  applied to the isolated target. Tests cover lease loss, replay, tenant mismatch and rollback.
  This store is not wired to the production job manager and no scheduler is enabled.
- `migration_stripe_snapshot`: lossless JSON baseline for Stripe and `_system` tables.
  This is NOT a replacement billing service or query-compatible Stripe schema.

The administrative import uses the D1 REST API. Application runtime access must
use a D1 binding, not reuse this account-level migration credential or API helper.
Source data is streamed in memory; the importer does not write credential/runner dumps to disk.

## Commands

Run from the repository root with Node 24 and the installed dependencies:

```text
npm run d1:schema
npm run test:d1
npm run d1:inspect
npm run d1:import
npm run d1:verify
```

Set `D1_SOURCE_DATABASE_URL` privately in the process environment, not in source
control. The importer uses `CLOUDFLARE_API_TOKEN` or the existing local Wrangler
login. It only writes to the fixed isolated database above. A nonempty target is
rejected rather than overwritten. A failed copy cannot be resumed against a new
source snapshot without deliberate reconciliation/restart.

Wrangler schema setup:

```text
wrangler d1 migrations apply DB --remote --config apps/d1-migration/wrangler.jsonc
```

Do not change the fixed database ID to the coach-preview or production database.
`restart-failed-activities.ts` is narrowly guarded recovery for an initial failed
activity-only import. It refuses imported accounts, other tables or later stages.
It discards only reproducible copies in this isolated D1 target, never source data.

## Validation status semantics

`migration_runs.status=importing`: incomplete copy, unusable by application traffic.
`failed`: partial copy, do not use.
`verifying` with stage `snapshot_imported_runtime_not_ready`: table-count and
FK checks passed, but full content verification, query parity and runtime tests
remain. Source hashes are audit baselines, not a claim of target checksum parity.
Only a later independent verification may mark a run `verified`.

Live Neon remains authoritative. This snapshot does not capture writes made after
the repeatable-read snapshot began. Cutover needs a final consistent refresh/delta,
not merely binding this database to the app.

## Still required before removing Neon

1. Finish and independently verify the full import, exclusions, relationships and derived analytics.
2. Port the production `server/db.ts` / `server/storage.ts` data-access layer and
   all raw PostgreSQL SQL to D1. The new activity repository is not yet wired to routes.
3. Replace `stripe-replit-sync` and `stripe.*` queries with a real D1 billing
   projection, signed webhook processing and reconciliation. Archived JSON alone is insufficient.
4. Wire and native-D1-test the new job store; port email outbox and scheduler
   leadership. Local SQLite transaction tests do not certify the running scheduler.
5. Port OAuth, consent, refresh rotation, Telegram binding and remaining transaction paths.
6. Run end-to-end auth, Strava, billing, unsubscribe, analytics and multi-runner isolation tests.
7. Load-test native D1 and measure storage/growth. SQLite unit tests do not replace D1 load testing.
8. Rehearse final delta import, single-scheduler handover, routing and rollback of post-cutover writes.

Do not delete Neon or change either site's database configuration until these gates pass.
No production cutover is performed by these scripts.
