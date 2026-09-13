# Cloudflare email sign-in

Staging now intercepts the existing magic-link request/verify APIs at the Worker.
The existing auth page and `/auth/magic-link` page remain the UI. Registration is
still disabled: this signs into an existing runner account, including Strava-only
accounts. No password reset is necessary.

## Staging test

1. Open https://aitracker-api-staging.biser-d.workers.dev/auth.
2. Choose the email sign-in link option and enter `biserd@gmail.com`.
3. Open the email from `reminders@aitracker.run` and click **Continue to my account**.
4. Check your profile and dashboard. Live-account mutations are still blocked.
5. Reusing the link must fail. Request a new one after one minute if needed.

Only this test recipient is permitted by the staging email binding. Cloudflare
Email Service sends directly through `AUTH_EMAIL`; no Resend keys, DNS changes,
or campaign settings are involved. A successful request response intentionally
does not reveal whether the account exists. Delivery failures emit only
`magic_link_delivery_failed`, without addresses, tokens or provider payloads.

## Storage and security

`aitracker-staging-auth` is a separate D1 database. Its migration is
`auth-migrations/0001_magic_links.sql`, already applied to staging. It contains
keyed email hashes, random-token hashes, runner IDs and expiry timestamps, not
passwords or plaintext tokens. No Neon migration is required for email sign-in.

Links expire in 15 minutes. Atomic D1 deletion prevents replay across instances.
There is a global per-email 60-second resend cooldown and edge IP rate limiting.
Links use URL fragments to keep credentials out of HTTP request logs. The
confirmation button avoids consuming a link on a simple email scanner GET.
The read-only Hyperdrive lookup rechecks account existence and email ownership
before issuing an existing-format session signed with the staging-only key.
Unknown and ambiguous email accounts never receive sessions.

## Production cutover requirement

This handler is currently wired to staging only. Do not share its D1 database or
signing key with production. Before enabling the same flow in production, create
a separate auth database, apply its migration, wire the handler with the pinned
production origin and verified Hyperdrive binding, and remove the staging
recipient restriction only after delivery and abuse testing. Existing production
Resend authentication is unchanged until that cutover. Staging remains noindex.
