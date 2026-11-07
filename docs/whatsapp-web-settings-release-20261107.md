# WhatsApp web settings

Runtime source: `f06ac44`.

Both `/settings` and `/coach-settings` now use the shared WhatsApp connection card. Telegram cards, trial promotions, automatic connect handling and client API calls were removed from those pages. Existing legacy Telegram bindings were not revoked or migrated silently. The native app and existing WhatsApp worker are unchanged.

The authenticated web adapter uses the same first-party PKCE OAuth flow and account identity as iOS. It forwards the verified account token only to the fixed coach origin, shows the five read scopes for explicit approval, binds consent tickets to the authenticated account for ten minutes, validates callbacks and private pairing links, and disables redirect following. No migration or new database is required. Connection status and disconnect remain available after Premium expires; new authorization and pairing require an active trial or subscription.

Checks completed before deployment:

- 27 targeted service/security/Strava regression tests passed.
- Browser fixture passed consent, approval, pairing, connection polling, disconnect confirmation, Free-account disconnect, error retry and mobile overflow checks. No production account or WhatsApp message was used.
- Both settings source files contain no Telegram UI or Telegram API calls.
- Vite production build and D1 application bundle passed.
- TypeScript has 34 pre-existing diagnostics; none in the changed feature files.

Read-only deployment verification: `scripts/verify-whatsapp-release-live.ts [origin] [optional staging shard]` checks the authenticated status endpoint and published settings/WhatsApp assets. It never signs in, creates a grant, connects a number or sends a message.

Production verification passed at 2026-11-07 19:44:57 UTC:

- Runtime container version 42; image `sha256:3f7046e26e95bf543686dd3fe0f0dcb93904db00242057692297fd2d1cd1c1fe`.
- Production worker `b7419c9c-3976-4703-91c9-fbb5fa672dc8`; stable `production-live` identity preserved.
- A one-time runtime restart was applied only after the new image was confirmed in the application configuration, avoiding a warm process serving old settings.
- Published shared card: `WhatsAppConnectionCard-B919gKG3.js`, referenced by both settings chunks. Anonymous status requests return 401; both settings bundles have no Telegram controls.
- Existing public tool/SEO and Strava reconnect smoke checks passed after promotion.
- No D1 migration, customer grant, phone pairing or outgoing message was performed for verification.
