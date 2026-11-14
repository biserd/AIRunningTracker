# November 14 running-shoe catalogue refresh

The [reviewed manifest](../data/shoes/2026-11-14-releases.json) covers confirmed US releases and recent catalogue gaps, not every 2026 launch. Nine new models and fourteen new matchups, plus an in-place stock and specs refresh for Nike Alphafly 4 (ID 792).

- Running Warehouse men's US 9 measurements where available. The NNormal Cadí GTX uses the [US manufacturer listing](https://www.nnormal.com/en_US/men/shoes/cadi/nnormal-cadi_gtx_men_blue_black-NX4CD1M-001) and [fall release announcement](https://news.nnormal.com/nnormal-presents-its-fw-2026-collection-led-by-the-cadi-gore-texr); compatible weight was not published. Specs are not independent wear tests. US prices were observed at verification, not guaranteed.
- The [PUMA Fast-RB Nitro Elite 2 launch](https://mediahub.puma.com/articles/puma-unveils-fast-rb-nitrotm-elite-2-marking-a-new-frontier-in-speed) distinguishes it from the Fast-R race line and explicitly says it is not race legal. PUMA's Deviate Pure Nitro launched in June and is a newly identified coverage gap, not a November launch.
- Excluded other colors and the Brooks Glycerin Max 3 while its US listings show preorder or future stock. No release claim was made for 880v16, Skyflow 2, or GEL-EXCITE 12 without orderable primary listings.
- The catalogue, comparison directory, sitemap, and public MCP all use the existing production D1 data. No schema change. New comparisons link to both models; model pages surface their complete matchup list. The public presentation accepts authored notes only for the expressly reviewed import, with no synthetic winner.

## Production verification

Source `8a9a9ce`; Worker `9f89efc9-5799-41d2-87cd-d499f398a3d8`, container 66. The guarded import ran once against the existing production D1. The live directory has 260 canonical models and 190 comparisons, including all 176 prior links. All 34 affected public pages returned 200 with one H1 and a canonical; all 14 new comparisons showed authored guidance and reciprocal model links in the first HTML. All new models and pairs appear in the sitemap. Public MCP lookup and comparison verified. Thirty-one catalog and SEO regression checks passed.

## Series history follow-up

The September source-aware rewrite (`d1cf74b`) removed the Recharts series graph and kept only the history table. The restored, server-rendered charts show weight, heel/forefoot stack, drop and recorded price on separate scales. Historical values are outlined and missing data is not plotted. The exact-value, source-status table stays available to assistive technology.

The renderer groups Hoka/HOKA case-insensitively and sorts mixed numbered/unnumbered series by release year; no model identities change. [Running Warehouse's men's US 9 Speed 5 measurements](https://www.runningwarehouse.com/reviews/saucony-shoe-reviews/saucony-endorphin-speed-5.html) replace the historical 8.3 oz and 32/24 mm figures with 8.4 oz and 37/29 mm. Drop remains 8 mm. The source listing records a $114.88 Black/White clearance snapshot, not a guaranteed price. The guarded update keeps ID 276 and all existing comparisons. No schema changes.

Production: source `d02b0b0`, Worker `13f4a164-7a24-4dad-b3c7-5b5a7abf4434`, container 67. Verified chart ordering on eight live model pages and reciprocal links on three live comparisons, including the corrected 2 mm heel and forefoot differences on Speed 6 vs Speed 5. Charts rendered without overflow at 390 px and 1440 px with JavaScript disabled. The catalogue regression verified that all 190 comparison links remain crawlable, including all 176 original links, and all 34 pages from the November 14 release remain in the sitemap.

## Full catalogue chart audit

The follow-up audit covered all 260 canonical shoe pages. It found charts on 117 pages, and confirmed that missing charts were not limited to the three initially reported series. Source `47e9dbe` joins the reviewed catalogue aliases for adidas Boston and Ultraboost, New Balance 1080 and Rebel, and PUMA Fast-R Nitro Elite. The 1080 history plots v14 once without changing the two existing URLs. Supernova Rise and Cloudsurfer keep their model labels and now plot the predecessor first. No catalogue records or comparison URLs were changed. The shared evidence banner was removed from both model and comparison pages; source notes and measurement caveats remain.

Live verification: Worker `968373eb-a3b6-4601-86d8-07d7e225186f`, container 68. All 260 canonical model pages and 190 comparison pages returned 200 with self-canonicals and retained sources, with zero occurrences of the removed banner. Charts rendered on 127 pages across 49 multi-model series; 133 models had no other catalogue entry in the same series. The 390 px and 1440 px chart checks passed with JavaScript off. All 24 SEO regression tests passed.

## Interactive model profiles

Source `7be3cf8` adds a server-rendered stack-height schematic, oz/g units, a same-series comparison with a generation selector where applicable, and interactive metric filters. The history table and unfiltered charts remain available without JavaScript. Differences are not calculated unless both records have a comparable Running Warehouse measurement basis.

The [Boston 13](https://www.runningwarehouse.com/Reviews/adidas-Shoe-Reviews/adidas-adizero-boston-13.html) and [Boston 12](https://www.runningwarehouse.com/Reviews/adidas-Shoe-Reviews/adidas-adizero-boston-12.html) review tables supply weight (men’s US 9), heel/forefoot stack, and listed drop: 9.0 oz / 37 mm / 30 mm / 7 mm and 9.1 oz / 37.5 mm / 30.5 mm / 6.5 mm, respectively. The shared public presentation applies these source-checked corrections to detail pages, history, the comparison APIs, and MCP results. A review is not a current price or stock check; legacy Boston price/availability values are not presented as verified. No database writes or URL changes are needed.

Production verification: Worker `f8383f99-d701-44c9-b9ef-bf4810a38fd2`, container 69. The new profile rendered on all 260 canonical shoe pages. All 127 history charts and in-page generation comparisons across 49 series remained present, and all 190 canonical comparison pages returned 200 with unchanged links and source notes. Both Boston models matched their corrected detail/chart and comparison API data. Browser checks confirmed units, filters, and generation selection at 390 and 1440 px, with unfiltered charts and specs remaining readable without JavaScript. All 25 SEO regression tests passed.

## Interactive head-to-head comparisons

Source `fc802d2` puts both models on a shared stack-height scale, makes the existing spec table filterable, and labels the direction and size of differences where Running Warehouse measurements are comparable. Missing and historical values remain labeled; differences are not inferred from them. The full table and the source notes remain in the server-rendered HTML. No database writes, comparison URL changes, or new dependencies.

Production verification: Worker `105e39f3-fd5c-4dbd-b93b-d24e8b549c51`, container 70. All 190 live comparison pages returned 200 with the new layout, eleven unfiltered spec rows, source notes, and their canonical URL; all 190 hub links remain crawlable. At 360, 390, and 1440 px, both stack diagrams used the same scale, the category and differences-only filters and oz/g switch worked, and Boston 13 vs Speed 5 showed equal heel stack and a 0.6 oz (17 g) difference. The unverified Clifton example did not claim a measured difference. The diagrams and complete spec table rendered without JavaScript. Model profile regressions and all 26 SEO tests passed.
