# App Review access

The native app keeps email-link sign-in for normal runners. Under **Trouble signing in? → Reviewer sign-in**, reviewers may enter the dedicated account credentials supplied privately in App Store Connect.

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
