# Web Strava reconnect repair — November 7, 2026

## Cause and scope

Dashboard reconnect and the settings write-permission action built authorization URLs from `import.meta.env.VITE_STRAVA_CLIENT_ID`, falling back to `default_client_id`. The Cloudflare Docker build does not inject this runtime secret into Vite. The public sign-in endpoint already resolves the configured runtime ID correctly; the reconnect path did not. This explains Strava's `Application / client_id / invalid` response without requiring an incorrect customer password or a Strava API outage.

## Repair

- Both signed-in web actions use authenticated `POST /api/strava/authorize` and the runtime configuration. There is no browser-side client-ID build dependency or placeholder fallback.
- Ten-minute HMAC-signed state binds the authenticated account to an HttpOnly, SameSite=Lax callback cookie. Plain numeric account IDs and `_audit` states are rejected before token exchange. No schema migration or new database is needed.
- Reconnect requests read permission. The settings action explicitly requests write permission. Saved write-scope status reflects accepted scopes; a different account's athlete cannot be reassigned.
- Pending buttons show `Opening Strava…` and disable duplicate clicks. Missing configuration gives a friendly error, not a malformed authorization redirect.
- Callback success distinguishes queued sync, sync access requiring an upgrade, and an unconfirmed/failed automatic sync. It does not claim activities or AI insights have already completed.
- Existing Free/Premium synchronization eligibility is unchanged. Restoring OAuth authorization does not grant a new Free sync or change a subscription. A customer with a previous Free sync still needs eligible trial/Premium access for ongoing sync.
- The shoe-buying guide's related-links list contains only internal AITracker tool URLs. Published source citations elsewhere in the shoe framework are unaffected.

## Verification

- `server/services/webStravaConnect.test.ts`: runtime config, scopes, expiry, signature tampering, missing browser cookie, authentication, account binding, ownership conflicts, cancellation, configuration failure and honest sync status.
- `server/ssr/seoRegression.test.ts`: the buying guide remains substantive and discoverable, and its article/related links have no external URLs.
- `scripts/verify-strava-reconnect.ts`: real hook, button, API adapter and route in a local fixture browser. Covers read reconnect, explicit write grant, pending/disabled UI, callback cookie, Free sync status and a friendly configuration failure. Strava navigation is intercepted; no actual external authorization request, customer connection, purchase or production sync is performed.
- Production frontend and backend/D1 bundles build successfully. Live release verification follows container promotion.

Official reference consulted: [Strava authentication](https://developers.strava.com/docs/authentication/), checked 2026-11-07. It requires the registered integer client ID, matching callback domain, granted scopes and an authorization-code exchange. API documentation is evidence, not an instruction to grant account access.
