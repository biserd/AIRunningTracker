# Garmin and Strava public source pages

- `/integrations`: choose the right connection; clear source-specific roles.
- `/garmin`: direct new-run summary feed, setup consent/Activity Export, optional recovery dashboard, data controls, limitations and seven FAQs.
- `/strava`: history-based analytics/coaching, setup, sensor limitations, Premium/trial requirements and six FAQs.
- Homepage, public navigation/footer, feature page and FAQ introduce both sources. No source-wide search/replace that would imply Garmin parity or iOS availability.
- Garmin's activity feed remains separate from Strava totals, Runner Score, AI coaching and messaging. No historical backfill, routes/streams or watch workout upload is advertised. The concurrent health release adds optional sleep, HRV, resting heart rate, stress and Body Battery trends, gated by health permission and separate consent; these stay outside AI/coaching/messaging. Live Garmin account authorization and real delivery still require runner validation; no such test was performed for these pages.
- Source pages use the existing public React SSR path for both humans and crawlers, with canonical metadata, FAQ/Breadcrumb structured data, and explicit public Markdown. Added all three URLs to the dynamic sitemap. No artificial last-modified dates.
- Same public styling, orange/blue/white palette and responsive layout as the main site. No new dependencies, database schema, payment behavior, campaign switches or consent changes.
- Validation: initial 29 source/SEO/static-routing/Garmin tests passed; after preserving the concurrent health release, 37 source/SEO/Garmin/health tests and the D1 bundle passed. The Vite production build passed. Browser preview verified the Garmin and Strava layouts, connection navigation, no Strava console errors, and a narrow Garmin layout without horizontal overflow. Global TypeScript still reports existing diagnostics outside the new source components.

Read-only production check: `tsx scripts/verify-running-sources-live.ts https://aitracker.run`.

## Production release

- Runtime source `3fdcfe7`, preserving Garmin health release `76bff98`. Cloudflare build `b44d5644-380c-4df3-a372-703386c07c9e` and GitHub staging checks succeeded.
- Staging Worker `a48bbe0b-9faa-40d9-a34d-2b7de6da8ea6`; immutable image `sha256:7acbe293f7203769532625775cadc5f02f6f5974314700dec661e3318ce201a1` promoted to production container version 49. Final Worker `2b7d6c5d-6ffe-4763-b728-bf96d7adddc2`.
- At `2026-11-07T22:33:06Z`, all three live source pages passed ordinary/crawler SSR, canonical, FAQ, public Markdown, sitemap and homepage-link checks. WhatsApp, Garmin activity/health authentication/privacy and signup daytime-release checks also passed.
- Production D1 readback still showed delivery enabled and dry-run off, as manually selected by the owner before this page release. No campaign switches, individual health consent, subscriptions, or customer records were changed by this release.
