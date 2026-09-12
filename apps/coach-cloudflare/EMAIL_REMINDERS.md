# Email reminders on Cloudflare

This integration is isolated to `codex/cloudflare-coach` and `new.aitracker.run`. No Replit, existing SMTP server, production PostgreSQL database or existing customer account is accessed.

## Enable delivery

1. Cloudflare dashboard: **Compute → Email Service → Email Sending → Onboard Domain**. Sending to ordinary customer inboxes requires Email Sending on a Workers Paid plan. Email Routing alone only permits Cloudflare-verified destinations.
2. Onboard and verify the intended sender domain. The configuration uses `reminders@new.aitracker.run`. If the dashboard requires another sender domain, update both `REMINDER_FROM` and `send_email[].allowed_sender_addresses` to that verified sender before deploying. Do not replace the existing apex mailbox MX records. Review Cloudflare's SPF, DKIM, bounce and DMARC records during onboarding.
3. The Worker uses the native `REMINDER_EMAIL` send binding. This is Cloudflare Email Service, the same sending service available over SMTP, without an SMTP password or an extra API key in the Worker. The sender is restricted in the binding; recipients come exclusively from the verified session contact.
4. Apply `migrations/0003_reminders.sql` to this preview D1, build, and deploy this branch. Cron must be `* * * * *`. Wrangler can take several minutes to propagate cron changes.
5. In **Coach → A nudge when you need it** (also in Settings), enter your inbox and IANA timezone, send the verification code, and enter the code in the same browser. No reminder is sent until you verify and separately confirm it.

No new secret is needed. Non-secret config: `REMINDER_FROM`, `PUBLIC_ORIGIN`. `OPENAI_API_KEY` remains the existing AI credential. `PUBLIC_ORIGIN` is fixed server configuration, not taken from a caller's Host header.

## Test the actual experience

- Verify your inbox. Check spam if the code does not arrive. It expires after ten minutes, is single-use and allows five attempts. The app does not return the code in HTTP responses.
- Ask the text or voice coach: **“Remind me to lay out my running kit tomorrow at 7 AM.”** The coach reads the actual current time and your verified timezone, not the frozen sample-plan date.
- Review the text, calendar date, timezone and recipient, then choose **Confirm reminder** on screen. A spoken “yes” is not sufficient. A draft is never sent.
- To test quickly, create a reminder at least two minutes ahead. Close the page. Check the inbox and Cloudflare Email Service logs after its time. The app polls due reminders every minute; it cannot guarantee second-precise arrival.
- The list shows **Scheduled**, **Sending**, **Accepted by email service**, **Not sent**, **Delivery uncertain**, **Cancelled** or **Expired without sending**. “Accepted” does not claim inbox delivery. Actual delivery/bounce observability is in Cloudflare Email Service; no delivery-event webhook is implemented here.
- Cancel a pending reminder and verify it does not arrive. The coach can prepare a cancellation too, still requiring on-screen confirmation. Change a reminder by cancelling it and creating a new one.
- Follow **Stop all reminders for this preview** in an email. The link opens a confirmation page and works without the preview cookie. Link-scanner GETs do not cancel anything. The token is in a URL fragment, submitted in a POST body, not logged in the request URL. This is a human-confirmed unsubscribe link, not RFC 8058 one-click unsubscribe.

## Scope and security

- One-time reminders only, up to ten pending per session. Recurring schedules and cross-device account recovery are not implemented.
- Reminder inbox verification is a narrow identity proof for this browser workspace, not a migration/login to the user's existing AITracker account. No production running data is made accessible. Reminders expire with the original seven-day preview session. They cannot be scheduled beyond its lifetime.
- Owner identity always comes from the hashed HttpOnly session cookie. No API or AI tool accepts a recipient, arbitrary sender, external route, SQL or another runner's ID. Text is at most 160 characters; subject and email layout are application-owned plain text.
- Codes and unsubscribe tokens are stored as hashes. Verification is rate-limited by session, IP, recipient and globally. A new inbox verification generation invalidates old drafts and prevents old unsubscribe links from controlling the new inbox.
- Verifications: three/session/hour, five/IP/hour, three/recipient/day, fifty/global/UTC day. Reminder sends: two hundred/global/UTC day. Existing API session rate limiting also applies. These conservative preview limits do not replace a production anti-abuse/verified-account system.
- D1 compare-and-swap claims prevent concurrent schedulers from sending the same reminder. The sender rechecks verification, contact generation, opt-out and session expiry. An email already in flight may still arrive after cancellation or unsubscribe.
- Only explicit rate/quota rejections retry, at most three attempts. Unknown provider outcomes, process crashes or a twenty-second timeout become **Delivery uncertain** and are not automatically retried. Cloudflare's send interface does not document a provider idempotency key; exactly-once delivery cannot be guaranteed. This design favors avoiding duplicates over retrying an ambiguous send.
- Reminders more than an hour late expire instead of surprising the runner much later. Expired sessions and their reminder/contact/token rows are deleted by the daily cleanup.
- No email addresses, codes, email bodies or tokens are intentionally written to application logs. Cloudflare itself processes email content according to its service policies. Email activity does not trigger AI calls; only the user's text/voice requests do.

## Operational verification and rollback

`tests/reminders.test.ts` uses real SQLite SQL and a fake email sender. It covers ownership, verification expiry/replay/guess limits, explicit confirmation, concurrent delivery, cancellation/opt-out, generation isolation, retry bounds, uncertain outcomes and DST edge cases. `tests/browser-reminders.ts` is local-only and uses Miniflare's native email outbox to test mobile verification, scheduling, persistence and cancellation without external mail. AI tests check that the model only prepares reminder drafts.

Before calling delivery live, confirm one real verification message and one scheduled reminder reach the intended inbox. Passing local tests is not evidence of sender-domain verification or inbox delivery.

September 12 implementation check: 21 automated tests passed, plus the desktop/mobile regression, AI-confirmation browser test and local-native-email reminder browser test. Migration `0003_reminders.sql` was applied to the isolated remote D1. The live reminder endpoint returned HTTP 200 and the real coach correctly requested inbox verification before preparing a reminder. External inbox delivery is still awaiting sender-domain setup and recipient acceptance testing.

To stop future sends globally, remove the reminder cron trigger or roll this Worker back to its previous version. Do not delete D1 and do not change the existing site's deployment. To cancel a single preview, use Disconnect or its email opt-out link. A provider-accepted message cannot be recalled.

Official references: [Cloudflare Email Service setup](https://developers.cloudflare.com/email-service/get-started/send-emails/), [native Workers sending API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [send-binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/).
