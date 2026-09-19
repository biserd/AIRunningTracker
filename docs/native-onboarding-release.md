# Native onboarding release — 2026-09-19

## Shipped backend

- Production container image: `829f445c6a315242c2b778a5050a6bea0af7a971cd1047be397f271d832643a6`.
- Main Worker version: `8fb1a7b8-3c54-4c48-a38f-3f8e2de73d7e`.
- Coach Worker version: `07098541-78d4-4b9d-95aa-5aaaf9731bd2`.
- Additive migration: `migrations/20260919_native_onboarding.sql`, applied to production D1.
- Verified-email signup creates an account only after the one-use challenge is consumed. Existing email addresses resolve to their existing account. Marketing is opted out by default.
- Native Strava authorization uses an expiring, single-use account-bound state. An athlete already owned by another runner cannot be reassigned.
- Apple purchases are verified on the server with Apple's certificate chain and signed transaction data. App account tokens bind purchases to one runner; stale events cannot reverse newer state.
- Stripe fields remain unchanged. Apple access is derived from a separate ledger. Active subscribers bypass the paywall; web checkout rejects an active production Apple subscription.
- Sandbox transactions are accepted explicitly for TestFlight and stored separately from production transactions. Revisit `APPLE_SUBSCRIPTIONS_ALLOW_SANDBOX` before general release.

## Apple configuration

- App: Run Analytics, `run.aitracker.coach`, Apple ID `6813680941`.
- Group: Run Analytics Premium, `22398177`.
- Monthly: `run.aitracker.coach.premium.monthly`, US $7.99, seven-day introductory trial.
- Annual: `run.aitracker.coach.premium.annual`, US $79.99 upfront, seven-day introductory trial.
- Both products are service level 1. English (US) product/group localizations saved.
- Availability and introductory offers exclude France; 174 territories selected.
- Production and sandbox server URLs: `https://aitracker.run/api/native/apple/notifications`.
- Products remain Prepare for Submission; no public App Store release has been submitted.
- Account-holder action required: Business shows Paid Apps Agreement = New and requires a legal-entity update. Do not treat purchases as ready until the agreement and required commerce details are active.

## Validation

- 66 D1 tests passed, including signup reuse/expiry, OAuth state replay, purchase ownership, event ordering and revocation.
- iPhone and iPad simulator checks passed for the native onboarding implementation.
- Backend safety CI passed for `4fbc152`; Cloudflare built that revision successfully.
- Both frontend builds, Worker typechecks, container typecheck and D1 application bundle passed.
- Production homepage returns 200; native onboarding without authentication returns 401. Unsigned Apple notification requests are rejected without granting access.
- Final iPhone/iPad simulator run `35471032342` passed for `e23c1cb`.
- TestFlight tag: `ios-testflight-20260919-native-onboarding`, source `e23c1cb`; upload run `35471035189` succeeded. Apple processed version 1.0 build 21; it is assigned to AITracker Internal (2 testers). External beta review and public App Store release have not been submitted.
- Deployed native signup email request returned 200 for the designated test inbox; the hashed challenge was confirmed in D1 without exposing the token. The email link has not been consumed as part of this acceptance check.

## Device acceptance checklist (not yet completed)

1. Install the new TestFlight build; create an account using an email not already associated with a runner.
2. Open the email link on the same device; confirm native onboarding appears and no duplicate runner is created.
3. Connect an unlinked Strava athlete in the in-app authorization session. Confirm returning to the app and background run sync.
4. Confirm Apple's localized monthly/annual prices and trial eligibility; complete a sandbox purchase only, never a live charge for testing.
5. Confirm coaching access, restore purchases after sign-out/sign-in, and reject purchase restoration to another runner account.
6. Verify sandbox renewal, expiry and refund events update access. Confirm the corresponding D1 event and subscription rows without logging signed payloads or credentials.
7. Sign in with an existing active Stripe runner and verify there is no additional purchase prompt and no Stripe subscription mutation.

Apple product metadata can take time to propagate. An empty product list has a retry path. TestFlight purchases and the complete device flow must be checked on a real device; simulator compilation and HTTP smoke checks are not substitutes.
