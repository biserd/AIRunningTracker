# Apple notifications

Native APNs, independent of the legacy Expo and web push subscriptions.

## Setup

- Bundle: `run.aitracker.coach`, team `DB5JRGGB6A`.
- Apple capability: Push Notifications. Regenerate the existing App Store profile
  and replace encrypted `IOS_PROVISIONING_PROFILE` before a TestFlight upload.
- Main Worker encrypted secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`.
  The private value is the complete downloaded `.p8` PEM, never an App Store API key.
- Apply `migrations/20260919_apple_push.sql` to the main D1 database.
- Deploy the backend container and its explicit production secret allowlist.
- Current Apple key is topic-specific and **production only**. TestFlight uses
  production APNs. Debug hardware builds need a separately configured sandbox key;
  simulator UI tests do not send real notifications.

## Experience

Settings → Notifications & reminders → Enable notifications. Permission is requested
only on tap. Independent switches control run alerts and running reminders.
The native reminder form does not require an email or WhatsApp connection. Coach
reminder proposals can also be confirmed as Apple notifications when available.
The existing coach proposal generator still has its email-verification prerequisite;
the standalone native reminder form does not. Apple reminders are managed in the
native Notifications screen, not the legacy email/WhatsApp reminder list.

Tapping an alert opens Coach or Schedule inside the app. No external URLs are
accepted. Notification bodies deliberately omit run metrics and reminder contents.

## Delivery boundaries

The existing D1 scheduler leader starts a 30-second APNs worker. It reconciles the
most recent run from the last 24 hours imported after a device opted in. This covers
both webhook and manual sync without flooding a runner with historical imports.
Run alerts mean **synced**, not that AI analysis has necessarily finished.
Each device/generation/event has a unique outbox entry. Delivery rechecks account,
generation, expiry, preferences and reminder cancellation. Definitive APNs transient
rejections retry with bounded backoff. Unknown network outcomes are not replayed.
Apple acceptance is not proof that a device displayed the alert.

Registrations expire with the authenticated session, at most seven days. Opening
the signed-in app refreshes registration; expired sessions need sign-in. Sign-out
unregisters the device, stops local remote registration and clears delivered alerts.
Offline sign-out cannot guarantee server revocation until it reconnects or expires;
payloads remain generic and stale notification taps cannot access another account.
No marketing notifications are added. Existing email/WhatsApp/Expo paths are unchanged.

## Tests

`node --import tsx --test scripts/d1/apple-push.test.ts`

Then on TestFlight:
1. Enable notifications and allow the iOS prompt.
2. Send a test notification, background the app, allow up to a minute.
3. Schedule a reminder a few minutes ahead; check lock-screen text and native tap.
4. Sync a new run; check one alert, then re-sync and verify no duplicate.
5. Toggle each preference, sign out and switch accounts to verify isolation.

The final device delivery check requires a physical device with permission granted.
