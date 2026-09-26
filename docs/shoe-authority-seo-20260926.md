# Shoe evidence, SEO and MCP release — 2026-09-26

## Released scope

- Application commit: d1cf74b.
- Cloudflare build: 6a2062f1-4f3d-4268-8180-23514bf8c4aa (successful).
- Promoted image: aitracker-api-staging-runanalyticsweb:c34bd208.
- Production Worker: 49e31d83-7ae5-4f69-a11b-f5569022cc01.
- One-time restart marker advanced after the platform retained the previous application process.
- No database migration, catalog overwrite, runner-data changes or new secrets.
- Unrelated local coach, weather and iOS changes were excluded, including the pending weather hunk in server/mcp/adapters.ts.

## Presentation and authority

All 237 shoe details and 171 saved comparisons use shared editorial and evidence functions.
The catalog and comparison indexes, public APIs and public MCP tools use the same evidence policy.
Running Warehouse is the primary specification source. Source-check dates use UTC dates, not browser-local date conversion.

The current catalog has **15 source-checked records and 222 historical records**.
Historical specifications remain research leads, clearly labeled for re-verification. This release does not claim to have researched all 237 models anew.
Stored generated narratives, ratings and lifespan estimates are preserved in the database but withheld from public responses.
There are no fabricated hands-on tests, performance winners, aggregate ratings, live inventory assertions or live-price Offers.
Prices are dated, potentially colorway-specific snapshots, not automatically MSRP.
Unknown specifications remain null / Not published.

Pages add intended-use considerations, specification interpretation, upgrade guidance, series history, related comparisons, alternative models, FAQs and source/methodology sections.
These are specification-based buying guides, not wear-test reviews. Historical pages still need fresh source research before stronger model-specific recommendations can be justified.

## SEO and MCP contract

- Visitors and crawlers receive the same data-filled React HTML.
- One H1, title, description and canonical per page; unique descriptions across the audited 408 detail/comparison URLs.
- Detail/comparison JSON-LD describes WebPage, Product and BreadcrumbList without unsupported review/offer fields.
- Explicit missing-page HTTP 404 and noindex; canonical alias redirects preserved.
- Shoe URLs remain in the sitemap; robots allow indexing. Actual search-engine indexing and rankings are not guaranteed.
- Public hydration includes only public shoe queries; embedded JSON is script-safe.
- MCP get_running_shoe includes the shared editorial guide; compare_running_shoes includes guides for the first model against each other model.
- MCP search/get/compare expose source URL, check date, units, evidence status, limitations and editorialVersion 2026-09-26.1.
- MCP consumers must retain these caveats when syncing, and must not turn null ratings into zero scores.
- Existing runner authorization/scopes unchanged.

## Verification

- 408/408 catalog detail/comparison documents rendered successfully against the local production catalog snapshot; 408 unique descriptions.
- Five focused shoe tests cover evidence honesty, MCP allowlisting, comparison query count, SSR metadata/data and script safety.
- Existing public-tool SSR tests (2), SEO regression and MCP contract/surface tests (24) passed.
- Vite production build and D1 application bundle built successfully.
- Root TypeScript check is not a clean baseline; existing unrelated errors remain. No new shoe module errors were reported.
- Browser preview and live comparison checked; no browser errors observed in the preview. A previously cached browser page required a reload.
- Live seven-page sample checked as ordinary visitor and Googlebot: identical rendered body, HTTP 200, canonical, title, H1, hydration and index/follow.
- Live missing shoe returned HTTP 404/noindex. Sitemap and robots inspected.
- Live MCP search/get/compare passed, including Alphafly 4 null weight and dated Running Warehouse source.
- Live /api/shoes returned 237 evidence-labeled records with synthetic ratings suppressed.
- Live /health returned 200; unauthenticated /api/auth/user remained 401.
- Warm sample page responses were approximately 150–500 ms; the first request after container restart was about 5.7 seconds.

Re-run the complete local catalog audit:

```powershell
node --import tsx scripts/verify-shoe-pages.mjs <public-catalog-snapshot.sql>
node --import tsx --test server/ssr/shoePages.test.ts
```

Operational note: the legacy staging runtime still uses its separate Neon configuration and is not a production-D1 integration environment. This release used local catalog/SSR tests, both build targets and direct production read-only checks.
