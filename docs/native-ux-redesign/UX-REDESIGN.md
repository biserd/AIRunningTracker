# Run Analytics · UX redesign

[Editable Figma file](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG) · [iPhone screens](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-6) · [iPad screens](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-7) · [Prototype flows](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-9)

## Direction

**Run → understand → decide.** Put the next meaningful action near the top, expose its prerequisites at the point of use, and keep the evidence available. Keep recording and review dependable even when data is missing. Preserve all existing routes, features, integrations, settings and authorizations. Sample activity, map, plan, prices and conversations in Figma are illustrative, not customer data or live availability.

| Concept | Approach | Strength | Tradeoff | Decision |
|---|---|---|---|---|
| A · Premium Apple Native | System hierarchy, restrained amber/teal accents, strong type, split views and native sheets | Familiar interaction and accessible translation; metrics feel more legible | Less visual branding than B | Use as the base |
| B · Modern Product-Led | Orange brand rule and a large stats-first anchor | Distinctive and useful to returning analytical runners | Adds competition at the moment someone wants to start a run | Keep one meaningful visual signal at a time |
| C · Simplified & Functional | Minimal chrome, one obvious job and a quick action | Lowest scanning cost; good compact and accessibility-size pattern | Less room for coaching context at a glance | Use its action hierarchy and state copy |

These are expert judgments, not user preference data. See [the editable explorations](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-4).

## Navigation and journeys

Retain **Run · Coach · Plan · Progress · Settings**. Keep a single route identity and separate selection/path per destination. Compact uses tabs plus native pushes; expanded uses a sidebar with a run/conversation/workout list and a detail column where content fits. Put single-purpose views like Settings, consent and account management in one focused column. When resizing, preserve selected item, recording, input draft and playback. Don't move a runner away from a task just because the window changed.

The design includes 58 iPhone frames, 23 iPad frames, and 12 dark appearance specimens, separate from concept and prototype frames. Compare [iPad landscape with contextual list](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-2860), [portrait with a single sidebar](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=12-1855), and [a narrow iPad window](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=4-3679). Choose composition by available width and text needs, not orientation alone.

| User journey | Start → decision → result | Safeguards and recovery |
|---|---|---|
| First run | Welcome → email link → Run now or optional sources → Start run | Existing accounts sign in; expired/reused link requests a fresh one; preserve email; existing terms, opt-in choices, reviewer gate and account deletion remain |
| Record, pause and save | Start → location only when necessary → recording → Finish → save → summary | One tap to pause or resume; explicit discard; persisted draft; no duplicate save; offline notice plus retry; route stays on device; Apple Health export separate |
| Run review | Run or Progress calendar → run row → details → optional coach recap | Share correct source and supported fields; activity is navigable before enrichment; distinguish not captured, preparing and failed |
| Coach and plan | Coach → voice or chat → suggestion → before/after diff → apply or keep original → Plan | No mutation before approval; show the affected plan/session, dates and units; revalidate conflicts and entitlements; keep draft on failure |
| Progress | weekly totals and trend → calendar/run; All Runs → source-specific breakdown | Distinguish all-source trends from Strava Score; show age, coverage and confidence; leave unknown values blank; Garmin health stays private |
| Premium | From a paid action or Settings → compare StoreKit options → choose one → Apple confirmation → verified access | Explicit terms, no default charged plan, eligibility from StoreKit, Not now, Restore, Pending, Cancel, Error and confirmed success |
| Privacy & preferences | Settings → account, connections, coaching alerts or channels → review change | Real permissions at time of action; no copying health to AI, no exported route by default; destructive confirmation; preserve service-specific retention semantics |

## Screen specifications

| Surface | Compact design | Expanded design / critical states |
|---|---|---|
| Welcome, auth and first run | Primary create account, second sign-in; email, verification, clear next choice | Center readable form, same tab routes after completion; expires, resend, paste, wrong link and failure |
| Run, recording, save | Above-fold Start; large labelled timer and distance/pace; pause and lap pinned; Finish separate; save sheet with optional effort, name and notes | Recording stays one focus pane with large targets; preserve draft across resize; path, manual lap and devices as secondary; denied, waiting for GPS, paused, discarding, offline, synced |
| History and Run detail | Source/date-labelled rows; distance/pace and next insight; routes, HR, splits and laps below | Persistent history list with selected run in detail; on-device vs imported routes; missing data stays explicit |
| Coach and voice | One section for suggestion, one primary voice action, secondary chat; visibly connected/connecting/error; mute and Audio routing | Conversations in list, composer and current thread in detail; check-in/briefing sheets; audio choice and recording remain independent |
| Plan and workout | Current workout first, week schedule, detail and reminders; explicit confirmation when changes are proposed | Week/selection alongside details; diff and confirmation in one focused pane; no current plan, conflict, unchanged and saved states |
| Progress and recovery | Range, date and source attached to chart; calendar and day list; score/expert insights behind labeled rows | Two independent regions where available; narrow stack; separate Garmin metrics and source; stale, unconsented, missing, loading and last-good data |
| Settings | Account, subscription, units, connections, refresh and alert grouping | Sidebar and focused detail as width allows; Apple/WhatsApp/email verification, OS settings, sign out, sign-out confirmation and deletion |
| Premium | One selected offer; primary button follows the selection and exact eligibility; legal terms, restore and dismiss in the same view | Center an accessible sheet over the originating context; loading, unavailable products, pending, cancellation and restore stay distinct |

Policy and OS actions remain native: no static substitute for system permissions, Keychain, StoreKit confirmation, HealthKit, or vendor authorization. Screens for editable Figma flows simulate these transitions only.

### Prototype index

Open [08 — Interactive Prototypes](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-9) and choose **Present**. Six saved starting points: first run, record and save, Coach plan review, Progress calendar, Premium selection, and iPad history to detail. All 34 prototype screens are reachable through 94 saved interactions, with no unresolved destinations. The link structure and representative renders were checked; the flows were not played end to end or tested with users. Where system dialogs, text input or payments are simulated, the SwiftUI handoff takes precedence over prototype behavior.

## Before / after validation

The following is a count of design interactions, excluding typing, permission system UI and service latency. It is not a stopwatch study.

| Flow | Current source behavior | Proposed | What should be tested |
|---|---|---|---|
| Start from Run | 1 app action from loaded Run when ready | 1; visually dominant | Time to first start and mis-taps in real outdoor use |
| Finish and save | Finish → Save | 2; no shortcuts past save or discard confirmation | Rescue after a denied permission, offline and interruption |
| Open saved run | 1 tap from Recent; calendar is day → run | Same; persistent iPad master/detail | Fewer lost selections on resize; calendar comprehension |
| Approve coach edit | Review confirmation exists | Review → Apply; still explicit | Correct days, no accidental apply, and ability to keep current |
| Subscribe | Tap a plan-specific purchase button | Select → Continue, then native StoreKit | Whether clarity offsets the added choice step; check restore completion and unintended purchases |

Target outcomes are hypotheses. Measure first verified run started or imported within the first session, first run save success, time and task completion for plan review, and conversion only among StoreKit-eligible paywall views. Segment by device width, Dynamic Type and provider state without exposing running, health or location data. Use staged observations for at least two comparable weeks; no conversion lift or analytics instrumentation is claimed. Report errors, cancellations, failed saves, refunds, unsubscribes and accessibility defects as guardrails.
