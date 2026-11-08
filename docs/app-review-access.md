# App Review access

The native app keeps email-link sign-in for normal runners. Under **Trouble signing in? → Reviewer sign-in**, reviewers may enter either dedicated account's credentials supplied privately in App Store Connect.

## Verification and submission preparation - 8 November 2026

- PR #4 merged as `bc8439ec0c3002c7103eacf96464c0a2656608a3` after CI run `42532075490` passed. The tested and merged source trees matched. Twenty-one local auth, signup, mail-transport and reviewer-isolation tests passed, as did the D1 bundle, production Worker type check and deployment dry-run.
- Cloudflare build `e31caff2-5bb0-447a-9513-a54f50a4096a` succeeded for that commit. Staging Worker `b4aee328-683f-499f-b6e1-516b188ce16e` produced immutable image `sha256:8d96be8834849602f87c23b4186206d564855a0ed6275b85d75e0edb34a2b328`. Production Worker `b08c5ad1-6a34-49b0-a65f-fe23d3cfcff0` promoted it with existing variables retained; container version 61 was verified active before final live checks. No iOS binary was changed.
- Two fresh native signup requests, before and after deployment, delivered to isolated Gmail test aliases in the inbox within seconds. SPF, DKIM and DMARC passed. Each emailed challenge created a session; replay returned 401. The new ordinary account loaded free onboarding without provider connections, with no paid access and both subscription product IDs available. Recipient addresses, email tokens and session credentials are omitted from this record.
- Live reviewer login passed for both identities. The original account retained Premium access; the purchase account returned `hasAccess=false`, `canUseAI=false`, `purchasesAvailable=true` and two product IDs. Wrong passwords were rejected and client-supplied account IDs did not select a different user. The purchase seed was rerun successfully without changing credentials or existing accounts.
- The purchase account represents expired application access; it has no fabricated App Store purchase/receipt history. No StoreKit transaction was initiated or completed during these checks. StoreKit and its signed transaction verification remain authoritative for purchases.
- In App Store Connect, the purchase credentials were saved privately in App Review's username/password fields. The original Premium demo credentials were retained only in private reviewer notes for feature testing. Notes explain the native signup link, successful live verification, both account purposes, the purchase flow and current Garmin/recording privacy boundaries.
- **Update Review** prepared the existing submission: app version **1.0 (41)**, the Premium group and the monthly/annual subscriptions all show **Ready for Review**, with **Resubmit to App Review** enabled. The final resubmission button was not clicked and no separate review message was sent.

## Purchase-flow review account

- The second reserved identity is `app-review-purchase@review.aitracker.invalid` / `app-store-review-purchase-v1`. It has a canceled Premium application entitlement and a past trial end, with no active coaching access, provider links, real billing identifiers, or fabricated Apple transactions.
- This is an explicit application-entitlement fixture, not evidence of a historical App Store purchase. Real purchases and introductory-offer eligibility remain controlled by StoreKit and Apple's signed transactions.
- Create it once with `tsx scripts/d1/seed-purchase-review-account.ts --create-isolated-purchase-review-account`. Credentials are generated locally and saved only in ignored `.tmp/app-review-purchase-credentials.json`. Reruns validate the existing identity/password/state and never reset either review account or an Apple purchase.
- Use this account in App Review's username/password fields for purchase testing. The original Premium sample account remains available for content/coaching review. Keep both credentials private; never commit or attach credential files publicly.
- Build 41 can use both identities through its existing reviewer sign-in screen; the backend still verifies real bcrypt passwords, exact email/username pairs, non-admin status and per-IP attempt limits. This does not broaden ordinary-account password login.
- After signing in, use **Run** for free recording or **Settings > Connections & subscription** for the monthly/annual StoreKit paywall, renewal terms, Restore purchases and Manage Apple subscription. Buying a real sandbox subscription may legitimately change this demo's entitlement. Do not relabel or reset that transaction with the seed.

## Security and data

- This uses the existing bcrypt password verification and seven-day signed sessions, stored in the native Keychain. It is not an authentication bypass or a hard-coded password.
- The dedicated endpoint is restricted to both the reserved review email and username, rejects admin accounts, and limits attempts per IP in D1. No user ID supplied by a client can select the authenticated account.
- The administrative seed creates a separate, non-admin premium account. The `.invalid` email is an intentional login identifier, not a deliverable inbox. Credentials are generated randomly and saved only to ignored `.tmp/app-review-credentials.json`; never commit them.
- Only numerical metrics from the owner's runs are used, rounded/perturbed and assigned new dates and identifiers. Personal text, account IDs, GPS, routes, device information, Strava tokens, Stripe identifiers, messages and notification destinations are not copied.
- The plan, insight and saved recaps are explicitly labelled sample fixtures. This is a real account using normal app APIs, not review-specific replacement behavior.
- `sampleData` lets this account open the populated app without falsely marking Strava as connected. Real signup, Strava OAuth and StoreKit purchase testing use a separate normal account.
- Do not run the seed on every login. Run manually with `tsx scripts/d1/seed-review-account.ts --create-isolated-review-account`; it is resumable and does not overwrite existing account data or rotate credentials.
- Keep the account active for future reviews. Rotate the password via an administrative bcrypt update when appropriate and replace the credentials in App Store Connect. Existing sessions normally last seven days; deletion invalidates them.

## Review notes (provide with the private credentials)

Run Analytics uses email-link sign-in for ordinary users. A dedicated sample account is provided for review and does not require access to an email inbox or a personal Strava account.

1. On the sign-in screen, expand **Trouble signing in?** and tap **Reviewer sign-in**. Enter the username and password supplied in App Review Information.
2. The account contains sample runs and a sample training plan. In **Progress**, inspect Runner Score, mileage, Activity Calendar, history and run details. Routes are intentionally omitted to protect location privacy.
3. In **Coach**, send a message or tap **Talk to your coach** and allow microphone access. Coaching uses this sample account's data. Voice needs network access.
4. In **Plan**, inspect the upcoming sample workouts. Changes and check-ins apply only to this review account.
5. Optional notifications require permission on the review device. No owner's phone number, push token or messaging account is connected.
6. The sample account already has coaching access and no paid subscription. To test the normal signup, Strava connection and Apple subscription flow, sign out and create a separate account with an email inbox you control. The monthly and annual subscriptions offer a seven-day introductory trial to eligible users; StoreKit determines localized prices and eligibility.

These notes must accompany the review credentials; do not supply the owner's login, a one-time email link, or a Strava password.

## Release verification — 26 September 2026

- Native build **1.0 (34)** uploaded successfully in GitHub Actions run `36278199761`, completed Apple processing, and was assigned to **AITracker Internal**. iPhone and iPad CI passed in run `36278181240`.
- Production backend: `45961e01-5a32-4c63-b031-6733d814bbd6`; container version 30, image digest `4198faf775600526384278255548ac3d6fbae9fa372bcb5365f62a06bc02d069` from commit `70ea379`.
- Coach Worker: `a2a431c3-9df1-42bc-bee9-0717fb828269`, retaining the live weather fixes.
- Sample account 688 contains 40 runs, eight saved recaps and four complete plan weeks. Live queries confirmed no Strava secrets, Stripe IDs, GPS routes, streams or laps were copied; outbound marketing/post-run preferences are disabled.
- Live checks passed: reusable reviewer login, rejection of wrong credentials/ordinary users, native onboarding, score, calendar, recaps, complete plan, cross-account denial and review-account Strava isolation.
- Coach context loaded without missing sections. A reviewed and confirmed sample workout edit persisted to exactly one day, leaving the other 27 unchanged. This changed only the dedicated sample account.
- Physical-device voice playback and the new native login on the user's phone still need a TestFlight smoke test. Server chat and native simulator tests are verified.
