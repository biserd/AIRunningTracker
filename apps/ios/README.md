# AITracker iOS: first native client

SwiftUI app for the existing coach backend. No new APIs, database, provider secrets,
subscription or server permissions. Existing `apps/mobile` (Expo/classic UI) is
left untouched. The first simulator build and contract tests passed on GitHub's
macOS runner. Device validation remains required before public release.

## TestFlight cloud builds (no local Mac required)

Work is isolated on `codex/ios-testflight`. The `iOS simulator check` workflow runs
on app changes. The `iOS TestFlight upload` workflow runs only when an
`ios-testflight-*` tag is explicitly pushed. It tests first, signs using encrypted
repository secrets, then uploads an internal-only TestFlight build. It never
submits an App Store release or deploys either website. Build numbers use the
release workflow's increasing run number; use a new tag for a new upload.

Apple team: `DB5JRGGB6A`; bundle: `run.aitracker.coach`; App Store ID: `6813680941`.
Signing secrets: `IOS_DISTRIBUTION_P12`, `IOS_DISTRIBUTION_PASSWORD`,
`IOS_PROVISIONING_PROFILE`, and the three `APP_STORE_CONNECT_*` secrets.
Private keys and profiles must never be committed. The runner removes temporary
credentials even when a build fails. Provisioning expires September 18, 2027.

## Run on a Mac

1. Install Xcode with iOS 17+ SDK support and XcodeGen (`brew install xcodegen`).
2. From `apps/ios`, run `swift scripts/prepare-icon.swift ../mobile/assets/icon.png Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png`,
   then `xcodegen generate` and open `AITracker.xcodeproj`.
3. Select your Apple development team under Signing & Capabilities. Confirm that
   `run.aitracker.coach` is available in your account, or change it in project.yml.
4. Choose an iPhone simulator and run the AITracker scheme. Test microphone and
   WhatsApp on an actual device before TestFlight distribution.
5. Run Product > Test. Archive/upload only after the device checklist below passes.

No Apple credentials or OpenAI/Twilio secrets belong in this app or repository.
The generated Xcode project is ignored; project.yml is the source of truth.

## Implemented

- Native Coach, Schedule and Settings tabs, Dynamic Type, orange primary actions.
- Existing email/password sign-in; Keychain session persistence, device-local logout.
- Existing email-link request/verification with a manual paste flow for this build.
  Copy the email link WITHOUT opening it first, since it is single use.
- Native real-account schedule, chat history, thinking state and message submission.
- Native plan and reminder reviews with explicit server confirmation. Existing
  entitlement and test-runner write restrictions remain authoritative.
- Reminder list and WhatsApp connection status.
- Voice and connection setup reuse the working website inside an isolated,
  authenticated WKWebView sheet. They are **not yet native voice/setup screens**.
  The voice sheet currently shows the web Coach page: tap Talk to your coach there.
  Microphone access requires user permission and is denied to other origins.
  Closing/backgrounding ends the voice session; it is not background audio.

## API audit: reuse, not replacement

| Existing route on new.aitracker.run | iOS use |
| --- | --- |
| POST /api/account/login | Existing account password sign-in |
| POST /api/account/email, /api/account/verify | Existing magic-link flow |
| POST /api/account/logout | Existing cookie logout, plus local Keychain removal |
| GET /api/state | Runner, entitlement and current week |
| GET /api/ai/status | Existing shared chat history |
| POST /api/ai/chat | Same coach, tools, context and guardrails |
| POST /api/ai/plan-confirm | Explicit reviewed plan write |
| GET /api/reminders, POST /api/reminders/confirm | Existing reminders/reviews |
| GET /api/whatsapp | Connection status |
| POST /api/ai/voice, /api/ai/voice/stop | Reused by the existing web voice surface |

The API accepts a secure host-only account cookie, not an additional mobile token
scheme. URLSession uses ephemeral storage; only the account cookie is persisted in
Keychain (WhenUnlockedThisDeviceOnly). API redirects are rejected. Web flows use
nonpersistent storage and a cookie scoped to new.aitracker.run. Existing Origin
checks remain enabled. The app supplies Origin on native POSTs, which does not
replace account authentication or server authorization.

## Known gaps before public release

- Cloud simulator compilation/tests pass; actual-device WebKit and microphone
  validation is still required.
- Native WebRTC voice controls and native WhatsApp/email setup are later work;
  the first version deliberately reuses the validated web flows.
- Automatic email-link opening needs Apple Team ID + Associated Domains/AASA
  setup. Manual paste is temporary, not the final onboarding experience.
- Existing logout does not revoke a stolen server token. Mobile refresh/revocation
  requirements need a separate backend security review before public distribution.
- APNs device registration/delivery is not implemented. No push permission is
  requested and no notification claim is made. Existing email/WhatsApp still work.
- Current-week schedule only. Full plans remain accessible to the coach.
- Chat endpoint returns one JSON answer, not streaming text. The app shows a
  thinking indicator and does not simulate streaming.
- Account deletion, privacy disclosures/manifests, App Store subscription policy,
  screenshots and public-release preparation remain outstanding.

## Required device checks

Use a dedicated runner account. These calls use live data, so approve plan or
reminder changes only when intended.

1. Password login, cold restart, expired session, sign out, then a second account.
   No data from the previous runner may remain visible.
2. Single-use email-link verification; expired/reused/wrong-host link rejection.
3. Chat success, timeout, offline, entitlement denied, no automatic POST retries.
4. Plan/reminder preview does not write; confirm writes only the intended action.
5. Voice permission denied/granted, interruption, background, sheet dismissal.
   Check provider finalization and microphone indicator after leaving.
6. WhatsApp OAuth return and wa.me link; email verification; refresh after dismissal.
7. Dynamic Type, VoiceOver, dark mode, keyboard and smaller iPhone layouts.

No deployment to either website is required by these changes.
