# RunAnalytics Mobile (Expo)

Native iOS + Android app for [RunAnalytics](https://aitracker.run), built with **Expo SDK 52**, **Expo Router**, **NativeWind**, and **TanStack Query**. Hits the same backend as the web app at `https://aitracker.run/api/*` — no separate database or services.

## Status

Phase 1 skeleton: login → activities list → settings → sign out. All screens wired to the production API. Push notifications, Strava OAuth, AI coach chat, and other screens come next.

## Quick start (do this on your local machine, not Replit)

```bash
cd apps/mobile
npm install
npx expo start
```

Then either:

- **Easiest:** install **Expo Go** on your phone, scan the QR code, and the app runs instantly. Great for daily UI work.
- **iOS Simulator (macOS only):** press `i` in the terminal.
- **Android Emulator:** press `a`.

The app will hit `https://aitracker.run/api/*` by default, so **log in with your real RunAnalytics account**.

## Pointing at a different backend

Edit `app.json` → `expo.extra.apiBaseUrl`. For example, to hit a Replit dev URL:

```json
"extra": { "apiBaseUrl": "https://your-replit-dev-url.replit.dev" }
```

You can also use [EAS environment variables](https://docs.expo.dev/build-reference/variables/) for separate prod/staging builds.

## Project layout

```
apps/mobile/
├── app/                       Expo Router file-based routes
│   ├── _layout.tsx            Root: auth + query client + safe area
│   ├── index.tsx              Auth gate (redirects to login or tabs)
│   ├── login.tsx              Email + password sign in
│   └── (tabs)/
│       ├── _layout.tsx        Bottom tab bar
│       ├── index.tsx          Activities list (pulls /api/activities)
│       └── settings.tsx       Account + sign out
├── lib/
│   ├── api.ts                 Typed fetch wrapper with JWT injection
│   ├── auth.ts                Token storage (expo-secure-store) + AuthProvider/useAuth
│   ├── queryClient.ts         TanStack Query setup
│   └── format.ts              Pace / distance / duration formatters
├── types.ts                   User + Activity types (match server schema)
├── app.json                   Expo config (bundle id, scheme, plugins)
├── package.json
├── tailwind.config.js         NativeWind/Tailwind config
├── babel.config.js
├── metro.config.js
└── global.css                 Tailwind directives
```

## Building for the App Store / Play Store

You'll need an [Expo account](https://expo.dev) (free) and EAS CLI. From this folder:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios       # produces an .ipa, builds in Expo's cloud (no Mac required)
eas build --platform android   # produces an .aab
eas submit --platform ios      # uploads to App Store Connect / TestFlight
eas submit --platform android  # uploads to Play Console
```

Bundle IDs are pinned to `run.aitracker.app` (both platforms). **Don't change them after first publish** — it breaks subscriptions and push tokens.

## What's intentionally NOT here yet

- **Strava OAuth** — needs `expo-auth-session` + a `aitracker://strava-callback` deep link round-trip.
- **Push notifications** — `expo-notifications` will register an Expo push token and POST it to `/api/push/subscribe` (the backend column `push_subscriptions.native_token` is already reserved). Server dispatch via Expo Push Service is a small follow-up.
- **AI Coach chat, training plans, race predictor, shoes, recap details** — port screen by screen. Most reuse the existing API endpoints unchanged.
- **HealthKit / Health Connect sync** — separate milestone.

## Why a sibling folder, not a true npm workspace (yet)

The web app's Vite/Drizzle setup at the repo root is locked, and Expo apps are happiest as self-contained npm projects (Metro bundler, EAS Build, etc. assume a single `package.json`). Keeping `apps/mobile/` standalone means:

- Mobile installs are independent — no risk of polluting web `node_modules` with React Native deps.
- EAS Build only sees `apps/mobile/` and builds cleanly.
- We can promote to true npm workspaces later if shared code grows enough to justify the refactor (extract `packages/api-client`, `packages/core`, etc.).

For now, the API contract (`User`, `Activity`, etc.) is mirrored in `types.ts` — small enough to maintain by hand until the boundary is worth investing in.
