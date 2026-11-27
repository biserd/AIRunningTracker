# Run Analytics · SwiftUI implementation plan

[Editable Figma handoff](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-11) · [UX audit](UX-AUDIT.md) · [Screen specifications](UX-REDESIGN.md) · [Component map](DESIGN-SYSTEM.md)

This is the original design-phase plan. See the [prioritized implementation backlog](UX-BACKLOG.md) and [actual verification](UX-IMPLEMENTATION-REVIEW.md) for decisions and status from the subsequent coding phase.

## Boundaries

Design only: do not ship screens, change production data or enable experimental measurement during this work. Native target remains iOS/iPadOS 17+. Confirm any new APIs are behind availability guards; Apple frameworks, local storage, backend contracts, deep links, and supported provider/entitlement decisions remain authoritative. No new threshold, pricing or health score derived in the UI. Preserve shortcuts, paths, analytics, calendar selection, reminders and draft ownership. The user-facing speaker route design includes the uncommitted speaker proposal; verify routing on a real device before claiming it ships.

## Phased delivery

Complexity is relative engineering effort, not committed estimates. Staging each phase keeps regressions diagnosable.

| Phase | Code touchpoint in a later implementation | Acceptance check | Complexity |
|---|---|---|---|
| 0 · Baseline and fixtures | Existing simulator matrix, injected fixture store, native test selectors | Record current shortest paths and visible/loading/recovery states. Capture test-device model, OS, appearance, orientation, actual window size and type size. Never use live runner data. | M |
| 1 · Foundation and shell | Extract tokens from `RunBrand`/LiquidGlass. New `RunStatusNotice`, action/layout helpers and semantic `RunMetricTile`; adapt `CoachTabs` | Native tabs/toolbar/sidebar, iOS 17 fallback and 26+ glass on controls. Selection, deep links, voice and active recording survive resize; tab labels and focus order are clear. | L |
| 2 · Run and local persistence | `RunHome`, `PhoneRunRecorder`, `RunRefreshQueue`, `RunDeviceFeatures`, `NativeRunSummary`, widget | One Start on loaded Run. Preserve GPS denial, pause/resume, finish/keep paused, explicit discard, manual lap, HR sensor, route privacy, Apple Health export. No duplicate save. Background, offline and process recovery keep state within current guarantees. | L |
| 3 · Coach and Plan | `ChatView`, `NativeVoiceControls`, `ChatReviewCards`, `ScheduleView`, briefing/reminder screens | One voice entry with connection/error copy and visible audio route; text draft and latest conversation survive resize. Diff lists all affected days before save; rejected or canceled edit leaves plan intact; show explicit success. | L |
| 4 · Progress, history and trust | `AllSourceProgress`, `RunningProgressView`, `MileageProgressCard`, `ActivityContributionCard`, `NativeGarminRecoveryView`, `RunDetailView` | Date, scope, units and source are visible. Week-to-detail is equivalent on narrow and expanded windows. Chart works with VoiceOver; empty/offline/missing data don't invent zeroes. Garmin is excluded from AI and preserving existing source attribution/dedup is mandatory. | L |
| 5 · Account, activation and Premium | `SignInView`, `NativeOnboardingView`, `NativePaywall`, `AppleSubscriptions`, `SettingsView`, Apple push and channels | Match existing signup and consent. No provider requirement for recording or upsell requirement for free flow. StoreKit controls localized prices, eligibility, confirm and restore. Error, pending and cancellation never grant entitlement or charge twice. Preserve deletion, recovery and sign-out. | M–L |
| 6 · Accessibility, rollout and measurement | UI test matrix, performance signposts in a later implementation, staged release | P0 cases clear before tester release. Compare screenshot and task outcomes with baseline; add no telemetry until reviewed for purpose and privacy. | L |

## Navigation and state ownership

Use one route enum per compact stack and a higher-level selected `CoachSection`; store selection and keyed paths above the size switch. Use `NavigationSplitView` and platform-native collapse when available. The store owns auth, run, plan and voice state. The view owns presentation, not recording duration, query pagination, entitlement or billing state. Add a dedicated navigation scope for route selection, not separate stores per column; defer keyboard focus until destination settles. Cmd+1–5 on iPad optional; don't steal keyboard navigation from text input. Support pointer highlight, Full Keyboard Access and optional Pencil scrolling, without adding a Pencil-only task.

Use scoped loading overlays with concise labels. Keep old values when retrying, with last updated text and a banner if stale. Don't clear pending data on tab switch or safe area changes. Add explicit confirmations and accessibility focus for externally triggered trust changes; use one modal presentation at a time.

## Verification matrix

- **Simulator matrix:** smallest supported phone fixture and current reference iPhone in portrait; iPad full portrait, full landscape and narrow resized window. Repeat main screens in light and dark. Current iPhone target does not declare landscape; orientation support expansion requires separate product/QA approval rather than silently changing an Info.plist setting.
- **Accessibility matrix:** standard and largest Dynamic Type, Larger Text stack layout, Increase Contrast, Reduce Transparency, VoiceOver, Switch/keyboard focus, Reduce Motion with animations disabled. Check separately from screenshots. Read actual chart labels and selections and recorder time/distance/pace, then check non-color state cue and 44-pt targets.
- **Existing tests:** `StandaloneTests` free run/recording/baseline units, `AdaptiveLayoutTests` shared draft/rotation, `InsightLayoutTests` calendar and native detail, `SignInTests`, `SignOutTests`, unit suites for recorder, StoreKit/API model and provider state. Preserve stable identifiers; add targeted tests for flow changes with deterministic fixture access.
- **New cases after implementation:** link expires/resend with draft; GPS denied/settings/return; record across background and narrow resize; pause/resume/finish/save offline/sync retry; iPad click chart day opens right run; Coach mute/route/timeout and no lost message; review diff correct before and after API response; privacy/export defaults off; Premium eligible/ineligible, restore/pending/network cancel and no duplicate charge. No live Apple purchase needed for normal simulator checks.
- **Physical checks:** GPS accuracy, Bluetooth and built-in audio routing, HFP, interruptions and app-background behavior on hardware; VoiceOver rotor, keyboard/pointer and actual iPad window resizing. Do not use TestFlight or signing pipeline as a substitute for simulator QA.

Evidence should include macOS/Xcode/iOS versions, fixture parameters, tests passed or blocked and baseline/new captures side by side. Keep a rollout pause if there is data loss, changed entitlements, an Apple payment mismatch or new P0 accessibility issue. Improvement hypotheses are documented in the strategy; no conversion, retention or latency lift is guaranteed.
