# RunAnalytics Mobile (PWA + Capacitor POC)

This document covers everything needed to use RunAnalytics as a mobile app — both the **installable PWA** (works today, anywhere) and the **Capacitor native shell** (for App Store / Play Store distribution).

---

## TL;DR

- **PWA is live.** Anyone can install RunAnalytics to their home screen and receive web push notifications.
- **Push notifications fire on every Coach Recap** (post-activity AI analysis), in addition to the existing email.
- **Capacitor is configured** but the iOS/Android platform folders are generated locally — Replit can't host Xcode/Android Studio.

---

## What's installed

| Piece | Where |
| --- | --- |
| Web app manifest | `client/public/manifest.webmanifest` |
| Service worker (cache + push) | `client/public/sw.js` |
| App icons (192 / 512) | `client/public/icons/` |
| Frontend push abstraction | `client/src/lib/push.ts` |
| Settings UI toggle | `client/src/components/PushNotificationToggle.tsx` |
| Backend push service | `server/services/pushService.ts` |
| API endpoints | `/api/push/vapid-public-key`, `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/test` |
| DB table | `push_subscriptions` (in `shared/schema.ts`) |
| Capacitor config | `capacitor.config.ts` |

---

## VAPID keys (web push)

The server auto-generates a VAPID keypair on first boot and persists it to the `system_settings` table (`vapid_public_key` / `vapid_private_key`). No env vars required.

If you want to **rotate** keys or pin them via env, set:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com   # optional, defaults to admin email
```

Env vars take precedence over the DB-stored pair.

---

## How push notifications flow

1. User opens **Settings → Push notifications** and taps **Enable**.
2. Browser prompts for permission → SW is registered → a push subscription is created → posted to `/api/push/subscribe` and stored in `push_subscriptions`.
3. When a Strava activity syncs and a Coach Recap is generated (`server/services/coachingService.ts`), two notifications are queued in `notification_outbox`:
   - One `email` (existing)
   - One `push` (new)
4. The notification processor picks up `push` rows, calls `sendPushToUser()`, which iterates the user's subscriptions and uses `web-push` to dispatch.
5. SW receives the `push` event → shows a notification → click navigates to `/activity/<id>`.

Expired subscriptions (HTTP 404/410) are auto-removed.

---

## iOS web push gotcha

iOS Safari only delivers web push when the site is **installed to the Home Screen** (Add to Home Screen → open from icon). It also requires iOS 16.4+.

If you need push on iOS without the home-screen install step, use the Capacitor native build below.

---

## Capacitor setup (local, one-time)

Replit cannot run Xcode or Android Studio, so platform folders are generated on a developer machine.

```bash
# 1. Build the web bundle
npm run build              # outputs to dist/public

# 2. Add platforms (only needed once)
npx cap add ios
npx cap add android

# 3. Sync the latest web build into the native projects
npx cap sync

# 4. Open in native IDEs
npx cap open ios           # requires macOS + Xcode
npx cap open android       # requires Android Studio
```

The web bundle is loaded by the native shell as-is. The same `client/src/lib/push.ts` detects Capacitor at runtime and registers an APNs/FCM token instead of a web push subscription — both flow through the same `/api/push/subscribe` endpoint.

### iOS push (APNs) — extra steps

1. Enable **Push Notifications** capability in Xcode.
2. In your Apple Developer account, generate an APNs auth key.
3. Wire it into your push provider of choice (Firebase, OneSignal, or a Node APNs library) inside `pushService.ts` where the comment reads `Skipping native ${sub.platform} token`.

### Android push (FCM) — extra steps

1. Create a Firebase project, add the Android app, download `google-services.json` into `android/app/`.
2. Add the FCM Server Key (or service account JSON) to your env.
3. Wire FCM into the same `pushService.ts` branch.

---

## Testing push end-to-end

### 1. Install the PWA

- **Desktop Chrome / Edge:** click the install icon in the address bar.
- **Android Chrome:** menu → "Install app".
- **iOS Safari:** Share → Add to Home Screen, then open from the icon.

### 2. Enable notifications

Go to **Settings**. In the **Email Notifications** card you'll see a new **Push notifications (this device)** row. Tap **Enable** and accept the browser prompt.

### 3. Send a test push

Hit the test endpoint while logged in:

```bash
curl -X POST https://aitracker.run/api/push/test \
  -H "Authorization: Bearer <your-jwt>"
```

You should see a notification within ~1 second.

### 4. Real flow

Sync a Strava activity. A Coach Recap is generated, an email goes out, and a push fires on every device you've subscribed.

---

## Service worker behavior

- **Caches:** app shell + static assets (JS / CSS / fonts / images).
- **Never caches:** anything under `/api/*` or `/auth/*`.
- **Navigation:** network-first, falls back to cached `/` if offline.
- **Versioning:** bump `CACHE_VERSION` in `client/public/sw.js` to invalidate.

In dev mode the SW is **not registered** (see `client/src/main.tsx`) so Vite HMR is unaffected.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Notifications aren't supported" message | Older browser, or visiting from iOS Safari without installing the PWA |
| Permission prompt never appears | Already granted/denied — check site settings |
| Subscribed but no push arrives | Check `notification_outbox` rows for `failed`; check server logs for `[Push]` errors |
| 410/404 from web-push | Subscription expired — auto-removed on next send |
| Capacitor app crashes on push register | APNs/FCM provider not wired in `pushService.ts` (POC stops at token capture) |
