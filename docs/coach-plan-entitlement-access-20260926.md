# Plan access: personal pilot to paid/trial entitlement

Implemented and deployed 26 September 2026 as part of the isolated App Review release.

## Behavior

- Authenticated paid/trial runners with `ai_coach` capability and a matching backend profile can request plan creation/settings/adjustment reviews in app/web text or voice.
- Main backend workout editing checks the existing `ai_coach` capability, not an email address.
- Main generate/settings/adjust routes check `training_plans` capability. Generation assigns authenticated user ID and stored units after request fields, preventing identity override.
- Free, expired, past-due, unpaid and preview-only accounts remain denied by existing entitlement policy.
- Plan proposals still require explicit on-screen confirmation; ownership, pending/upcoming-workout restrictions, stale-plan detection, expiration, session binding and single claim are preserved.
- Runner context fingerprint policy version invalidates the previous personal-pilot cache on next resolution.
- WhatsApp MCP consent remains read-only for plans; this change does not extend channel consent.

## Verification

- 22 focused tests passed: training context and proposals, actual route-handler entitlement/identity behavior, companion gate and SQL workout isolation/atomic updates.
- Full coach suite: 105 passed, one pre-existing skipped test; zero failed.
- Coach TypeScript check passed.
- Native capture CI 36261950404 passed for both iPhone and iPad. This captures artwork only and does not deploy backend or TestFlight.

## Release

Main backend was deployed first: Worker `45961e01-5a32-4c63-b031-6733d814bbd6`, immutable container built from `70ea379`. Coach Worker followed: `a2a431c3-9df1-42bc-bee9-0717fb828269`, preserving the previously deployed WhatsApp weather baseline. No D1 schema migration was needed.

Live verification used only the isolated sample account (688): context loaded with no unavailable sections, plan-write eligibility was true, chat prepared a workout review, confirmation shortened one sample easy run to 20 minutes, and a fresh plan read retained all 28 days with exactly one changed day. Requests for another runner's score were denied. No owner's plan or account data was changed.
