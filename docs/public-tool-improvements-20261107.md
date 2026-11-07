# Public tool improvements — November 7, 2026

## Delivered scope

- A1: Strava and manual predictor copy aligned with the saved-run workflow. Public manual form and Strava instructions render before JavaScript. The picker uses up to 100 activity summaries from 90 days, filters running types and 3 km/10-minute minimums, and uses elapsed time where available. It does not infer race effort. Target/settings can be recalculated explicitly.
- A2/A3: comparison hub targets running-shoe comparison intent and embeds a searchable two-model chooser. The catalogue, remove action and legacy `?shoes=` links lead to the real chooser route. No fabricated weight/price winner. Unknown ratings are omitted from the custom table when all are missing.
- A4: fueling inputs, examples and education appear in the initial response. Invalid intervals cannot loop indefinitely. Pre-start fuel is separate from in-race hourly totals; optimization does not add caffeine. Copy/print are explicit result actions, and a default page load is not a completion.
- A5: scoped audit of METASPEED Tokyo/Vaporfly 4, Endorphin Pro 4/5, Adios Pro 3/4 and Clifton 10/11. Prominent source dates, historical flags, missing fields, buying considerations and SKU ambiguity. This is a selected sample, not a claim that all comparisons were freshly checked. The October GSC exports are no longer present locally, so no fresh highest-impression ranking is claimed.
- A6: finder describes its actual three inputs and category-based ranking. Removes unsupported popularity/filter/fit claims, validates weight, explains support preference, freezes submitted inputs until a new search, handles failures and links the first two options to a comparison.
- A8: completed results can save the latest text snapshot in this browser and continue to free signup/Strava. The saved copy is visible after navigating or returning. Premium is described as optional; saved copies do not sync across devices. No result payload, weight, race time or email is sent to analytics.
- A9: `/blog/how-to-compare-running-shoes` fills the practical buying-decision gap, with exact-model identity, comparable measurements, fit, budget, worked decisions and a checklist. Linked from the comparison hub, finder and comparison results, and discovered by the existing blog/sitemap framework.

## Audit evidence

Primary source reads on 2026-11-07:

- [RW Vaporfly 4 review](https://www.runningwarehouse.com/reviews/nike-shoe-reviews/nike-vaporfly-4.html): men's US 9 5.9 oz, 36/30 mm, 6 mm drop. Production legacy row had 6.7 oz and 32/26 mm. Apply the narrowly guarded update in `data/shoes/2026-11-07-comparison-audit.sql`.
- [RW Endorphin Pro 4 review](https://www.runningwarehouse.com/reviews/saucony-shoe-reviews/saucony-endorphin-pro-4.html): confirms existing 7.7 oz men's US 9, 40/32 mm, 8 mm. Add the missing citation/date; retain historical price with an explicit caveat.
- [RW Clifton 10 review](https://www.runningwarehouse.com/reviews/HOKA-shoe-reviews/hoka-clifton-10.html): accessible, but its specification table said “Coming Soon.” Two indexed product-colourway URLs returned 404; HOKA's product page returned 403 to the scraper. Do not mark indexed excerpts as a fresh full-source check. Keep its values historical and prominently flag the unverified 32/24 mm baseline.
- METASPEED Tokyo is a historical generic family label. RW search distinguishes Sky Tokyo and Edge Tokyo. No values or identity are silently reassigned between them.
- Existing Pro 5 and Adios Pro 4 evidence retains its original check date. No new current-price, stock, fit or race-time claims are made.
- The buying guide uses accessible RW [shoe selection](https://www.runningwarehouse.com/learningcenter/gear_guides/footwear/how_to_pick_running_shoes.html), [fit](https://www.runningwarehouse.com/learningcenter/gear_guides/footwear/fittips.html) and [stack-height](https://www.runningwarehouse.com/learningcenter/gear_guides/footwear/stack-height.html) guidance.

## Measurement definitions

This is a measured first rollout (`contextual_v1`), not a randomized A/B test or evidence of an uplift yet. Compare a suitable post-release period with a comparable prior period and account for traffic mix.

| Event | Meaning |
| --- | --- |
| `tool_viewed` | Existing tool view or education surface; preserve source when reporting |
| `tool_completed` | A result was reached; fueling requires copy/print rather than its automatic example |
| `tool_action` | Chooser comparison, schedule optimization, copy or print; `action` is in properties |
| `offer_viewed` / `offer_clicked` | Result-level training-history offer, tagged `contextual_v1` |
| `tool_result_saved` | Browser confirmed it could save a text snapshot |
| `tool_signup_created` | Server-authoritative new account creation with an allowlisted tool source; covers email registration and new Strava OAuth accounts |
| `tool_account_continued` | An authenticated browser returned after an offer; includes existing accounts |
| `tool_history_connected` | That authenticated browser reports Strava connected; not proof of completed data sync |
| `tool_returned` | Fresh tab/session visit to a tool after at least 30 minutes since its previous visit on the same browser |

Client tool and contextual-offer events go to the existing D1 funnel recorder and GA when `gtag` is available. New-account events are recorded by the server in D1. GA may be blocked; D1 and browser markers do not establish cross-device unique people. Deduplication is per event/session/surface, not every recalculation.

Example D1 readout (change the date for the actual production release):

```sql
SELECT event, source, COUNT(*) AS recorded_events,
       COUNT(DISTINCT user_id) AS authenticated_users
FROM funnel_events
WHERE created_at >= '2026-11-07'
  AND (event LIKE 'tool_%' OR experiment_variant='contextual_v1')
GROUP BY event,source ORDER BY source,event;

SELECT source, COUNT(DISTINCT user_id) AS newly_created_accounts
FROM funnel_events
WHERE event='tool_signup_created' AND created_at >= '2026-11-07'
GROUP BY source;
```

Report offer click-through from matched `offer_clicked / offer_viewed` surfaces; report new account conversion separately from signed-in continuation. Review saved-result use and returning tool visits after enough time has passed. A clicked signup offer alone is not a signup or paid conversion.

## Verification

- Focused math tests cover invalid inputs, pre-start exclusion, worked-example totals and caffeine behavior.
- Candidate tests cover other sports, distance/duration thresholds, elapsed-time preference and explicit race tags.
- SSR tests verify visible input forms, truthful Strava instructions and the chooser canonical.
- `scripts/verify-tool-journeys.ts` runs a headless browser against local API fixtures with real SSR/Vite UI. It exercises anonymous manual prediction, signed-in run selection, hub-to-comparison navigation, removal, zero-interval recovery, copy/save, finder-to-comparison and return events. It makes no real account, Strava, purchase or production-analytics requests.
- Browser report/screenshots: `output/tool-journeys-20261107/`. Real Strava OAuth/sync is not recreated by that fixture; server authorization and summary query remain in their existing authenticated route.
- Repository-wide TypeScript has existing unrelated diagnostics; inspect affected-file diagnostics and the production build separately.
