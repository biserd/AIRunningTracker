# Run Analytics · Native UX audit

[Editable Figma design](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG) · [Redesign](UX-REDESIGN.md) · [Design system](DESIGN-SYSTEM.md) · [Implementation plan](IMPLEMENTATION-PLAN.md) · [Implementation findings](UX-IMPLEMENTATION-REVIEW.md)

## Scope and evidence

Run Analytics serves runners who want to record or import a run, understand the effort, and decide what to do next. Free recording and basic history are valuable without a wearable; optional Apple Premium unlocks eligible voice/chat coaching, plan and analytical capabilities. Strava provides supported history-based coach context; direct Garmin activities and health summaries are deliberately not used as AI inputs. No retention, revenue or user-research dataset was provided for this design review.

The native interface is under `apps/ios`, not the React web dashboard or Expo app. The source baseline is commit `55d389a` with native changes through `f2c5b71`; local speaker controls are uncommitted and are not evidence of the shipping UI. Looked at SwiftUI navigation and state owners, web authentication/entitlement boundaries as called by the app, recorder persistence, provider and OS permission flows, notifications, Apple purchase handling, widget integration, and XCUITests. Not a line-by-line review of unrelated web, content or billing infrastructure.

### Simulator baseline

[macOS CI run and logs](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339) · Xcode 26.3 (17C529) · iOS/iPadOS 26.2 · commit `55d389a`. XcodeBuildMCP and an interactive Mac were not connected to this Windows workspace. The authorized simulator workflow built without signing and ran against synthetic fixtures.

| Simulator | Passed | Evidence |
|---|---|---|
| iPhone 17 Pro | 67 unit + 11 UI tests, zero failures | [16 portrait screenshots and manifest](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15158035507) |
| iPad Pro 13-inch (M5) | 67 unit + 11 UI tests, zero failures | [16 portrait screenshots and manifest](https://github.com/biserd/AIRunningTracker/actions/runs/45902945339/artifacts/15157471299) |

Both screenshot sets cover Run, recording, route, save, run settings, Garmin delivery and recovery, Coach and check-in, mileage, Insights, calendar and linked run detail. Use the artifact manifest to identify each PNG. The automated rotation/draft test ran, but the exported shots are portrait. iPhone is declared portrait-only in `project.yml:37`; iPad declares four orientations. Baseline dark, full landscape, resized-window, assistive technology, and complete auth/Plan/Settings/Premium capture sets were not collected. GPS, audio and purchases were not exercised on hardware. Figma artwork is proposal evidence, not app runtime evidence.

| Baseline screenshot from the archives | Visible finding | Editable proposal |
|---|---|---|
| iPhone `C73EC35E-C5ED-4233-8583-7A4573591D67.png` · recording | Existing metrics and pinned controls are a good foundation. Simplify the action hierarchy and group Pause/Lap separately from Finish; do not remove the route or device options. | [Recording](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-646) |
| iPad `6373FBA9-BD21-4D89-B376-A63DA51AEA90.png` · Coach | Existing voice CTA is singular and prominent. Summary and check-in stretch across one content column; the text composer is far from them. Make selected conversation and task context persistent at wider sizes. | [Coach on iPad](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-2420) |
| iPhone `04656062-2283-46E9-B9E9-C28A651BD537.png` · Progress | Weekly/monthly ranges already exist. Keep them; make the data scope visible and the route from a day to a run easier to scan. | [Progress in dark appearance](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-4107) |

## Scorecard

1 = blocked or seriously impaired; 5 = usable with notable friction; 10 = fully evidenced, exceptionally clear. Scores are expert ratings, not measured outcomes. Static-only accessibility checks are provisional.

| Dimension | Score / 10 | Evidence and meaning | Priority / effort |
|---|---:|---|---|
| Visual design | 7 | System controls and `RunBrand` anchor identity; gradients and repeated glass surfaces in `LiquidGlass.swift` compete with content. | P2 / M |
| Information architecture | 6 | Five clear destinations, but `AllSourceProgress` and `RunningProgressView` serve different scopes under “Progress.” | P1 / M |
| Navigation/discovery | 7 | Run is the default; tabs and split view share section selection. Three-column list/detail context is not modeled. | P1 / M |
| Onboarding | 6 | Passwordless sign-in, recovery and an optional provider path exist; new runners must interpret account steps before a clear first-run payoff. `SignInView`, `NativeOnboardingView`. | P1 / M |
| Core journeys | 7 | Start, pause, finish and offline persistence exist. The log, map, laps and settings share the recording surface. `RunHome.swift:82–199`. | P0 / M |
| Cognitive load | 6 | Coach has chat, voice, check-in, briefing and review affordances. Different states compete on the main conversation view. `AITrackerApp.swift:222–348`. | P1 / M |
| Typography/hierarchy | 7 | SwiftUI text roles are common, but live metrics, action hierarchy and source details need more consistent alignment and emphasis. | P1 / S |
| Colour/spacing | 7 | Semantic canvas and teal/blue dark variants exist; static orange and repeated padding/radius values merit contrast and consistency checks. `SignInView.swift:12–18`. | P2 / M |
| Controls | 6 | Settings rows explicitly reach 44 pt; run toolbar labels use 32 pt frames before styling. Actual hit region and glove use require testing. `RunHome.swift:155–169`, `AITrackerApp.swift:455–463`. | P0 / S |
| Accessibility/readability | 6 | Labels, IDs and Mute states exist. No comprehensive VoiceOver, increased contrast or largest-type runtime evidence for this design. | P0 / L |
| Loading/empty/error/success | 6 | Real Retry, Preparing, waiting for GPS, and pending sync exist. State patterns and non-loss feedback are inconsistent across flows. | P1 / M |
| Perceived performance | 6 | Dashboard refresh and detail hydration are explicit; preserve old content and show data freshness rather than clearing the whole view. No latency measured. | P1 / M |
| iPhone/iPad adaptability | 7 | Rule uses horizontal size class; rotation/draft CI test exists. Expanded content still often uses a single column. Narrow iPad usability and pointer/keyboard behavior need evidence. | P1 / L |
| Engagement/retention | 6 | Daily check-in, recap and reminders exist. The next useful action is not prioritized in every empty and returning state. No retention lift measured. | P1 / M |
| Subscription/conversion | 6 | StoreKit plans, eligibility, restore and pending feedback exist. Two immediate purchase CTAs compete; model selection before confirmation, with clear renewal terms. | P1 / M |
| Trust/privacy/credibility | 8 | App explicitly distinguishes on-device GPS, Apple Health export, Garmin health, and account data. Make these boundaries visible at the action and preserve them. | P0 / M |
| HIG fit | 7 | Native `NavigationStack`, lists, sheets and SwiftUI Material fallbacks. Better distinguish chrome from data, adapt to width and reduce motion where appropriate. | P1 / M |

## Priority decisions

- P0: do not lose a recording, change a plan unexpectedly, hide a privacy boundary, or visually exclude someone. Design recording action targets, keep-paused and sync outcomes first. Plan review shows old vs. new and can explicitly keep the original. Separate health permission, route export and account deletion.
- P1: guide a new runner to Run without an integration; fold secondary coach tasks behind labeled rows; show source and freshness near the data; use real sidebar/list/detail on iPad; make Premium an informed choice, not an onboarding requirement.
- P2: unify semantic surfaces, status messages and typed metrics; reduce decorative effects; validate charts and calendar against assistive technologies.

## External patterns, not copied screens

- [Apple HIG: layout](https://developer.apple.com/design/human-interface-guidelines/layout), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars): keep consistent destinations, let the window determine composition, and give text room to reflow. Use material for interactive chrome, not metric surfaces.
- [Runna](https://www.runna.com/) and [Runna watch workflow](https://support.runna.com/en/articles/6306200-how-to-use-your-apple-watch-with-runna) foreground a goal, then expose the next executable workout. Borrow sequencing, not the account questions, visual style or watch dependency.
- [Strava activity ingestion](https://support.strava.com/en-us/articles/15402066-how-do-i-get-my-activities-to-strava) and [pace calculation](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations) distinguish acquisition paths and moving-time semantics. Label source and elapsed/moving pace explicitly.
- Differentiation: record free without a provider, see a sourced explanation for the next step, and confirm changes explicitly. Private Garmin recovery stays useful on iPad without implying it informed AI guidance.
