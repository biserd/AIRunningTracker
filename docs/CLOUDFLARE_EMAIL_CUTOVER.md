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

Domain confirmed Enabled / DNS Configured in Cloudflare. Dedicated token created with explicit account-scope approval and saved encrypted on `aitracker-main`.

Production promoted on September 13, 2026:

- Worker version `3df4bc23-27d2-4293-a15f-cb7c151139e7`.
- Container image `sha256:a3046219ff46aa36a3e87a8c4039adf0d48594a26545d73e8d8ad81ce43b5d5a`, application version 3.
- Stable `production-live` instance running, one healthy active instance, no failed instances.
- Build commit `3f1d060`; 43 regression tests, campaign signing tests, staging/production type checks and local build passed.
- One explicitly approved product-update test sent through the signed-in admin UI to `biserd@gmail.com`. Gmail receipt verified at 11:49 AM EDT: `RunAnalytics hello@aitracker.run`, mailed-by `cf-bounce.aitracker.run`, signed-by `aitracker.run`, TLS.
- No database migration, DNS mutation, campaign activation or messages to other runners were triggered for this test.

Remaining limitation: lifecycle campaigns deliberately stay blocked until per-job Cloudflare delivery feedback is implemented. The REST response lacks a message ID, so the old Resend message-ID correlation cannot be reused or fabricated. Cloudflare delivery logs remain the delivery source of truth meanwhile.
