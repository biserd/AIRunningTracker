# Existing runner accounts

The coach Worker uses the BACKEND service binding to aitracker-main.
Production D1 remains the source for accounts, subscriptions, runs and plans.
No Neon connection or duplicate account migration is required.

## Login

Open /preview or choose Sign in on the landing page.
Use the existing email/password, or request an email sign-in link.
Strava-only accounts can use the email link. There is no automatic cross-domain
SSO or separate Strava OAuth flow in this interface.

Email links point to the fixed new.aitracker.run origin. Tokens use a URL
fragment, not a query parameter, and are removed before redemption.
The primary backend issues and validates tokens. The browser stores its token
in a Secure, HttpOnly, SameSite=Strict, host-only cookie. No token is returned
to frontend JavaScript, written to D1, or included in model context.
Every private API request revalidates through /api/coach/experience.
The runner ID comes from primary authentication, never caller/model input.
Logout clears the new site's session; it does not log out the main site.

## Data contract

The bounded snapshot contains up to 200 activities within 90 days, subject
to the existing free-history cap and locked-run filtering. Only running
activities are displayed. The current calendar week's active-plan workouts
and actual completion status are included. No plan means an empty schedule.
Timezone comes from the runner's coach settings. Distances are explicitly km.
No GPS streams, credentials, email address or unrestricted records are exposed.

Charts and poster statistics use this summary snapshot. Chat refreshes profile,
athlete profile, goals, fitness/recovery/runner scores, up to 30 plan summaries,
and up to 3 full active plans (52 weeks each), with workouts and intervals.
Voice receives the same expanded context in its startup instructions, then
delegates questions for fresh context. Failed sections are labeled unavailable.
Credentials, contact addresses and raw sensor/GPS streams are not model context.
AI calls retain existing trial/subscription entitlements.

The server checks the current authenticated /api/user identity. Only
biserd@gmail.com with AI entitlement may prepare/confirm real plan actions:
new race-targeted plans, race date/target-time settings, or the legacy
easier/progressive week adjustment. Reviews expire after ten minutes and require
an explicit on-screen confirmation. The server compares current plan data,
claims the proposal once and never retries an uncertain write. No account ID,
arbitrary route or additional request fields can be supplied by the model.
Week adjustment is refused if the selected weeks contain past/completed workouts,
because the existing backend does not protect those days. Exact workout edits
are not supported. Race setting updates do not rebuild the workout schedule.
No new main-site deployment, database migration or secret was needed.

The existing coach D1 holds private per-runner conversations, reminder/channel
settings and a last-loaded snapshot, not a second account authority.
Browser requests refresh the snapshot. WhatsApp background replies for real
accounts do not call AI or expose cached data; they direct the runner to the app.
WhatsApp reminders continue to work. Background data refresh and cross-channel
entitlement revalidation need a dedicated durable credential flow before
enabling real-account conversational WhatsApp coaching.
Seven-day session retention and existing reminder verification remain unchanged.
Legacy anonymous cookies cannot access private APIs. Anonymous preview creation
is disabled. Existing demo channel bindings are not silently moved to an account.

## Verification

Run the primary D1 application smoke test for authentication, foreign-ID
rejection, bounded hydrated histories and current-plan mapping.
Run the coach unit tests for host-only cookies, fixed backend routing,
expired authentication, sample-cookie rejection, plan ownership, stale reviews,
explicit confirmation, duplicate submission and uncertain-write handling.
Set TEST_BASE_URL explicitly for the anonymous deployed API checks.
Finish with interactive real-account sign-in on /preview.

## Deployment record, 2026-09-14

- Primary image: sha256:521a76dd77c36b444db07905a4214241b9fe78336533a568df3207699c8a5c62
- Primary Worker version: 42791766-39bf-4f35-9b41-775f1f1acd7b
- Coach Worker version: 35895eb5-ada5-4232-9d2c-03f098ecbd0e
- Local: 35 coach tests, TypeScript, frontend build and primary D1 application smoke passed.
- Deployed: anonymous/legacy-session rejection checks passed.
- Interactive sign-in and real-account UI verification await the account owner.
- No database migration or new application secrets were required.

Expanded-context deployment: local coach tests and Workers runtime test pass.
The controlled browser is not signed into the user's new-site account, so live
voice preload and plan-write confirmation still need an owner-run acceptance test.
No live plan was created or changed as a test.
