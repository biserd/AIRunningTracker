# Native app landing page

Deployed and verified on production September 26, 2026.

## Production release

- Application commit: `11673136e5d0b2035a4222201cb0bf045b1ddece`.
- Cloudflare build: `2d9cd0df-baf7-4b69-8b05-2acb570523a5`; staging Worker version `83533787-ff7a-48f5-b9fc-d712f9c9db31`.
- Final main Worker: `908d478f-483d-4991-9096-611d359e56e6`.
- Verified image: `aitracker-api-staging-runanalyticsweb@sha256:005142db75b219eec0ba0a1b97dbcc957d57611c4d3b18f101a9ae220779bddd` (build tag `83533787`).
- Both public URLs return 200 with canonical metadata, Coming Soon, pricing and app privacy. CSS, social card and all six screenshots match local SHA-256 hashes. Sitemap contains both URLs; homepage, pricing, health and shoe API return 200; unauthenticated account API remains 401. Live browser render verified.
- Rollout note: the first promotion read the old staging configuration during its active rollout and briefly used the prior metadata-only image `5783827f`. Live assertions caught the stale page. Promoted the completed build digest `005142db` and waited until production reported version 29 with no active rollout and the correct image before successful verification. Restart markers were advanced using the existing release mechanism; no database records were changed.
- Rollback baseline: main Worker `b861103f-bdad-4570-8288-5c5cb9c79e1a`, image tag `664dfc57`. Restore both Worker and image when rolling back.
- No migrations, secrets, billing configuration, native build, coach Worker deployment or R2 uploads. Pending training-plan entitlement and native/coach changes were excluded from this release, including non-landing hunks in `server/routes.ts`.

## Public routes

- `/ios-app`: dedicated iPhone/iPad app page. Coming Soon only, as requested. No invented App Store link, TestFlight link or beta signup.
- `/ios-app/privacy`: app-specific privacy notice supplementing `/privacy`.

The page covers voice/chat coaching with running context, upcoming training plans and confirmation, run details, insights, mileage, activity calendar, Runner Score, native iPad layout, email-link signup, Strava connection and optional notifications. Paid access and rollout limitations are disclosed rather than implied to be universally live.

## Implementation

- Shared React view and data for server/browser parity: `shared/iosAppView.tsx`, `shared/iosAppContent.ts`.
- Both pages render full HTML for all visitors, not user-agent-specific content. No JavaScript, sign-in, cookie or account request is necessary for a direct visit. Native HTML FAQ controls work without scripting.
- Client-side routes also work for navigation from the existing SPA. Links added to main navigation, footer, messaging-coach page and governing privacy policy. Main header switches to its existing mobile menu below the width needed by the extra link.
- Canonical URLs, unique metadata, social card, SoftwareApplication/FAQ JSON-LD and sitemap entries. No fictional ratings, availability or purchase offers in structured data.
- Six optimized WebP images, 207,700 bytes in total, under `client/public/ios-app`; they ship with the normal frontend build. No R2 upload or infrastructure change is needed.
- Real native simulator captures with synthetic running data from the prior screenshot kit. Screen content was not redrawn or fabricated by image generation. Provenance in `client/public/ios-app/screenshots.json`.

## Privacy scope

The app notice describes the observed OpenAI, Cloudflare, Strava and Apple flows, microphone and notification controls, subscription verification, account deletion and cancellation distinction. It links to the governing policy. Corrected two contradictory legacy AI statements in that policy (training-model claim and “never share” despite provider processing).

This is an implementation-backed privacy notice, not legal approval or an App Store privacy-label certification. Before launch the owner should review controller/contact details, exact provider retention, legal grounds and regional rights, legacy deletion-time promises, and actual third-party AI consent UI. A policy link does not itself implement an in-app consent flow. Reference checked: https://developer.apple.com/app-store/review/guidelines/#privacy.

## Verification

- Frontend production build and backend bundle passed.
- 18 tests passed across app-page rendering, screenshot budgets, metadata, crawler policy and existing SEO regression suite.
- Browser checked at desktop 1280, tablet 1024, phone 390 and narrow phone 320 widths. Fixed narrow-grid minimum-width clipping. FAQ expansion and privacy navigation verified.
- Local preview: `node node_modules/tsx/dist/cli.mjs scripts/preview-ios-landing.ts` then `http://127.0.0.1:4175/ios-app`.

## Styling and pricing follow-up

- Matched the main site's orange, charcoal, slate, white and light-gray palette on both app pages and the social card. Smaller card radii, consistent RunAnalytics branding and a charcoal footer replace the previous ivory/olive theme. Small orange text and controls use a darker shade for readability.
- Added static US pricing directly to the page: $7.99 monthly or $79.99 annually, eligible seven-day trial, $0 during the trial and cancel-anytime messaging. Annual savings are $15.89 versus twelve monthly payments.
- Added a pricing navigation anchor and hero summary, feature inclusion list, automatic-renewal/eligibility/payment disclosures and cancellation FAQ. Kept Coming Soon without an active purchase/download CTA.
- Used “No upfront charge” rather than an unconditional “risk-free” or refund guarantee. Apple trial cancellation timing checked against https://support.apple.com/en-us/118428 (at least 24 hours before trial expiry).
- Follow-up verification: 19 rendering/SEO/crawler tests, focused TypeScript check and frontend production build passed. Desktop, 390px and 320px browser checks confirmed pricing cards, disclosures, navigation and privacy styling without horizontal overflow. This update does not change billing configuration or subscription prices in either provider.

## Deployment status

The main application and normal frontend assets are live. No database migration or new secret was needed. The earlier backend plan-entitlement changes remain a separate pending release concern; this release does not deploy them. The app still uses `/privacy`, which now links prominently to its app-specific notice; no new native build is needed merely to expose that link.
