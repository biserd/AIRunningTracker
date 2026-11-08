# Account-first RunAnalytics iOS

PR #1 is merged into `codex/ios-testflight` at `be7fd84bf2c7c970a6b6a1585afa824c6d2ef540`; UX follow-up PR #2 is merged at `7fc77eae0e9c05dddf29d28053314e0a980aad13`. Both remained draft until their required checks passed on November 8, 2026. The production backend remains active on container version 60. TestFlight version 1.0 build 40 is processed and available to the existing AITracker Internal group (four testers), released from `a168542`. The existing app identifier, App Store Connect listing, accounts, distribution certificate and backend are retained. No App Store production submission was made.

## User flow

1. Sign in to a RunAnalytics account using the existing one-time email link.
2. Choose Garmin, Strava, or **Use RunAnalytics**. Connections can be added later and can coexist. Existing connected/reviewer accounts retain access.
3. Use **Run** to record on the iPhone or view combined activity history. Navigation is Run, Coach (including Plan), Progress, Settings.
4. Recording, basic history and totals do not require a coaching subscription. Coaching keeps its existing entitlement checks and supported-data boundaries.

## Recording and privacy

- Starting a run requests foreground precise-location permission. Location continues while recording in the background or with the screen locked. Pause, finish, discard and sign-out stop location updates. Force-quitting stops recording; a protected, account-scoped draft recovers paused at its last checkpoint.
- GPS accuracy, stale-fix, jump and stationary-jitter filters protect distance calculations. Route segments separate pauses and GPS gaps. A persisted recording/resume timestamp rejects cached positions from before the current segment.
- Live MapKit routes, GPS accuracy/status, recent/average/current-lap pace, kilometre/mile units, interpolated automatic splits and manual laps are available while recording. The final partial split is retained.
- The save form accepts optional 1–10 effort and notes. Summaries upload with an account-scoped UUID and safe retries. Only name, date, distance, running/elapsed time and optional effort, notes, splits, laps and average sensor heart rate upload privately to Cloudflare. Raw routes and individual sensor samples stay on the recording device. Phone data is not sent to AI, messaging services, Garmin or Strava.
- Local files are atomic and protected. Interrupted uploads remain available for retry. Sign-out retains that account's paused draft; account deletion clears local account files and cascades server summaries.
- Optional Bluetooth SIG heart-rate sensors require user-selected pairing and standard BLE broadcasting. Decoding supports 8-/16-bit values and contact-loss checks, clears stale values, and records only during an active run. Garmin account linking does not provide a live heart-rate sensor feed. A dedicated Apple Watch app is not included.
- Optional audio distance/lap announcements duck other audio; haptic feedback accompanies milestones and pause. Health export is explicit and can separately include the route. Stable metadata supports repeat exports; segments do not invent locations across pauses. Errors retain the local recording.
- ActivityKit/WidgetKit shows distance, running time, pace and recording/paused status on Lock Screen/Dynamic Island. Updates are throttled to five seconds and stale after thirty seconds. Controls open the app.
- Public and native privacy notices describe recording, background location, sensor samples, Cloudflare summaries, Apple map services, optional Apple Health, Live Activities, retention and deletion.

## Activity sources and native Garmin

- Combined history and monthly totals include Garmin, Strava and RunAnalytics summaries. Clear Garmin/Strava matches count once; uncertain overlaps remain separate. A separate phone recording of the same outing remains separate.
- Web history can display and delete phone summaries. Native history retains an account-scoped offline cache. A serial refresh queue schedules a trailing upload/read when a save arrives during an in-flight refresh and retains account-generation checks.
- Native Garmin linking requires authenticated initiation and explicit activity consent. PKCE, one-use browser launch, the registered callback, browser-cookie/state validation and an app callback without session credentials remain enforced. Health/sleep permission is separate. No new Garmin callback registration is required.

## Review fixes

- HealthKit sample attachment awaits its completion callback and propagates an error or a false result.
- Recording/resume boundaries reject pre-resume cached GPS fixes and remain compatible with older saved recordings.
- History reads, pagination and uploads use a serial queue with a coalesced follow-up, preventing a save during refresh from losing its upload trigger.
- Garmin FIT session end fallback validates optional elapsed time before calculating an end timestamp; missing/malformed timing is rejected.
- Native UI tests follow Progress into coach insights and expand the iPad sidebar through landscape layout before navigation.

## Account-first verification (build 38)

- Required PR checks passed on `6beccb3`, whose tree exactly matches merge commit `be7fd84`: account-first storage, Cloudflare migration safety, iPhone, iPad.
- Each device passed 62 native unit tests and 8 UI tests. Checks also verify recording background modes and the embedded Run Widget. Screenshots cover standalone Run home, live route/metrics, the effort/notes form and insights navigation.
- Local checks passed: 64 backend/Garmin tests, 38 Worker tests, 37 D1 tests, 6 signing/processing tests, 6 iOS public-page tests, all three Cloudflare type checks, Worker dry-run, Vite build and D1 application build.
- Repository-wide TypeScript still reports the same 34 baseline diagnostics. This release introduces no new diagnostics; those pre-existing errors are outside this fix.
- Production checks passed after rollout: application health; recording/native Garmin authentication and invalid-launch rejection; published recording privacy; combined dashboard/activity and detail assets; Garmin activity, recovery, detailed-data consent and webhook protection; training/course send protection; source pages; WhatsApp settings; signup reminders; public tools. These anonymous checks do not read private health data, create a sample run or send a workout/course.

## Backend release

- Applied only additive D1 migrations `0042_account_first_ios.sql` and `0043_phone_run_details.sql`, then verified their journal records, both tables and `phone_runs.metadata`. Existing Garmin callbacks and the combined feed need these tables before server deployment.
- Cloudflare source build `8d0233bf-3d39-4c79-a16f-1577c7289e5b` succeeded for `be7fd84`; staging Worker version `00e22195-d416-4389-934d-2aefa62b3073`.
- Production Worker version `2bec872b-35d6-46aa-8baa-81245d7f0e3b`, container version 60, immutable image `sha256:b2f087c4f915574ce008fa2c09a37c0d4616e4af9da1aa27e0b036594b6dd697` verified active and healthy. Stable Durable Object identity, restart guard and existing runtime settings were retained.

## TestFlight

- Existing main app: `run.aitracker.coach`, Apple team `DB5JRGGB6A`, App Store Connect app `6813680941`. The separate identifier `run.aitracker.coach.runwidget` is only the embedded Lock Screen/Dynamic Island extension, not a second main app or listing.
- The existing TestFlight workflow and signing certificate remain in use. Build 35 passed simulator tests and stopped on an unsupported capability-list parameter; build 36 corrected that request, then stopped because the API key could not enable HealthKit. Neither uploaded. Build 37 then exposed a validator assumption: Apple encodes the associated-domains allowance as a wildcard string. The corrected validator accepts the valid wildcard and still rejects unrelated domains; both downloaded Apple profiles passed validation locally and in CI.
- CI now reuses the existing `IOS_PROVISIONING_PROFILE`, distribution P12/password and App Store Connect key, plus one `IOS_WIDGET_PROVISIONING_PROFILE` for the extension. It validates exact app/team identifiers, certificate fingerprints, expiry, App Store distribution type and required entitlements before archiving. CI does not create identifiers, change capabilities, or generate/revoke profiles or certificates. Credentials stay in trusted runner secrets/temporary files with cleanup.
- Registered the widget identifier and generated its App Store profile using the existing distribution certificate. Verified the downloaded profile and stored it in the existing repository CI secrets.
- The user approved proceeding on November 8. Enabled HealthKit on the existing main App ID, regenerated the existing `AITrackerRunning TestFlight` profile with its original distribution certificate, verified the profile identifiers, expiry, HealthKit, production push, associated domains and certificate fingerprint, and updated the existing `IOS_PROVISIONING_PROFILE` secret. App Store Connect key permissions remain unchanged.
- Final release tag `ios-testflight-20261108-existing-signing` uses `7f2c867`. Both iPhone and iPad checks passed on this commit: https://github.com/biserd/AIRunningTracker/actions/runs/42511607349. Build 38 passed signing, simulator tests, archive/export, the encryption declaration check and upload: https://github.com/biserd/AIRunningTracker/actions/runs/42511617763
- Upload targets TestFlight only. The workflow verifies Apple's processing state before reporting the build ready. Final upload/processing result: build 38 uploaded without errors at 18:53 UTC on November 8; Apple reported `VALID` at 19:02 UTC. App Store Connect build ID `cff361f6-df3f-4604-a0a2-0e4c66792717`. The release workflow and temporary credential cleanup succeeded. Saved beta testing notes and added the existing AITracker Internal group (four testers). External testing/App Store review were not submitted.

## Simplified UX update (build 40)

- Recording has explicit large lap/save buttons and pinned Pause/Resume and Finish controls. Sensor pairing and audio cues are in Run settings; no disconnect action is shown until a sensor has been selected. Discard is in the recording menu with confirmation. The tab bar stays visible without the duplicate coach accessory.
- Recording and history use the existing saved account distance preference from the run feed, cached per account for offline use. A first run waits for profile units to load; ongoing runs keep their original units. There is no separate phone unit picker. Account switching and deletion reset the published unit state.
- Coach has one voice entry point, a short briefing with Read summary, and a Daily check-in button opening the existing check-in controls.
- Final iPhone 17 Pro and iPad Pro 13-inch (M5) checks passed on iOS 26.2: 63 unit tests and 10 UI tests each. Screenshots were reviewed. The tested `9814383` tree exactly matches merge `7fc77ea`: https://github.com/biserd/AIRunningTracker/actions/runs/42517737369. CI selects the newest installed simulator runtime. UI queries account for labeled values and iOS 26 nested confirmation-button accessibility.
- Release tag `ios-testflight-20261108-run-ux-checked` uses `a168542`, a workflow-diagnostics-only follow-up with identical iOS source. Build 39 stopped during simulator tests before upload and did not retain failure details. Build 40's first attempt was cancelled after signing setup stalled; a fresh runner passed signing, all 63 unit and 10 UI release tests, archive/export, encryption verification and upload. The release workflow now retains failed simulator results and full test output.
- Build 40 uploaded without errors at 20:51 UTC on November 8; Apple reported `VALID` at 20:53 UTC. Build ID `f01e6f06-cab0-410a-ab37-13ded70fcdab`. Workflow and temporary credential cleanup succeeded: https://github.com/biserd/AIRunningTracker/actions/runs/42520332860. Saved beta notes and added the same AITracker Internal group (four testers). External testing and App Store review were not submitted. This update did not deploy backend changes.

## Device testing

Install the beta and check an outdoor run against a known distance, locked/background recording, pause/resume, denied/approximate location, GPS loss, force-quit/relaunch, offline save and reconnect, upload retry, account switching and exhausted storage. Verify Bluetooth loss/reconnection, audio interruptions, haptics, Apple Health denial/repeated export and Live Activity expiry on actual hardware. Simulator and anonymous production checks do not establish those hardware behaviors or complete a real native Garmin browser authorization.
