# Garmin public landing and guides

Published November 7, 2026 (America/New_York).

- `/garmin`: stronger Garmin running dashboard and recovery positioning, with unique title/description and contextual links to setup and recovery.
- `/garmin/recovery`: public explanation of supported sleep, overnight HRV and recovery readings, 7/28-day windows, personal-baseline rules, separate health consent, retention and export/deletion controls. It contains no private health data.
- `/garmin/setup`: account paths, official authorization, activity permissions, new-run sync, optional health sharing and missing-data troubleshooting. Updated against the concurrently deployed Garmin signup/sign-in and combined running feed releases before publishing.
- Homepage source cards, integrations hub and shared footer link to the new pages. Public routes are registered in both the SPA and lightweight SSR renderer, have self-canonicals, visible FAQ/Breadcrumb structured data and public Markdown equivalents, and are included in the sitemap. Private `/recovery` stays outside the sitemap and Markdown allowlist.
- The existing safe sign-in return-path allowlist now accepts `/recovery`, so the new recovery CTA returns there after email sign-in. External and lookalike paths remain rejected.

No Garmin permissions, AI/Runner Score inputs, database records, migrations, subscription settings or campaign switches were changed by this release. Garmin health stays outside AI coaching and messaging; automatic history import and watch-workout/course uploads are not advertised.

## Verification

- Targeted public-page/source/sign-in/combined-feed selection: 21 tests passed.
- Additional existing SEO, static routing and Garmin security selection: 27 tests passed.
- Existing upgrade-intent tests passed, with additional recovery return-path checks in the new page tests.
- Frontend production build and D1 application bundle passed. Headless layout checks covered all three pages at 390px and 1440px, without horizontal overflow or browser exceptions.
- Staging served the expected new HTML, metadata, internal links and Markdown. Its database-backed sitemap returned 500 in the isolated staging environment; sitemap verification was completed successfully on production.
- Live production checks at 2026-11-08T00:41:30Z confirmed 200 responses, the new titles, one H1 and canonical per page, homepage/integrations discovery, sitemap inclusion, public Markdown and authenticated private endpoints.
- Existing live Garmin auth/consent/sign-in/webhook and published UI asset checks passed at 2026-11-08T00:41:37Z. No real user OAuth grant, run delivery, purchase or campaign email was used as a test.

## Release identity

- Application source: `214dd8897a1698f4c42afc51ef981c4d1875c483`, including remote releases through `70f23c7`.
- Staging Worker: `a18c1486-76d7-4cbf-bd70-004d43b6ffcf`.
- Verified image: `sha256:fb68a18e37c00ba043ef2b313a6310abf628a84754f76ea2d7b86e071f7aa0e0`.
- Production Worker: `73e9315a-2016-4339-9daa-45501ccb8742`.
- Production container reached version 55 on the verified image. Promotion used `--keep-vars`; stable runtime identity and existing restart guard were preserved.

Sitemap inclusion and indexable HTML do not establish Google indexing or improved rankings. No Search Console indexing submission was performed in this task.
