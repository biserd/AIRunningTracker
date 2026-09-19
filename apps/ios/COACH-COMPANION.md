# Coach companion

Native Schedule reads the authenticated main `/api/coach/experience` endpoint,
independently of WhatsApp/email availability. It refreshes on foreground and tab
entry (60-second throttle), pull-to-refresh and confirmed plan changes. It shows
the current plan week plus up to 20 days ahead. Missing duration is not a rest day.
History is the existing entitlement-bounded, 90-day, 200-activity summary feed.
Coach Insights reads the same authenticated GET APIs as the main site's page:
analytics batch, recovery and coach recaps. Overview, Performance and Recaps show
the existing analysis without edit controls or marking recaps viewed. Saved coach
notes remain separately labeled. The existing backend owns access checks and
calculation caching; the app does not create a second analytics engine.
Requests load in parallel on entry and pull-to-refresh, independently of chat.
Partial failures retain successful sections and offer retry. Displayed fetch time
is not claimed as the underlying activity freshness. Missing metrics are not zero.
Shared warm surfaces and orange, teal, blue and rose accents adapt to dark mode.

## Coaching loop

- Run alerts carry an activity ID. The app checks it against owned loaded history
  before opening a conversation about that run. No metrics appear on the lock screen.
- Daily and post-run check-ins persist server-side. They inform the existing coach;
  they do not mutate the plan. Existing plan confirmation and eligibility still apply.
- Explicit notes are editable in Coaching preferences. They are included as runner
  data in the normal coach context, not privileged instructions or hidden memories.
- Evening briefing and Sunday progress story are opt-in. One scheduled briefing per
  day: Sunday review takes precedence when both are enabled. Weather uses the existing
  opted-in approximate location. Missing weather is stated, never invented.
- Weekly stories are deterministic summaries of available synced activity, not claims
  of physiological improvement. Tap to discuss with the AI coach for more detail.
- New scheduled coaching is app/Apple-only, not copied to WhatsApp/email. Existing
  separately enabled main-site run emails and WhatsApp alerts are unchanged; this is
  not a global cross-channel suppression system.

## Reminders

Native text/voice delegation recognizes English reminder requests while Apple push
is enabled. A constrained model draft uses server-owned timezone, schedule and
reminders. Server validation bounds times, titles and cancellation ownership. The
native review confirms the exact Apple delivery time. No email verification needed.
Recurring reminders are not supported. A clarification can be followed up in chat;
unrelated follow-ups return to ordinary coaching. Other clients keep their existing
email/WhatsApp reminder implementation. Native reminder draft dialogue is local to
the current app conversation, not cross-device persisted chat history.

## Delivery

The existing 30-second Apple worker creates scheduled briefings for runners with
unexpired registered devices, respecting account snooze and quiet hours. Opening
the app during the selected hour also generates the in-app briefing. There is no
backfill outside that hour. Device session expiry and iOS Focus still apply.
Quiet hours apply to proactive coaching, not explicitly requested reminders.
All subscriptions stay off until the runner opts in. APNs outbox dedupe and account
isolation are reused. Generic notification payloads contain no coaching notes.

Migration: `migrations/20260919_coach_companion.sql`.
Tests: `scripts/d1/coach-companion.test.ts`, `native-reminder-draft.test.ts`,
`apple-push.test.ts`, and native `ScheduleTests` plus iPhone/iPad UI checks.
