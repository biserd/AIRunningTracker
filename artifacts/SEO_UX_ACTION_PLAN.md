# Public SEO, UX and Data Trust Action Plan

Updated: 2026-08-07

## P0 — correctness and index control

- [x] Normalize Strava cadence once at the analysis boundary and reject invalid samples.
- [x] Use one aerobic-decoupling formula and sign convention for manual input and Strava streams.
- [x] Convert 28–42 day training-zone totals to weekly averages before generating advice.
- [x] Prevent automatic increases in hard minutes for threshold-heavy runners.
- [x] Enforce one self-canonical, description and title for public SSR routes with regression coverage.
- [x] Collapse equivalent shoe model aliases to one sitemap URL and redirect aliases to the best sourced record.

## P1 — trust, discoverability and conversion

- [x] Remove duplicate H1s caused by the header logo and add missing topic H1s.
- [x] Deduplicate hydrated metadata and cap search titles/descriptions at sensible lengths.
- [x] Remove fabricated aggregate ratings, inflated user counters and unsupported percentile claims.
- [x] Replace injury-prevention and calibrated-confidence language with accurate limitations.
- [x] Add visible editorial ownership, source links and methodology caveats to every blog article.
- [x] Keep the public information architecture for signed-in visitors with a compact Back to dashboard action.
- [x] Preserve result intent when a runner continues from a public tool to AI Coach, a plan, sign-in or trial.
- [x] Keep the AI Agent Coach landing page readable instead of redirecting Premium users away.

## P2 — usefulness and depth

- [x] Add topic filters and search to the blog hub.
- [x] Add a methodology and limitations section to the FAQ and an analysis explainer to About.
- [x] Show source type, verification date and source URL on shoe records.
- [x] Keep developer documentation in the public navigation and give it canonical metadata.
- [x] Label manual, account-required and Strava-powered tools accurately.

## Release checks

- `npm run test:public-tools` — formula, safety, cadence and shoe-canonical tests.
- `npm run test:seo` — one title, description, canonical and H1 across static, tool and blog SSR pages.
- `npm run check` — currently reports pre-existing repository type errors outside this change; changed files introduce no matching errors.
- Full database-dependent tests require `DATABASE_URL` in the execution environment.

## Post-release measurement

1. Validate all sitemap templates in Search Console and resubmit the sitemap.
2. Track indexed URLs, crawled-not-indexed URLs, top-10 keywords and CTR weekly for eight weeks.
3. Track public-tool result → pricing → trial-start conversion by `source` and `capability`.
4. Review the April–July Semrush visibility decline by route template before adding more programmatic pages.
5. Replace editorial-team bylines with verified named authors/reviewers only when those people approve attribution.
