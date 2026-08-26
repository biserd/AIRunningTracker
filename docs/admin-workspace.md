# Admin workspace

The admin area is organized around operator tasks instead of exposing every function in one long page.

## Sections

- **Overview:** dated acquisition and conversion indicators, platform context, and a short attention queue.
- **Growth:** 7, 30, or 90 day signup cohorts and distinct-runner Premium funnel events.
- **Campaigns:** worker readiness, rollout controls, audience eligibility, suppression reasons, test delivery, and manual announcements.
- **Users:** server-side search, filters, and pagination with a bounded account summary. Tokens, credentials, and activity payloads are not returned.
- **Coach operations:** agent throughput, pending runs, recent results, and a link to the detailed queue.
- **System:** measured request, database, and process health only.
- **Catalog:** links to the specialized shoe, queue, and performance-log workspaces.

## Campaign safety

Campaign actions are admin-only and the server enforces the following confirmation phrases:

- `GO LIVE` when dry-run is disabled.
- `ENABLE LIVE` when a live worker is enabled.
- `SEND WELCOME`, `SEND UPDATE`, or `SEND LAUNCH` before a bulk message is sent.

Lifecycle test delivery sends one approved template to the current admin. It does not enroll a runner, advance campaign state, or add a marketing unsubscribe header to the test message.

Bulk welcome and product messages include signed one-click unsubscribe links. Welcome and product audiences require explicit marketing consent and exclude opted-out or delivery-suppressed accounts.

## Metric definitions

- Growth data uses the selected date window.
- Checkout combines client checkout starts and authoritative checkout-session creation, deduplicated by runner.
- Trial starts and paid conversions come from authoritative Stripe webhook events.
- Request error rate includes HTTP 5xx responses only.
- Average response time and request counts come from stored performance-log metadata.
- Request and response bodies are never stored in performance logs.

No database migration is required for this workspace revision.
