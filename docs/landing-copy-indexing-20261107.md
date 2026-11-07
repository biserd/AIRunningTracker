# Landing copy and Search Console

- Removed em dashes from customer-facing homepage/source/app landing copy, including shared source cards, Garmin/Strava pages, the connection overview, native-app marketing and the crawler-facing app link. Product-page source regression prevents reintroduction. This does not replace unrelated shoe/spec missing-value markers or change blog content.
- All three new pages (`/garmin`, `/strava`, `/integrations`) were already included in the production dynamic sitemap. The read-only live check verified their entries again at `2026-11-07T22:40:45Z`.
- In the verified `sc-domain:aitracker.run` Search Console property, resubmitted `https://aitracker.run/sitemap.xml`. Google displayed “Sitemap submitted successfully” and the sitemap row reported Success on November 7, 2026. This confirms receipt, not indexing.
- URL Inspection for `/garmin` showed “Discovered - currently not indexed” and cited the sitemap. Its Request indexing action returned “Quota Exceeded”, asking to try tomorrow. No individual request was accepted. Did not attempt to evade the property/account daily quota by resubmitting through other accounts or URLs. `/strava` and `/integrations` remain discoverable through the accepted sitemap; individual indexing requests need retry after the quota resets. No scheduled retry was created.
- Checked Garmin's callback implementation and the existing notification service. Garmin has no admin-connection email call. Existing Strava signup and subscription notifications do not implicitly cover Garmin; no new email behavior or notification was authorized or added in this copy/indexing task.
- Twenty landing/app/SEO tests and the D1 application bundle passed. Existing subscription, campaign and health-consent settings are not changed.

Read-only live punctuation verification: `tsx scripts/verify-running-sources-live.ts https://aitracker.run --no-em-dashes`.

## Release verification

- Copy source `8d30004`, preserving the concurrent Garmin history release recorded in `7b75579`. Both Cloudflare/GitHub build checks succeeded. Staging Worker `d167e8cb-9641-47de-958f-6b8eb28e7b13`.
- Production container version 51, immutable image `sha256:df825749edd5150276fc4958514daf5f3bfa3a2583842ef3fff696fcd4568ad9`; final Worker `d0603a34-6ec5-4a90-af03-7069e3bb4111`.
- At `2026-11-07T22:46:44Z`, production checks passed for source-page HTML/canonicals, public Markdown, sitemap entries and no em dashes on 15 public marketing pages. Garmin activity/health privacy/authentication and signup daytime checks also passed. No email was manually sent or campaign switch changed.
