# Running Warehouse catalog refresh — 2026-09-26

## Status

Prepared and locally tested; NOT deployed or imported into production. No production rows, routes, accounts or secrets changed. Production still has 224 catalog records (newest recorded release year 2025); unknown release years in the new batch are intentionally null, not guessed.

## Source policy and coverage

Running Warehouse (`runningwarehouse.com`, not the misspelled `runningwearhouse.com`) is the authoritative primary shoe-spec source, as requested. Manufacturer pages retained in the manifest are cross-checks only. The manifest records source URLs and the check date. Weight is ounces per single men's/unisex US 9 shoe including laces; stacks/drop are mm; prices are observed regular US retailer prices, not guaranteed stock, live offers or MSRP. Colorways are not additional models. Descriptions are original summaries; no retailer photos or review text copied.

12 additions: ASICS SUPERBLAST 3 and NOVABLAST 6; Brooks Glycerin 23 and Ghost 18; Nike Pegasus 42; New Balance 1080v15; Puma Deviate NITRO 4; Saucony Endorphin Azura, Endorphin Elite 3, Peregrine 16 and Guide 19; Hoka Mach 7. This is a reviewed first batch, not an exhaustive audit of all existing shoes or all 2026 launches.

Seven comparisons are all between newly verified entries. Category tags and broad cushioning/use classifications are editorial mappings. Comfort, durability and responsiveness scores remain null: retailer customer stars and Heeluxe energy-return measurements are not interchangeable with our old 1–5 rating fields. Historical shoes and comparison links are preserved, not silently re-rated or reverified. The existing Endorphin Pro 5 record still needs a separate full refresh (RW now lists $239.95, 7.6 oz and 39/31 mm); it is deliberately not included in these new pairings.

Examples where source consistency matters:

- [SUPERBLAST 3](https://www.runningwarehouse.com/ASICS_SUPERBLAST_3/descpage-AS3SB2.html): RW 8.1 oz and 46/38 mm, rather than ASICS' differently reported 8.4 oz.
- [Deviate NITRO 4](https://www.runningwarehouse.com/PUMA_Deviate_Nitro_4/descpage-PDN4M03.html): RW 8.5 oz and 35/27 mm, rather than mixing these with Puma's 250 g UK-8 and 38/30 mm figures.
- [Peregrine 16](https://www.runningwarehouse.com/Saucony_Peregrine_16/descpage-SP16M7.html): standard men's model, not a wide or GTX entry.

## Implementation

- `data/shoes/2026-09-26.json`: reviewed source manifest.
- `scripts/shoes/catalog.ts`: validates identity, source and required measurements; dry-run by default, generates SQL only. No database credentials or execution inside the generator. Conflicting slugs/specs fail closed; exact repeat imports are no-ops.
- `migrations/20260926_shoe_evidence.sql`: relaxes six catalog fields to nullable; copies all columns and IDs, preserves sequence/indexes/NO ACTION comparison references. No user data touched. Apply once in one transaction. Remote schema inspection found only `shoe_comparisons` references to this table and no cascading FKs/triggers.
- `data/shoes/2026-09-26.import.sql`: generated 12-shoe/seven-comparison artifact, no legacy overwrites.
- UI, pipeline and automatic comparisons distinguish unknown from zero; the old automatic visitor-triggered seeding call is removed.
- Recommendation/rotation ranking no longer compares mixed-source ratings or disadvantages an unrated model using a fake zero score. It uses profile/category suitability and published specs instead.
- Public API supports `q` brand/model keywords and `sort=verified`; existing default behavior retained. MCP returns provenance and prioritizes recent verification.
- Shared coach shoe lookup carries source/date, real spec field names and explicit units, preserves nulls, and filters named models even against an older API. Shared research instructions now prefer Running Warehouse for shoes. This overlaps the pending weather/research change; do not accidentally deploy unrelated unfinished work.

## Verification

- 7 catalog tests pass, including real local D1 runtime, existing IDs/comparisons/indexes/sequence, idempotence, conflict rollback, source checks and null semantics.
- 15 shared coach knowledge tests pass, including new model lookup/evidence/units and existing cross-channel/privacy checks.
- Combined catalog and public SSR/SEO regression run: 18 tests pass.
- Frontend production build, D1 backend bundle and coach Worker typecheck pass.
- Repository-wide TypeScript check is NOT clean; it reports other application/type issues. No shoe-specific TypeScript errors remain in the filtered check. No physical-device or deployed production E2E claimed.

## Release order

### Requested racer follow-up

`2026-09-26-racers.json` adds Alphafly 4 (upcoming October 29; weight/stacks unpublished), refreshes existing Alphafly 3 ID 670 and Adios Pro 4 ID 188 in place, and creates/refreshes four comparisons: Alphafly 3/4, Adios Pro 3/4, Alphafly 4/Adios Pro 4, Alphafly 3/Adios Pro 4. The existing Adios comparison ID/URL is preserved. Adios Pro 3 remains an explicitly unverified historical baseline; no precise upgrade claim is made from those older measurements.

The schema migration now also allows unknown weight and adds availability/expected-order-date fields. Existing availability defaults to unknown. Upcoming shoes stay visible/searchable/comparable but are excluded from shoe finder and rotation recommendations, even after the expected date passes, until a fresh source check. UI/coach payloads retain unknowns and explain availability. Refreshes clear stale score-based verdicts involving corrected shoes; approved pairings receive new evidence-led differences. Adios Pro 4's old 32/26 mm stack is corrected to 39/33 mm. Its checked $199.88 price is explicitly a colorway-specific clearance offer. No duplicate record is created.

Apply the racer import after the original batch. Expected total: 237 shoes (13 additions, two existing records refreshed), assuming the verified 224-row baseline. Schema changes must precede the new app's SELECTs because of added columns; deploy the null-safe app before importing nullable records. Keep the previous image as rollback while old rows are still non-null. After nullable imports, rollback must retain null-safe rendering. Never restore the entire application database for a shoe-only rollback.

1. Review/isolate this change from other pending workspace edits. Build and verify the main application using its existing staging container build, then manually promote the tested immutable image. Production is intentionally not Git-autodeployed. This host has no Docker executable; repository GitHub workflows currently provide safety checks and iOS builds, not a production container build.
2. Export `running_shoes` and `shoe_comparisons` and record a D1 Time Travel bookmark before changing live schema. Recheck inbound FKs/triggers and exact column/index layout against the migration. Stop if drift is found.
3. Deploy null-safe application code first (compatible with the old non-null schema), then execute `migrations/20260926_shoe_evidence.sql` once using Wrangler `d1 execute ... --remote --file ...` as one transaction. Do not split the rebuild across calls.
4. Generate import with `node --import tsx scripts/shoes/catalog.ts data/shoes/2026-09-26.json --out data/shoes/2026-09-26.import.sql`; run the reviewed SQL in one D1 transaction. The generator does not write remotely.
5. Verify expected total 236 if no other additions occurred, 12 `running_warehouse` rows with this check date, seven pair pages, original IDs/values unchanged, no duplicate brand/model identities and no new foreign-key violations. Rerun conflict guards before retrying an uncertain write.
6. Deploy shared coach changes after reviewing the overlapping weather/research implementation; no iOS binary is needed for the server-side catalog additions. Test a named-model request and source links through the web coach and WhatsApp.

Production DB: `aitracker-d1-migration` (`5ee1a1a5-44a5-42c9-aa74-d12fe63b08f2`), main config `apps/api-cloudflare/container/wrangler.production.jsonc`. Never use the coach-preview database for the public main-site catalog.
