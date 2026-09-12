# AITracker Cloudflare coach preview

An independent, interactive UX preview on `new.aitracker.run`. Everything runs on Cloudflare Workers, Static Assets and SQLite D1. There is no runtime dependency on Replit, the original Express backend, PostgreSQL, Sites hosting, or an external AI provider.

Branch: `codex/cloudflare-coach`, based on `origin/main` at `c6f490f`. All code is additive under this directory. Do not merge this as a replacement for the current app or connect its deployment to the main branch.

## What works

- Responsive Coach, My week, Progress and preview-settings views.
- A separate fictional runner workspace per browser, using a cryptographically random HttpOnly session cookie. Only its SHA-256 digest is stored in D1.
- Shorten, rest, and move to an upcoming rest day. Explicit proposal review and confirmation.
- Durable plan changes, compare-and-swap version checks, immediate duplicate confirmation handling and latest-change undo with confirmation.
- Source activity list and calculated sample consistency totals.
- Same-origin POST protection, request-size bounds, rate limiting, no-store private responses, CSP, noindex, and seven-day expiry with daily cleanup.

## Explicit limitations

This is a UX prototype, not a migrated production SaaS. All running data is fictional and identified as such. The guided input routes a few intents deterministically; it does not pretend to be an AI response. Voice, model APIs, Strava, billing, messaging, production accounts and real-data import are not connected. There are no API keys to configure for this version. Private preview sessions are browser-bound, not verified runner accounts. Do not enter sensitive information.

The preview date is captured in UTC at creation and stays fixed with the sample week. Moving is limited to eligible rest days in that week. A future production implementation must use the runner's timezone, real ingestion and actual persisted plan status. Plan data and account data must never be migrated automatically from this demo.

## Local development (Node 22.12+)

```sh
cd apps/coach-cloudflare
npm ci
npm run types
npm run build
npm run db:local
npm run preview
```

The built app and local D1 are served on localhost:8787. For hot-reloading, run `npm run dev` in another terminal; it proxies API calls to 8787. Vite's PostCSS config is intentionally isolated from the original app.

## Tests

With the local preview running:

```sh
npm run check
npm test
npx tsx tests/browser.ts
npx wrangler deploy --dry-run
```

Browser tests use installed Chrome; set `CHROME_PATH` if needed. `TEST_BASE_URL` can target a deployed preview. Tests create only disposable fictional sessions. They cover tenant separation, CSRF, confirmation, replay, stale edits, undo, immutability, completed-session protection, calculated totals, desktop/mobile, reload persistence and cancel. Screenshots are in ignored `test-results/`.

## Cloudflare deployment

The Worker and D1 are named `aitracker-coach-preview`. `wrangler.jsonc` contains only non-secret binding identifiers. The custom domain applies ONLY to `new.aitracker.run`, never the apex site. Wrangler provisions its DNS and TLS.

```sh
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

For Cloudflare Git builds, select ONLY `codex/cloudflare-coach`, set root directory `apps/coach-cloudflare`, build `npm ci && npm run build`, deploy `npx wrangler deploy`, and Node 22.12 or newer. Do not attach this configuration to the current production main-branch build. D1 migrations must run before code that requires them.

Rollback with `npx wrangler rollback` for this Worker only. Existing AITracker deployment is unaffected. Do not delete D1 to roll back code.

## Next migration stage

Before real runner onboarding: verified authentication, explicit data-import mapping/consent, Strava OAuth and ingestion on Workers/Queues, D1 ownership enforcement, Stripe test-mode integration and authoritative entitlements, server-side AI usage budgets and provider validation, then opt-in notifications. Keep production traffic on the existing site until those flows pass live integration tests. This preview does not complete that migration.
