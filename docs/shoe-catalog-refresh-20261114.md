# November 14 running-shoe catalogue refresh

The [reviewed manifest](../data/shoes/2026-11-14-releases.json) covers confirmed US releases and recent catalogue gaps, not every 2026 launch. Nine new models and fourteen new matchups, plus an in-place stock and specs refresh for Nike Alphafly 4 (ID 792).

- Running Warehouse men's US 9 measurements where available. The NNormal Cadí GTX uses the [US manufacturer listing](https://www.nnormal.com/en_US/men/shoes/cadi/nnormal-cadi_gtx_men_blue_black-NX4CD1M-001) and [fall release announcement](https://news.nnormal.com/nnormal-presents-its-fw-2026-collection-led-by-the-cadi-gore-texr); compatible weight was not published. Specs are not independent wear tests. US prices were observed at verification, not guaranteed.
- The [PUMA Fast-RB Nitro Elite 2 launch](https://mediahub.puma.com/articles/puma-unveils-fast-rb-nitrotm-elite-2-marking-a-new-frontier-in-speed) distinguishes it from the Fast-R race line and explicitly says it is not race legal. PUMA's Deviate Pure Nitro launched in June and is a newly identified coverage gap, not a November launch.
- Excluded other colors and the Brooks Glycerin Max 3 while its US listings show preorder or future stock. No release claim was made for 880v16, Skyflow 2, or GEL-EXCITE 12 without orderable primary listings.
- The catalogue, comparison directory, sitemap, and public MCP all use the existing production D1 data. No schema change. New comparisons link to both models; model pages surface their complete matchup list. The public presentation accepts authored notes only for the expressly reviewed import, with no synthetic winner.

## Production verification

Source `8a9a9ce`; Worker `9f89efc9-5799-41d2-87cd-d499f398a3d8`, container 66. The guarded import ran once against the existing production D1. The live directory has 260 canonical models and 190 comparisons, including all 176 prior links. All 34 affected public pages returned 200 with one H1 and a canonical; all 14 new comparisons showed authored guidance and reciprocal model links in the first HTML. All new models and pairs appear in the sitemap. Public MCP lookup and comparison verified. Thirty-one catalog and SEO regression checks passed.
