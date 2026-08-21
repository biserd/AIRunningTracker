# Proactive RunAnalytics Coach

The proactive coach is native RunAnalytics functionality. Runners do not need to install Hermes, configure OAuth, or create schedules. Premium and trial runners opt in through **Settings → AI Coach Settings**.

## Runner experience

- Post-run analysis continues from the Strava webhook path.
- A runner-local morning briefing combines today's plan, recent training, stated availability, missed-workout recovery, race proximity, and optional weather.
- Weekly reviews identify one pattern to continue and one conservative next-week adjustment.
- Delivery supports email, web push, or in-app only.
- Quiet hours, 24-hour/7-day snooze, full pause, channel choice, weather consent, and one-tap daily availability are runner controlled.
- In-app coach messages accept Helpful / Not helpful feedback.

Messages are intentionally suppressed when the coach is paused or snoozed, the briefing already exists for the runner's local date, the account lacks AI Coach entitlement, or delivery is inside quiet hours. A missed hard workout is never automatically stacked onto the next day.

## Data and migration

Startup idempotently adds the proactive preference columns and feedback table. The Drizzle schema contains the same definitions for `npm run db:push`. The notification dedupe key has a database-level unique index, and delivery workers atomically claim pending rows with `FOR UPDATE SKIP LOCKED` before sending.

Deploy the schema before or with the application. If an older database contains duplicate non-null notification dedupe keys, reconcile those rows before creating `notification_outbox_dedupe_unique_idx`.

## Weather privacy

Weather is off by default. The browser requests coarse geolocation only after the runner presses **Use my current location**. RunAnalytics stores the label, latitude, and longitude used for forecast lookup; it does not expose this location through MCP. Removing the location disables weather coaching. Forecast requests use Open-Meteo with a four-second timeout and fail closed: no forecast means no weather claim.

## Optional Hermes handoff

The bundled skill is at `integrations/hermes/skills/runanalytics-coach`. It supports implicit invocation and depends on the production read-only MCP endpoint. The short profile identity is at `integrations/hermes/profiles/runanalytics-coach/SOUL.md`; keep this always loaded and let the full skill load only for coaching work.

The controlled multi-runner Telegram pilot is documented in
[`COACH_CHANNEL_PILOT.md`](./COACH_CHANNEL_PILOT.md). It uses an explicit
database allowlist, single-use runner consent, hashed Telegram identities,
opaque routing IDs and dedicated read-only MCP grants.

The legacy fallback remains deliberately limited to one runner and is used
only when `COACH_MULTI_RUNNER_PILOT_ENABLED` is not `true`. It requires:

- `COACH_AGENT_WEBHOOK_URL`: the trusted Hermes webhook endpoint.
- `COACH_AGENT_WEBHOOK_SECRET`: a unique 32+ character HMAC secret shared only with that endpoint.
- `COACH_AGENT_PILOT_USER_ID`: the numeric RunAnalytics user ID of the single approved pilot runner.

The event body contains an opaque stable event ID, event type, occurrence time,
and activity ID. It does not contain a user ID, activity metrics, or tokens.
Headers include `x-runanalytics-delivery`, `x-runanalytics-timestamp`, and
`x-runanalytics-signature: v1=<hex>`. The receiver must reject timestamps more
than five minutes old, verify HMAC-SHA256 over `<timestamp>.<raw-body>` with a
constant-time comparison, and atomically deduplicate the delivery ID before
calling `get_post_run_brief` through the pilot runner's OAuth connection.
`x-hub-signature-256` remains temporarily available for the existing receiver,
but it does not provide replay protection and should not be used by new code.

If any value is absent, invalid, or the event belongs to another runner, native
RunAnalytics coaching continues and no external request is attempted.

## Operations and measurement

- `GET /api/admin/coach-message-analytics?days=30` returns queued, sent, read, Helpful, Not helpful, delivery rate, read rate, and helpful rate by message type.
- `POST /api/admin/notifications/process` remains available for controlled recovery; normal delivery runs every minute.
- Morning eligibility is checked hourly because each runner selects a local delivery hour.
- Email and push are rechecked against pause, snooze, and quiet hours immediately before delivery.

Monitor delivery failures, duplicate-key creation failures, forecast timeouts, post-run webhook handoff failures, read rate, and helpful rate. Do not optimize message volume alone; a low opt-out/snooze rate and high helpful rate are guardrails.

## Rollback

Stop `proactiveCoachWorker` and `notificationDeliveryWorker` startup to disable proactive sending while preserving runner preferences and feedback. Remove the two Hermes environment values to stop external handoffs. Existing rows can remain for audit and analytics; no training or account data must be deleted for rollback.
