# Cloudflare Email cutover

## Sending contract

All application email templates use the shared Cloudflare REST transport. There is no Resend sending fallback.
Production sender remains `RunAnalytics <hello@aitracker.run>`. The manual product-update script retains its separate `Biser from RunAnalytics <noreply@aitracker.run>` sender and reply address.
HTML, plain text, subjects, links and list-unsubscribe headers are passed unchanged. Provider-generated Message-ID, Return-Path and DKIM signatures necessarily change.

Required production configuration:

- `CLOUDFLARE_EMAIL_API_TOKEN`: encrypted, dedicated Email Sending: Edit token.
- `CLOUDFLARE_EMAIL_ACCOUNT_ID`: existing Cloudflare account ID.
- `EMAIL_FROM`: exact sender above.

Do not change `EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2`, `MARKETING_LINK_SIGNING_SECRET`, or `JWT_SIGNING_SECRET` during this migration. They preserve existing unsubscribe and login links.

## Delivery semantics

REST success requires explicit acceptance of the intended recipient, not just HTTP 200. Hard bounces are failures. Queued means accepted, not delivered. REST does not supply a message ID, so none is fabricated. Only explicit 429 rejections are retried. Network failures/timeouts have uncertain outcomes and are not retried within the transport.

Cloudflare maintains provider-side suppression for hard bounces and complaints. Existing application opt-outs remain in the unchanged database. Keep lifecycle campaigns disabled until asynchronous delivery feedback and per-job reporting have been migrated and verified. Readiness fails closed even if an old enabled database setting is restored.

The legacy signed Resend receipt endpoint can remain temporarily to accept late feedback for old sends. It cannot send email and is not a sending dependency. Remove its secret and endpoint after the old provider's retry window. No Resend API reads are used by staging readiness.

## Verification and rollback

Before promoting the container image, run email transport tests, campaign token tests, migration tests and production build. Verify a controlled email to the owner's test inbox, including From and unsubscribe rendering. Do not click a real user's unsubscribe link to test it.

Do not remove legacy sender DNS records while old messages may still be in transit. They do not route new sends through Resend. Do not remove MX records or unrelated sender configuration.

Rollback requires the prior container image and its Resend environment variables; never silently switch providers during a failed send.

## Status

Domain confirmed Enabled / DNS Configured in Cloudflare. Dedicated token created with explicit account-scope approval and saved encrypted on `aitracker-main`. Local tests and build passed. Production promotion and inbox verification pending.
