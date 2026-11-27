# Run Analytics · Product UX and monetization

[Product standards](../../PRODUCT-DESIGN-PRINCIPLES.md) · [Prior audit](UX-AUDIT.md) · [Existing design](UX-REDESIGN.md) · [Editable Figma concepts and prototypes](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=30-2) · [Updated simulator check](https://github.com/biserd/AIRunningTracker/actions/runs/46020948349)

## Decision

Use **C (context) with A’s outcome headline**: coach seekers see “Know what to run next”; plan seekers see “Build a plan for your next race.” A runner who is opening Settings can explicitly compare Apple plans. One shared, dismissible sheet has the actual localized terms and one purchase CTA. Context is the chosen feature, not inferred race history, health data, or willingness to pay. Direct Garmin data remains outside AI coaching. No launch paywall or automatic follow-up prompt was added, nor was a free limit created.

**Findings.** Previously, signed-out users could read positioning but not see a result; Coach and Plan showed the same generic inline purchase UI; renewal information appeared in each option and again below selection. These are source-observed design issues, not measured drop-offs. Existing free recording, progress/history, provider consent and signed transaction delivery are strengths to preserve. Positive completion must come from the account’s verified Apple entitlement, not a button tap or animation.

## Journey audit

Counts below come from the source paths and named fixtures, not live user analytics. Each triple is **deliberate taps / distinct surfaces including start and destination / meaningful decisions**. Scrolling/typing and time in email count separately. Browser redirect details vary by provider; an OS sheet adds a surface and a deliberate decision when presented. Optional detours are excluded. “After” is the implemented path unless described as a proposal.

| Task and starting state | Before | After | Remaining friction |
| --- | --- | --- | --- |
| See an example result without an account, from welcome | Not available | **1 / 2 / 1**: See a sample run → clearly labeled example | Original authored local sample. No real history, GPS, permissions, account or conversion prompt. |
| Create and verify an email account, then reach Run | **5 / 4 / 2**: choose Create account, accept terms, send link, tap verified link in email, Continue to Run | **5 / 4 / 2**; removes the decorative panel and keeps optional providers and account actions collapsed | Email ownership, terms, and access handoff remain. Verify arrival, not email dispatch. Recovery remains visible when setup can’t load. |
| Record and save a first free run, from Run | **3 / 3 / 2**: Start run, Finish, Save; + permission if needed | **3 / 3 / 2** | GPS request follows Start. Real save needs elapsed activity and safe finish review; it cannot be promised within 60 seconds. No trial required. |
| Import a source from Run settings | **2 / 3 / 1** for Strava before OAuth; **3 / 3 / 2** for Garmin including explicit sharing consent | Unchanged | Connect only on deliberate choice. OAuth prompts/sync time are external; completion is activity availability, not account linking. |
| Ask the paid Coach a question, from Run | **2 / 2 / 1**: Coach → Send after composing | Unchanged | Account entitlement and typing/AI response time remain. Respect voice and provider boundaries. |
| Apply a proposed workout change, with a review open | **1 / 1 / 1**: Apply after inspecting the proposed change | Unchanged | Explicit confirmation protects real plan writes. A pending or uncertain result is not completion. |
| Open a previous Run from Run’s recent list | **1 / 2 / 1** | **1 / 2 / 1** | Retain direct open. Expanded lists and details retain existing selection. |
| Open coaching history from Progress | **3 / 4 / 1**: Coach insights → Run history → run; wide detail shares the last surface | Unchanged | All-source Progress and eligible Strava coaching history are different data scopes. |
| Discover paid value from a locked Plan or Coach tab | **0 / 1 / 0**: full purchase UI already visible | **0 / 1 / 0**: relevant benefit and what stays free; **1 / 2 / 1** to explicitly compare plans | One extra tap only for interested users. Free work resumes from Back to Run or Not now. |
| Authorize a purchase from a locked tab | **3 / 3 / 2**: choose plan → Continue → Apple confirmation | **4 / 4 / 3**: See plans → choose → Continue → Apple confirmation | Deliberate monetization step replaces an unsolicited price list. No preselection; date/price/eligibility come from StoreKit. |
| Restore from the offers view | **1 / 1 / 1**, plus Apple authentication if requested | **1 / 1 / 1**, plus Apple authentication if requested | Show active access only after server confirmation. No-completion restores receive a check-account message. |
| Manage existing Apple billing from Settings | **2 / 3 / 1**: Account → Manage Apple subscription; then Apple UI | Unchanged | Apple remains the source of renewal and cancellation. No replacement checkout or billing control. |

**First-time:** the signed-out example provides one useful result in one tap; it must stay available offline and contain no real-user data or buy buttons. A new user who wants their own data proceeds to verified email, then recording; optional providers and subscriptions never block free recording. Target **≤60 seconds to a meaningful sample result** from first interactive launch. For real activity, distinguish successful start, completed import, and saved result; never relabel starting a run as a completed outcome.

**Returning:** keep Run, Coach, Plan, Progress and Settings stable. Use existing active sessions and selected history on resize. Coach/Plan remain direct for entitled accounts. Free runners see a relevant description in each locked destination without covering normal Run or Progress. Account recovery and provider management remain in Settings.

## Concepts and handoff

| Concept | Why it helps | Trade-off | Shipping choice |
| --- | --- | --- | --- |
| [A · Outcome](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=31-16) | Easiest promise to scan. | Generic if repeated in Plan and Coach. | Use the outcome hierarchy everywhere. |
| [B · Demonstration](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=31-140) | Explains what users get with a tangible coaching example. | Uses space and must be labeled as a sample, not a promised personalized result. | Keep as a candidate for testing; sample-first onboarding is independent of payment. |
| [C · Context](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=31-276) | Ties the purchase to the job users deliberately opened. | Depends on honest, matched entry context. Needs a stable fallback for Account. | Implemented entry-aware copy and an adaptive offers sheet. |

All three have iPhone and expanded-iPad versions in light and dark. The selected design also has a [500-point dark iPad specimen](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=33-258). The [Figma before/after board](https://www.figma.com/design/EyKSVPyHnIfRqWAXS5CGdG?node-id=31-524) complements the numeric audit. “First value,” “Context → Plans → Apple,” and restoration/management are clickable Figma flows. Figma dollars, dates, and confirmation are illustrative; production uses StoreKit.

| Design state | SwiftUI mapping and invariant |
| --- | --- |
| Welcome → local example | `SignInView` / `SampleRunPreview`; no backend or device permission; dismissal preserves existing sign-in draft. |
| Verified setup | `NativeOnboardingView`; one Continue action before optional connectors. Account settings preserve consent, restore, sign out and delete. |
| Coach, Plan and Account intent | `NativePaywallEntry` plus existing feature entitlement checks; explicit presentation in `NativePaywallSheet`, not triggered by launch or a failed free request. |
| Compact vs expanded | `NativePaywall` uses the actual available sheet content width: two columns from 596 points, otherwise one stacked, scrollable layout. Accessibility sizes always stack. Selection is shared across widths. Modal cancel is in the native toolbar. |
| Free/paid, plan not selected, all offers | `NativeOfferPlan`; full localized recurring price is most prominent. No purchase possible before a choice and eligibility check. Known paid introductory offers are distinguished from a free trial. |
| Native confirmation, cancellation, pending, error | Existing `AppleSubscriptions` purchase API and signed delivery remain unchanged; one action, no duplicate attempt while purchasing, pending or already delivered. |
| Success, restore and management | Progression only once the signed-in account reports active Apple access; restore delegates to Apple/entitlements and management opens Apple’s system sheet. Terms and privacy are unchanged. |

Apple requires clear terms including the actual billed amount, trial and restoration path; this review adopts [Apple’s subscription presentation guidance](https://developer.apple.com/app-store/subscriptions/) and its [In-App Purchase HIG](https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase).

## Funnel contract — specified, not enabled

**Current evidence:** the existing web funnel in `shared/funnelEvents.ts` covers Stripe checkout, trial, conversion and cancellation. It cannot tell us device signup or Apple paywall behavior. The signed Apple transaction and notifications flow in `server/services/appleSubscriptions.ts` is the native billing authority and deduplicates notification IDs; the current table does not itself establish a client impression-to-purchase funnel. The iOS code did not expose comparable native impression or result events. Neither a native drop-off percentage nor conversion lift is established. The source-inspected gaps (example missing, price shown before user intent, unclear measured eligibility) are hypotheses to test.

| Event | Trigger and dedupe boundary |
| --- | --- |
| `first_app_launch` | First interactive launch per consented install; store just the first time/window marker locally. Track session start separately if needed. |
| `onboarding_started` / `onboarding_completed` | First deliberate account setup interaction / verified account reaches usable Run; once per onboarding flow; never count resend as another start. |
| `first_meaningful_action` | First deliberate sample, start-recording, import or send-coach request; use only a fixed action enum. |
| `first_successful_result` | Sample rendered, real run saved, eligible imported activity available, or verified coaching answer displayed. Keep `sample` and real value separate; one per cohort/result kind. |
| `premium_feature_discovered` | An eligible paid destination is visible, deduped per entry/session; does not equal a paywall impression. |
| `paywall_impression` / `paywall_dismissal` | One visible meaningful offer sheet per presentation ID; one passive close/exit event without logging text or errors. Report unavailable separately. |
| `plan_selected` | At most one per selected plan and presentation; record monthly/annual class, not amount, account, or Apple product ID in analytics. |
| `purchase_initiated` | Only when the selected real StoreKit product is passed to Apple. One per attempt. UI selection, pending, canceled and error are non-activation outcomes. |
| `trial_activated` / `subscription_activated` | Server only after authoritative verified initial transaction; distinguish signed eligible trial offer from first paid service. |
| `trial_to_paid` | First verified paid renewal following a verified trial, once per private billing lifecycle. Do not infer from scheduled trial end or status alone. |
| `cancellation_scheduled` / `subscription_ended` / `subscription_retained` | Authoritative renewal state change / access actually ends / verified active subscription at the defined cohort boundary; keep scheduling, revocation and churn distinct. |

Server billing deduplication can use existing transaction and notification IDs only in the restricted entitlement layer. If collection is separately approved, export only deduped aggregate outcomes or purpose-limited opaque random linkage, never Apple IDs, account tokens, contacts, raw activities, coordinates, health, coach text, or passwords. Use no cross-app tracking or ad IDs. Confirm consent, retention limits, deletion, low-count handling and App Privacy disclosures in advance. A signed-out sample must not require telemetry consent, account creation or an external request to work.

**Primary measures:** (1) consented first installs with a meaningful result within 60 seconds / eligible first interactive launches (sample and real shown separately); (2) verified trial or paid activation within seven days / eligible unique exposed offer viewers, split by verified eligibility and context; (3) first paid renewal within 30 days after trial end / fully observed eligible verified trial starts. Report signup completion, sheet dismissal, attempted and canceled purchases as diagnostics; never mix web Stripe and Apple transactions. Guard free start/finish success, checkout/restore failures, cancellation/refund, repeated impressions, accessibility, and the availability of dismissal. Track a baseline with the same version, stores and eligibility rules before claiming gains.

**Experiment proposal:** once approved measurement is reliable, randomize eligible non-Premium offer visitors persistently into outcome-vs-context by consented pseudonymous assignment. Keep billing, links, timing, free access, exact terms, and defaults identical; change the headline/content only. Compare first exposure cohorts with the same seven-day window and predeclared sample/power rule; hold if volume is inadequate. Guard freely completable tasks and paid recovery. Default remains the reviewed context design; no active flags or allocation have been added. Roll back copy via a future flag or prior build without changing the StoreKit plan or historical assignment.

## Validation boundaries

- Prior native simulator baseline: [the unsigned jobs in build 45](https://github.com/biserd/AIRunningTracker/actions/runs/45995108915), including Run and Progress history. The original setup's decorative card, optional connectors and competing account actions are visible in `DFA666CE-52B5-445F-B846-AD86AC5A4BD6.png` in the [iPhone 17 Pro artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45995108915/artifacts/15195958602) and `9D8432D9-ED80-49D6-A989-5D18B06CAB6E.png` in the [iPad Pro 13-inch artifact](https://github.com/biserd/AIRunningTracker/actions/runs/45995108915/artifacts/15196098667). Figma renders are **design evidence only**.
- The [updated unsigned suite](https://github.com/biserd/AIRunningTracker/actions/runs/46020948349) is configured for a standard and compact iPhone and iPad. It exercises the actual app with offline preview offers, signed-out sample, no-default selection, paid and free-trial labels, dismissal and retained free recording, plus existing regression tests. See completed artifacts for device dimensions and screenshots. A mock offer never reaches StoreKit purchases.
- Captures from that implementation: [standard iPhone](https://github.com/biserd/AIRunningTracker/actions/runs/46020948349/artifacts/15212390232), [compact iPhone (375×667 points)](https://github.com/biserd/AIRunningTracker/actions/runs/46020948349/artifacts/15211816023), and [standard iPad (1376×1032 points in landscape)](https://github.com/biserd/AIRunningTracker/actions/runs/46020948349/artifacts/15210702751). The first captures showed that the experimental AX5 override did not cross the sheet boundary, the dark sheet still used the old tint, and the wide paywall incorrectly stacked. These prompted targeted corrections and XCTest checks for actual text size and column positioning. The first captures do not verify the corrections.
- [Final unsigned matrix with those corrections](https://github.com/biserd/AIRunningTracker/actions/runs/46024635699) runs the new checks on the exact SwiftUI revision `ab2bea6`. Check its jobs and new captures before treating the original screenshots as acceptance evidence.
- No production telemetry, allocation, amount, product ID, renewal policy, eligibility rule, signed transaction verification, external subscription setting, or release was changed. Actual Apple purchase/restore/cancel, VoiceOver, Reduce Motion and real iPad multitasking still need separate device checks. Do not treat simulator counts as user timings or real purchases.
