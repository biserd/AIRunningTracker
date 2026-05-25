# RunAnalytics Extension — Manual Testing Checklist

Run through these checks before every release. Test in Chrome with Developer Mode enabled.

## Setup

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `/extension` folder
4. Note the Extension ID shown under the card — copy it into the web app's `VITE_EXTENSION_ID` env var for the auth bridge to work during local dev.

---

## Content Script (Strava Activity Page)

- [ ] **Locked state**: Navigate to any Strava activity page while logged out of RunAnalytics. Panel appears above activity stats with "Your AI run brief is ready" and "Connect free — 14 day trial →" button.
- [ ] **Full brief state**: Log in to RunAnalytics (auth bridge sends token). Reload a Strava activity. Panel shows AI summary, score, readiness, injury risk, and "Full analysis" CTA.
- [ ] **Trial expired / locked-for-free state**: With a free-tier account whose activity is locked, panel shows blurred content and "Resume trial →" CTA.
- [ ] **Loading skeleton**: Visible briefly while API call is in progress (simulate with slow network in DevTools).
- [ ] **Error state**: With no network / API unreachable, panel shows "Brief unavailable — open RunAnalytics".
- [ ] **No inject on non-activity pages**: Navigate to `strava.com/athlete/*`, `strava.com/segments/*`, `strava.com/clubs/*` — panel must NOT appear.
- [ ] **SPA navigation**: Navigate between two activity pages without full reload (click activity links in feed). Old panel removes, new panel injects for new activity.
- [ ] **Idempotency**: Reload the same activity multiple times — only one panel ever appears.
- [ ] **No layout breakage**: Panel does not shift or break Strava's layout at 1280px, 1440px, or 1920px widths.
- [ ] **No console errors**: Open DevTools console on any Strava page — zero errors or warnings from the extension.

---

## Popup

- [ ] **Logged out**: Click extension icon → shows RunAnalytics logo, tagline, and "Connect account" orange button.
- [ ] **"Connect account" button**: Opens `https://aitracker.run/auth` in a new tab.
- [ ] **Logged in**: After auth, click extension icon → shows "Hey [firstName]", last run card with date/distance/pace/summary, readiness + injury risk pills, and "Open RunAnalytics" button.
- [ ] **"Open RunAnalytics" button**: Opens `https://aitracker.run/dashboard` in a new tab.
- [ ] **"Disconnect account" link**: Clears token, popup switches to logged-out state immediately.
- [ ] **Loading skeleton**: Visible for a moment while fetching athlete summary.
- [ ] **Popup dimensions**: Width is 320px, does not exceed 480px height.

---

## Auth Bridge

- [ ] **Token sync**: After logging in on `aitracker.run`, return to a Strava activity — panel now shows full brief without page refresh (may need to navigate away and back if panel was already injected).
- [ ] **Logout sync**: After logging out on `aitracker.run`, panel on Strava reverts to locked state on next navigation.
- [ ] **Extension install**: Uninstall and reinstall extension → `aitracker.run/auth` opens automatically in a new tab.

---

## Security & Data Hygiene

- [ ] **No run data in storage**: Open `chrome://extensions` → Extension details → "Inspect views: service worker" → check `chrome.storage.local` — only `raToken` and `raUser` present, never activity data.
- [ ] **Token cleared on 401**: Simulate a 401 from API → popup and panel both revert to logged-out state, token is removed.
- [ ] **External message origin check**: Confirm background.js rejects messages not from `https://aitracker.run`.

---

## UTM Tracking (verify in browser network tab or GA)

- [ ] Locked panel CTA → `?utm_source=extension&utm_medium=strava&utm_campaign=locked`
- [ ] Trial expired CTA → `?utm_source=extension`
- [ ] Full brief CTA → `?utm_source=extension&activityId={id}`
- [ ] Popup connect button → `?utm_source=extension_popup&utm_medium=popup&utm_campaign=logged_out`
- [ ] Popup dashboard button → `?utm_source=extension_popup`
- [ ] Install onboarding → `?utm_source=extension_install`
