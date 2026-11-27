# Run Analytics · Design system

[Editable Figma foundations and components](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-5) · [Dark specimens](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=1-8) · [Implementation](IMPLEMENTATION-PLAN.md)

## Principles

**Calm until attention is needed.** A warm grouped canvas and clear type carry most screens. Use orange for action, teal for trend/positive evidence and red for errors or destructive intent. Pair them with readable labels. Avoid gradients and stacking decorative cards; keep dividers and density native. Keep meaningful targets at least 44 × 44 points; recording actions often need 52–64 points.

**Material is for controls.** Use native Liquid Glass on system tabs, toolbars or floating recording controls when appropriate on iOS 26+. Preserve an opaque fallback on older supported versions and with Reduce Transparency or high contrast. Do not wrap charts, session metrics, list data, progress messages or passcode-like input in glass. Ease with the system; Reduce Motion uses immediate state changes or a short crossfade and no pulsing status animations. Keep haptics paired with readable state and respect system settings.

## Foundations and linkage

Figma collections: 27 single-mode palette primitives, 15 semantic aliases with Light and Dark modes, and 20 metrics/type variables. Eight named SF Pro text styles cover Title 34/41, Title2 28/34, Headline 17/22, Body 17/23, Callout 15/20, Footnote 13/18, Caption 12/16 and Metric 50/56 (display examples, not fixed production type). `Font` semantic styles and `@ScaledMetric` are the SwiftUI implementation; use tabular monospaced digits on changing values and break oversized headings into multiple lines.

| Role | Light | Dark | SwiftUI intent |
|---|---|---|---|
| surface/canvas | #FAF7F2 | #171614 | `RunTheme.canvas` or grouped system background in high contrast |
| surface/grouped | #FFFFFF | #211F1C | `RunTheme.surface`, grouped list sections |
| surface/inset | #F1EBE1 | #2D2924 | Secondary fill; not a disabled label |
| label/primary | #252421 | #FAF4EB | `.primary`; opaque for live data |
| label/secondary | #5D5951 | #C7BDB2 | `.secondary`; no faint text for required instructions |
| action/tint | #C83B0A | #FF9A71 | Brand primary action; pair with action/on-tint |
| action/on-tint | #FFFFFF | #171614 | Label and symbol on primary fill |
| signal/positive | #096E63 | #67D6BB | Trends and positive status; include written direction |
| signal/attention | #9F1D35 | #FF9BAB | Destructive or blocked; include reason and recovery |
| surface/coach | #FDE9DC | #4D281C | Single coach/intent emphasis surface |
| surface/recovery | #DFF2EC | #1D3A34 | Private recovery evidence grouping |
| surface/info | #E4EAF1 | #263341 | Neutral status or context pane |

Geometry: spacing 4/8/12/16/20/24/32 pt; radii 10/14/20 pt; target 44 pt; primary button 52 pt. Adapt to text and safe areas. Compact design measures 393 pt (iPhone) and 544 pt (narrow iPad witness). Expanded iPad examples at 834 and 1194 pt; use actual layout fit, not hardcoded device detection. Sample composition: sidebar 216 pt, optional context rail 256 pt, then flex detail ≥ 360 pt; collapse context before truncating. At accessibility sizes, let metric grids and tool rows stack. Figma fixed viewport dimensions describe fixtures, not SwiftUI min/max policy.

## Component handoff

Inspect the editable sources directly: [primary action variants](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-2), [list row](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-29), [form field](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-37), [metric](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-42), [status notice](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-52) and [calendar day](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=3-64).

| Figma component | State/API | SwiftUI destination |
|---|---|---|
| RA / Action / Primary, Secondary, Destructive | State = Ready, Pressed, Busy, Disabled; label | Native `Button`/roles with `RunActionStyle`; adapt existing `LiquidGlass.swift` helpers. Busy is a label plus ProgressView; destructive action requires prior explanation |
| RA / List row | Title, detail, optional value, native chevron | `NavigationLink`/settings row in `RunHome`, `CoachTabs`, `SettingsView`; voice label includes source, date, value |
| RA / Form field & Field feedback | Label, value, support; error separate | Bind the label with `TextField`, `TextEditor`, correct keyboard/content types and error accessibility focus. No color-only invalid state |
| RA / Status notice | Title and detail; intended for saved, queued, loading, or external state | New reusable `RunStatusNotice` using state enum; failed vs unavailable vs not authorized stay distinct; keep action and previous content |
| RA / Metric | Label, value, detail | `RunMetricTile` in `RunHome`, `RunDetailView`, `RunningProgressView`; one spoken metric plus unit |
| RA / Coach recommendation | Kicker, title, detail | `CoachRecommendation` wrapper over existing CoachBriefing/RunAnalysis views. Trust text indicates source, date, coverage and next action |
| RA / Chart mark & Calendar day | Reused marks/day cells; readable labels | `Swift Charts` plus accessible descriptor and alternative list; evolve `MileageProgressCard` and `ActivityContributionCard` |
| RA / Tab / * | Default and selected | `TabView` and `NavigationSplitView` with the same `CoachSection` and independent paths. Selected is labelled and has selected trait; named SF Symbols |
| RA / Selectable row | Option name, renewal/period or setting value | `Picker`/native row; add selection accessibility trait and checkmark. Plan choice never starts a purchase by itself |

Use the Figma component IDs and mapping table; don't publish the library or create production Code Connect stubs during this design phase. After implementation, map custom wrappers to actual SwiftUI types, not native primitives. Figma found the official Apple library, but import attempts for its status and tab bars did not succeed. Editable chrome uses SF Pro and named SF Symbols and is a design proxy for SwiftUI system chrome.

Implemented subset: `RunDesign.swift` exposes named Asset Catalog colors for canvas, grouped/inset surfaces, coaching highlight, action foreground/background, recovery and trend. `RunActionStyle` adapts the 52-point action component while preserving stock Button semantics. `RunMetricTile` uses semantic font sizes, scalable display type and real values. `PlanReviewCard` displays only server-supplied proposal details. Native tabs, menus, segmented pickers, StoreKit and MapKit are not approximated by hand-built controls. See [implementation and evidence](UX-IMPLEMENTATION-REVIEW.md) for the remaining mappings and limitations.

Validation: six representative text/background pairings resolved from Figma variables met a 4.5:1 contrast threshold in both modes. The lowest was 5.14:1 for the light primary button label; the dark counterpart was 8.71:1. These checks do not cover every token pairing, disabled states or material composites. At the checked calendar widths all seven 44-point day cells fit, and standard primary actions use 52-point height. Prototype labels describe intended semantics; visuals and geometry do not verify actual SwiftUI hit areas, VoiceOver, Switch Control, keyboard/pointer behavior, or Reduce Motion.
