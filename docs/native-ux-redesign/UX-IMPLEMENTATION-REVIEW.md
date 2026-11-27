# Run Analytics · SwiftUI implementation and verification

[Editable design](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG) · [Prioritized backlog](UX-BACKLOG.md) · [Original scores and evidence](UX-AUDIT.md)

## Scope and design decisions

The existing native app was the starting point. This implementation retains email access, provider consent, Garmin privacy, deployment target, account approval and StoreKit verification. There is no server deployment, new subscription product, telemetry, production account mutation, build upload or App Store submission.

| Batch | Commit | What changed |
|---|---|---|
| Run | `ea3dcdd` | Semantic light/dark surfaces, clearer active time and credentials-free recording entry for a signed-in runner, pinned actions with larger targets, one-run save form lifecycle. |
| Progress | `c36c6ee` and `e9874b7` | Totals before optional recovery, 44-pt dated heatmap controls, accessible selected state, retained last-good values, correct chart scope. Explicit SwiftUI section initializer after the first build surfaced a compile error. |
| Coach | `e1df6ba` | Decode optional proposal details, show date and constraints, explicit Keep, avoid resubmitting an expired or uncertain proposal, and honor Reduce Motion for message/review scrolling. |
| Onboarding and Premium | `d257612` | Direct first-run setup action, optional provider details, one selected plan and one Apple confirmation action, StoreKit-derived price/period, recovery and restore feedback. |
| Native refinement and QA | `5164a8e` and `7e7a4a8` | Align the two recording tiles after inspecting iPad capture, clearer sign-in and Coach hierarchy, dark and accessibility-size fixture, opt-in compact simulator devices. |
| Evidence-driven fixes | `0ea4fe4` and `dcd870f` | Remove a container identifier that masked both plan buttons. Use the semantic text token where captured SwiftUI secondary text measured 3.88:1 over the recording highlight; specified replacement color pairs are 5.93:1 in Light and 6.94:1 in Dark. |

Figma refinements were made in the same file: [active recording](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-646), [workout review](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-1103), [iPad Progress](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=12-1855), and the [plan review prototype](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=6-588). Prototype review wiring was preserved as the CTA changed.

### Deliberate differences from the concept

- The moving timer is **active time**, not elapsed wall time. MapKit keeps actual runner routes; the Figma vector is an illustrative asset and never ships as location data.
- A single review can move, shorten, or change one workout to rest, or request create/settings/adjust actions. Do not draw a fabricated before/after calendar for operations where the server sends only the request and summary. Only the backend may validate, claim and mutate the proposal.
- The native calendar retains its current chronological, scrollable multi-week layout and range controls. The single week visible in Figma is not a removal of historical navigation. The iPad retains native sidebar navigation; a new persistent third column was not added.
- StoreKit controls localized price, promotional eligibility, renewal interval, pending approval, signed transaction and account delivery. Figma costs are examples, not static pricing strings. Selection is a local choice and cannot charge the account.

### Adaptive Run and Progress history

The [iPad history list](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-2170), [iPad detail](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-2295) and [compact history](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-810) informed the follow-up. The top-level navigation is unchanged. History shows a list and selected detail together when the content area is at least 720 points wide. Narrow windows and accessibility text sizes use a native drill-in stack with the same selected run. Recent runs still open directly. Run history includes supported recording sources and can load older runs; Progress keeps the separate, access-controlled 90-day coaching history.

The UI fixtures exercise the scoped histories, dark mode at the largest accessibility text size, and an expanded → 500-point → expanded width proposal with the same run selected. They do not simulate an actual Stage Manager window resize or verify VoiceOver, pointer focus, or keyboard focus.

## Before and after

| Journey | Baseline observed | Implementation target / measurable check |
|---|---|---|
| Get to Run after email setup | One setup action, placed after provider options | One action remains; no provider question before the primary CTA. Record usability time with new users; no drop-off measurement yet. |
| Start from Run | One tap on loaded Run | One tap; no additional sheet except the OS permission when required. |
| Mark a lap | One tap on the shown iPhone fixture; can scroll away with the map and other content | Still one tap at standard type size, now pinned alongside Pause even after scrolling. At accessibility sizes the Lap action remains in content so the fixed area keeps only Pause/Finish. |
| Finish safely | Finish → Save | Same two actions, clear Keep paused; test form persistence within a draft and reset between drafts on device. |
| Calendar to activity | Day → run | Same two actions; verify 44-pt targets and selected state. |
| Approve a change | Generic confirmation / dismiss | One explicit confirmation after reviewing supported data. Keeping the existing plan is a named exit with no network write. |
| Start Apple checkout | Buy button for each plan | Select → Continue. Adds one intentional choice; terms are shown before native confirmation. No conversion lift assumed. |

The original 17-category scores are retained in [UX-AUDIT.md](UX-AUDIT.md). This assessment only changes a score when repeatable runtime evidence supports the change. Unchanged, untested or qualitative surfaces do not receive a new score solely because the UI was edited.

| Evidence pair | Existing app | Updated app | Audit interpretation |
|---|---|---|---|
| iPhone recording, same fixture | `C73EC35E-C5ED-4233-8583-7A4573591D67.png` in [baseline iPhone artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15158035507) | `C0FF1064-8B88-466D-ABE0-A461BF7D571E.png` in [first implementation iPhone artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45919869463/artifacts/15163279845) | Timer now dominates and clarifies pause exclusion. Lap is adjacent to Pause, and Finish is clearly distinct. Real MapKit and the native tab bar intentionally differ from the Figma example. |
| iPad recording, same fixture | `011215FF-DB69-4E89-9DF4-0C9DF6D308C0.png` in [baseline iPad artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15157471299) | `ABF4E444-AAFC-4520-A9A1-3B9F617F1907.png` in [first implementation iPad artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45919869463/artifacts/15164333361) | Controls remain within the detail area; source data stays visible and unmodified. Unequal tile heights in this capture motivated the follow-up alignment refinement. |
| Calendar and run detail | `423DCBE8-E79F-4222-94DD-B5C948DB453F.png` in the baseline iPhone artifact | `EB52633D-9867-4238-BE44-9EBC4ECA11F6.png` in [Progress iPhone artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45920397252/artifacts/15164830836) | Readable dates and selected outline, still in the existing scrollable history rather than replacing it with one week. Native XCTest opened the expected run on both devices. |
| Provider-optional first run | Original native setup source shows Garmin and Strava before the primary action; no matched baseline screenshot | `C8C1A2A5-4050-49E3-AC99-4917C41023D2.png` in [iPhone setup](https://github.com/biserd/AIRunningTracker/actions/runs/45920729833/artifacts/15165021551), `B90126CA-CD65-4ED5-B9BC-BF5A88B065FB.png` in [iPad setup](https://github.com/biserd/AIRunningTracker/actions/runs/45920729833/artifacts/15165146351) | CTA is first, connectors are optional, and one tap reaches an enabled Start Run in both fixture tests. Refresh, sign-out and account deletion remain available below the primary flow. |

Scoped re-score: recording controls **6 → 7/10**, based on consistent pinned actions and test-checked target size on both initial devices; onboarding **6 → 7/10**, based on the verified higher CTA priority and successful provider-free setup fixture on both. Neither is a whole-app accessibility or conversion score. The other original scores remain unchanged until equivalent evidence is available.

## Verification

- Baseline: [simulator run](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339), [iPhone screenshots](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15158035507), [iPad screenshots](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15157471299).
- New runs: [Run recording](https://github.com/biserd/AIRunningTracker/actions/runs/45919869463), [Progress compile attempt](https://github.com/biserd/AIRunningTracker/actions/runs/45920169599), [Progress fix and Plan](https://github.com/biserd/AIRunningTracker/actions/runs/45920397252), [Onboarding and Premium](https://github.com/biserd/AIRunningTracker/actions/runs/45920729833). The baseline CI matrix is the reference; artifacts are synthetic simulator data.
- The first recording batch passed **67 unit tests and 12 UI tests on each** of iPhone 17 Pro and iPad Pro 13-inch (M5), iOS/iPadOS 26.2. This result does not cover later commits.
- The Progress/Plan build compiled, and the calendar/date-to-run checks passed. The plan review showed the actual date and both options; the enclosing SwiftUI identifier masked the child button identifiers in XCTest. The action identifiers were corrected independently. The [latest extended simulator run](https://github.com/biserd/AIRunningTracker/actions/runs/45922372576) is pinned to the final code revision with the contrast adjustment.
- XcodeBuildMCP is not exposed in this Windows session. Automated macOS simulator CI is a substitute for building and XCTest, not for interactive VoiceOver or actual resizable-window control. Live location, HealthKit export, Garmin OAuth, real voice/audio and purchase delivery were not exercised. Billing must be verified against a dedicated StoreKit test configuration or Apple sandbox, not a live charge. Verify locale, timezone and more device/appearance/size combinations as release checks.

Follow-up measurement, if approved: first successful run recorded or imported among verified new accounts, by platform and signup cohort; time from first Run arrival to start; purchase attempts and verified server delivery among eligible paywall views. Compare cohorts with a common window. Protect route, health and account data and do not infer an improvement from a screenshot.
