# Account-first RunAnalytics iOS

Status: local implementation on `codex/account-first-ios`, based on the native Swift/TestFlight branch at `b556a88`. Not deployed or uploaded to TestFlight. The user authorized publishing this branch and opening its draft PR on November 8.

## User flow

1. Create or sign in to a RunAnalytics account using the existing one-time email link. No external provider establishes the account identity.
2. Choose Garmin, Strava, or **Use RunAnalytics**. Connections can be added later; both providers can coexist. Returning Strava-connected/reviewer accounts retain access without repeating setup.
3. Open **Run** to record with the iPhone or view recent imported activities. Navigation is Run, Coach, Progress, Settings; Plan lives within Coach.
4. Recording and basic history/totals do not require a coaching subscription. Existing paid coaching entitlement checks and purchase verification remain in place.

## Implemented behavior

- Foreground permission request on Start, precise-location guidance, background GPS capability while recording, pause/resume, and explicit save/discard.
- Atomic, protected, account-scoped local recording files. An interrupted run recovers paused at its last saved checkpoint; time and distance while the app was terminated are not invented. Signing out pauses and retains that account's draft.
- GPS accuracy/jump/stale-fix filters, stationary-jitter suppression, and route segments across pauses or GPS gaps. Routes remain on the recording device; only summaries upload.
- Retriable, idempotent summary uploads identified by account plus UUID. Failed uploads remain on the device. No automatic export of recordings to Garmin or Strava.
- Combined Garmin/Strava/RunAnalytics history and monthly totals. Existing Garmin/Strava matching remains intact. Phone recordings stay separate: recording the same outing on phone and watch can produce two entries.
- Native Garmin connection uses authenticated initiation, explicit activity consent, PKCE, a single-use browser launch, the existing registered callback, browser-cookie/state validation, and an app callback containing no account session credential.
- Garmin health and sleep permission remains separate. This change does not feed Garmin or phone data into the AI coach. Optional coaching UI states this limitation.
- Web history can display and delete RunAnalytics summaries; account deletion cascades through their storage. The iOS account-deletion flow also clears local account files.

## Validation completed locally

- 24 backend tests pass with `node --import tsx --test server/services/phoneRuns.test.ts server/garmin/garmin.test.ts server/garmin/runningFeed.test.ts`.
- Checks cover authentication, ownership, input limits, repeated saves, conflicting duplicate IDs, deletion, account deletion, provider-independent totals, native Garmin launch replay/expiry, callback state, and existing provider matching.
- Web entry bundles successfully with esbuild.
- TypeScript reports 34 existing diagnostics on both the base and this branch. Normalized diagnostic comparison reports no new errors.
- Swift syntax was checked with tree-sitter. Its only parser error also occurs in the unchanged baseline StoreKit `if await` expression; this is not an Xcode type check.
- Added native tests for distance filtering, GPS gaps, pause accounting, durable recovery, account isolation, and the free/no-provider app flow. These have **not run**: this environment has no Xcode/iOS simulator.

## Required before release

1. Publish the review branch after approval and run the iPhone/iPad simulator workflow. It builds/tests without signing and validates that the generated Info.plist contains both audio and location background modes. There is no deployment or TestFlight upload in that workflow.
2. Apply additive D1 migration `apps/d1-migration/migrations/0042_account_first_ios.sql` before deploying the server. It creates `phone_runs` and `native_garmin_sessions`; then apply `0043_phone_run_details.sql` for optional effort, notes, splits, laps, and average heart rate. Existing Garmin callbacks also expect the native session table.
3. Verify the configured production Garmin account, callback, and permissions in the actual iPhone browser flow. No new registered Garmin callback is required.
4. Test on an iPhone outdoors: screen locked, app backgrounded, pause/resume, GPS loss, denied/approximate location, force-quit/relaunch, offline save, upload retry, sign-out/account switch, and exhausted storage. Check the measured distance against a known route.
5. Update the app's privacy disclosures and release notes for recording location and storing run summaries. Location access is requested only when starting a phone recording.

The server migration, deployment, physical-device validation, and App Store release are not performed by this change.

## Native recording features added November 8

- Live MapKit route and user location during recording, GPS accuracy/weak-signal status, recent pace, average pace, and current manual-lap pace.
- User-selectable kilometre/mile units, interpolated automatic splits including the final partial split, and manual laps. Splits are visible during recording and in the saved detail view.
- Optional 1–10 effort and notes collected in the save form; bounded metadata is persisted account-side and returned in history. Raw sensor samples and GPS locations are not uploaded to RunAnalytics.
- Optional audio announcements at distance milestones and manual laps, with haptic feedback. Audio ducks other playback and releases the audio session after speech. Actual audio routing and haptic behavior while locked require physical-device tests.
- Bluetooth SIG heart-rate sensor discovery and user-selected pairing, 8-/16-bit measurement decoding, contact-loss checks, stale-value clearing, disconnect handling, and recording of samples only during an active run. Standard BLE heart-rate broadcasting is required; connecting a Garmin account does not provide a live sensor feed. A dedicated Apple Watch app is not part of this change.
- Explicit Apple Health export of the workout and available sensor samples, with separately chosen GPS route export. Stable sync metadata supports repeat exports, and segmented routes do not invent locations across pauses. Export errors leave the local recording intact. This is workout saving; importing general health/sleep data is not implemented here.
- ActivityKit statistics with a WidgetKit extension for Lock Screen and Dynamic Island: distance, recorded running time, average pace, and recording/paused state. Updates are throttled to five seconds and become stale after thirty seconds without updates. Controls open the app; there are no background pause/finish buttons.
- Added HealthKit entitlement, permission descriptions, Bluetooth background mode, shared activity attributes, and the embedded widget target. The Apple developer App ID/provisioning profiles must support HealthKit and the widget before signing a release.

Local validation: all 24 backend tests pass, with additional assertions for detail validation, idempotency, ownership, and effort/notes/split round trips. Web bundling passes. TypeScript still has the same 34 baseline diagnostics. Swift syntax parsing and YAML/plist structural checks pass; they do not replace an Xcode build. New native tests cover split interpolation, manual-lap differences, older-record decoding, BLE measurement formats/contact loss, and reachability of the recording display/save form. These native tests have not run in this Linux environment.

Before release, build both app and widget in Xcode and test each feature on an iPhone, including Bluetooth loss/reconnect, app backgrounding, Live Activity expiry, Health permission denial, repeated exports, audio interruptions, GPS gaps, and offline sync. GitHub publishing and the draft PR were authorized on November 8. Deployment and release remain separate steps.
