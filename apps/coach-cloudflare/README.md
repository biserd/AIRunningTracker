# AITracker Cloudflare coach preview

An independent coach experience on `new.aitracker.run`. Hosting and application state run on Cloudflare Workers, Static Assets, SQLite D1 and Durable Objects. AI inference calls OpenAI directly from the Worker. There is no runtime dependency on Replit, the original Express backend, PostgreSQL or Sites hosting.

Branch: `codex/cloudflare-coach`, based on `origin/main` at `c6f490f`. All code is additive under this directory. Do not merge this as a replacement for the current app or connect its deployment to the main branch.

## What works

- Responsive Coach, My week, Progress and preview-settings views.
- A separate fictional runner workspace per browser, using a cryptographically random HttpOnly session cookie. Only its SHA-256 digest is stored in D1.
- Shorten, rest, and move to an upcoming rest day. Explicit proposal review and confirmation.
- Durable plan changes, compare-and-swap version checks, immediate duplicate confirmation handling and latest-change undo with confirmation.
- Source activity list and calculated sample consistency totals.
- Same-origin POST protection, request-size bounds, rate limiting, no-store private responses, CSP, noindex, and seven-day expiry with daily cleanup.

## Explicit limitations

This is an AI-enabled UX preview, not a migrated production SaaS. All running data is fictional and identified as such. Text, voice and image generation have provider integrations, but require an OpenAI project key with access to the configured models. Missing credentials produce an honest unavailable state, not canned AI answers. Strava, billing, messaging, production accounts and real-data import are not connected. Private preview sessions are browser-bound, not verified runner accounts. Do not enter sensitive information.

## Real AI setup and testing

Add **one encrypted secret**, `OPENAI_API_KEY`, to the `aitracker-coach-preview` Worker in Cloudflare Settings, or use `npx wrangler secret put OPENAI_API_KEY`. Never use a VITE-prefixed variable or commit a key. The OpenAI project must have billing and access to `gpt-6-astra`, `gpt-live-1`, and `gpt-image-2.5-flare`. A configured key is not proof of model access. Configure project spend alerts too.

Locally put the key in ignored `.dev.vars`; never copy the production key into test fixtures. Deterministic tests mock OpenAI and incur no model charges.

1. Open the preview and start a browser workspace. On Coach, ask “What does my sample running history show?” Verify the answer is labeled sample and refers to 16 runs / 104 km. Reload and check conversation history persists.
2. Ask to shorten an eligible upcoming run to 20 minutes. Verify nothing changes until **Review adjustment → Confirm change**. Try Cancel and undo. A stale proposal must return a conflict, not overwrite a newer week.
3. Choose **Talk to your coach**, grant microphone permission, and ask about the sample week. Hear the AI response and check captions. Test mute/unmute, interruptions, End call, navigating away, and the three-minute server cutoff. Voice plan suggestions appear on screen and never auto-confirm. Listen on an actual mobile device; a successful signaling response alone does not verify audible playback.
4. Choose **Create a running poster**. Wait for actual provider artwork. Verify the code-rendered sample labels and download it before leaving. R2 is not enabled on the account, so artwork is intentionally not retained on the server.
5. Try a second browser/private window. It must not see the first session’s conversation or changes. Test an unavailable/revoked key and exhausted budgets on a non-production test Worker. No fallback should pretend success.

Text uses the Responses API with one application-owned tool loop, not a hosted Agents API runtime. It has only `get_training_context` and `preview_plan_change`, at most three model requests, 1,800 output tokens per request, and 12 history messages. There is no apply, SQL, arbitrary URL, or user-ID tool. The existing confirmation endpoint remains the only writer of plan state. A session has at most one chat request in flight. Duplicate job IDs cannot invoke the provider twice. Unknown outcome requests do not automatically retry. Stopping the UI stops waiting; the backend may finish and save the reply, but cannot apply a plan.

Voice uses GPT-Live WebRTC with client delegation to the same scoped coach endpoint. API keys never enter the browser. One Durable Object lease per session persists the provider session ID and schedules closure after 180 seconds, independent of browser lifecycle. It uses the documented sideband `session.close` flow and retries failed closure every 30 seconds. A provider outage can delay finalization; this is not a guaranteed billing hard stop during provider failure. A setup timeout before the provider returns an ID has an uncertain outcome and is never automatically retried. Verify live model access and finalization before opening this anonymous preview broadly.

Daily UTC budgets reserve requests before provider calls: 20 chat turns, 2 images and 2 voice starts per session; 100 chat turns, 10 images and 10 voice starts across the entire preview. Session recreation does not reset the global cap. Failed/uncertain requests also consume a reservation. Public visitors can exhaust the shared preview budget; verified accounts and per-account entitlements are required before production launch.

Messages and job metadata expire with the seven-day session. No raw audio is saved by this app. The provider receives the supplied sample context and user messages/audio with `store:false`; this does not replace OpenAI’s applicable data-retention policy. Never log bearer tokens, messages, audio or image payloads. `/api/ai/status` reports credential presence, not an assertion that paid API access has been validated.

Official API references: [Responses](https://developers.openai.com/api/docs/guides/text), [GPT-Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live), [sideband controls](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live), [image generation](https://developers.openai.com/api/docs/guides/image-generation).

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
npx tsx tests/browser-ai.ts
npx wrangler deploy --dry-run
```

Browser tests use installed Chrome; set `CHROME_PATH` if needed. `TEST_BASE_URL` can target a deployed preview. Tests create only disposable fictional sessions. They cover tenant separation, CSRF, confirmation, replay, stale edits, undo, immutability, completed-session protection, calculated totals, desktop/mobile, reload persistence and cancel. AI tests cover mocked provider tool calls, validation, error redaction, body limits, request idempotency, budgets and ephemeral image responses. `browser-ai.ts` mocks model replies but exercises the real plan confirmation API. It does not prove live provider access or audible voice. Screenshots are in ignored `test-results/`.

Integration verification on September 12, 2026: TypeScript, build, 14 automated tests, the desktop/mobile regression and mocked-AI browser flow passed. Remote D1 migration `0002_ai.sql` applied to the preview database. Worker deployment was blocked by the missing required `OPENAI_API_KEY`. Real provider replies, generated images and voice audio/finalization still require live acceptance testing after the secret is added. Do not interpret the passing mocks as a live-provider sign-off.

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
