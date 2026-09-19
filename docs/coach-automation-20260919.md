# Coach automation release

## Capabilities

- Account-scoped conversation history and saved coaching notes across web, native, voice and linked WhatsApp.
- Reviewed individual workout changes: shorten a timed easy/recovery/long run, replace a pending workout with rest, or move it onto a pending rest day. Server-side ownership, stale-state and completion checks apply. Production plan writes remain limited to the approved test account.
- Daily and weekly native push and WhatsApp reminders, preserving local time across DST. Cancellation stops the parent schedule and queued occurrences. First occurrences must be within seven days. Email reminders remain one-time.
- Optional follow-up on yesterday's check-in, tomorrow's run briefing and a goal-connected Sunday review.
- Explicit preferred channel for proactive coaching: app, email, WhatsApp, automatic or none. Existing preferences are preserved until saved. One event is pinned to one channel. Explicit reminders retain their requested channel. Uncertain provider delivery is not automatically retried on another channel.

## Database changes applied

- Main D1: `migrations/20260919_coach_automation.sql`.
- Coach D1: `0011_coach_notifications.sql`, `0012_whatsapp_schedules.sql`.
- Additive tables only. No runner notification preferences or existing workouts were changed by migration.

## Release evidence

- Main feature tests: 31 passed.
- Coach tests: 75 passed, one existing test skipped. TypeScript and Vite builds passed.
- GitHub migration safety: run 35452145924 passed.
- iPhone and iPad simulator checks: run 35451911300 passed.
- TestFlight upload: run 35452216563 passed, tag `ios-testflight-20260919-coach-automation`.
- Main production image: `sha256:607553c06de206a01c4baae5c547675be6cb7f6e02c0d05be86fd0ea0fa2d975`.
- Main Worker: `9f9d4134-5875-44ae-9287-ce6f0b99ec65`.
- Coach Worker: `57f72b79-08d2-41f0-b0c6-14c332179c8d`.
- Synthetic voice Durable Object runtime check passed, including private provider-error redaction.
- Production health returned 200; invalid coaching unsubscribe token returned 400; unauthenticated workout mutation returned 401.
- Authenticated coach settings loaded existing connections and preferences without saving or changing them.

## Manual acceptance

Choose a delivery channel and save preferences explicitly. To test recurrence, request a clearly labeled reminder with a specific local start time and daily/weekly repetition, then cancel it after checking delivery. Test workout edits by reviewing the exact date and change before confirming. No real workout was changed or message sent by the automated release checks.

WhatsApp running-data access remains read-only. Plan changes are reviewed and confirmed in the app/web experience, not executed from WhatsApp. Native push permission and a valid WhatsApp connection/template are still required for those delivery channels. No new provider secrets are required for this release.
