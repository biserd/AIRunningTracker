# Plan access: personal pilot to paid/trial entitlement

Implemented 26 September 2026. Not deployed by this task.

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

Deploy main backend and coach Worker together (main entitlement guards first). No D1 migration is needed. Verify on a non-owner eligible account: prepare a plan, confirm, reload, and confirm isolation against a second account. Do not use an existing runner's real plan for destructive smoke tests without approval. No production plan was created or changed during this work.
