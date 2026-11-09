# Garmin onboarding and Premium offers

## Rules review and deliberate boundary

Reviewed Garmin Connect Developer License Agreement Rev H, sections 15.10 and 15.11, on November 9, 2026:
https://developerportal.garmin.com/sites/default/files/Garmin%20Connect%20Developer%20License%20Agreement%20-%20Rev%20H.pdf

The agreement addresses explicit AI consent, written authorization for broad AI-system/data uses, training/evaluation and derived data. No applicable written Garmin authorization was found in the project records. This release therefore does not enable Garmin-powered AI coaching, Runner Score, model training, an AI knowledge base or messaging of Garmin readings. It does not interpret a generic user consent checkbox as Garmin authorization. This is a conservative implementation boundary, not a legal opinion on every existing integration.

## Experience

- New Garmin web signups land on Dashboard, with existing explicit return destinations preserved. New and existing Garmin-only users see a setup checklist, first-run waiting/troubleshooting state and local arithmetic preview of a recent eligible run.
- The preview contains two authored numerical observations, links to the owner-scoped Garmin run details, uses the account distance units, leaves missing sensors unknown and is expressly labeled non-AI. It is computed on demand, not added to the Strava preview store, coach context or a new persisted dataset. Account/connection consent is rechecked before returning it.
- Existing Strava preview behavior is retained. Free Garmin basics and optional Recovery are not put behind a new paywall. Premium offers describe goal-based planning and coaching without claiming Garmin-data analysis. Trial eligibility, real current price, estimated first charge, payment method and cancel-anytime terms use the existing quote and Checkout components. Prices, coupons and trial eligibility rules are unchanged.
- Garmin-source upgrade attribution is retained through pricing, Checkout and abandoned-checkout prompts. Generic pricing and signup reminders disclose the Garmin AI limitation as well. No Garmin measurements or health readings are included in the new funnel events or signup emails.
- Optional verified-email capture provides account email access; marketing follow-ups have a separate unchecked choice. Stripe can still collect a billing email at Checkout, so the optional onboarding step does not add a mandatory pre-Checkout verification gate.

## Verified-email safety

The existing lazy add-email endpoint now requests a purpose-bound challenge instead of immediately attaching an unverified address. Both existing web email dialogs were updated for its new response. Existing users with an email cannot replace it through this path.

Migration `0044_verified_account_email.sql` adds one challenge table and an expiry index. No existing runner fields or consent are changed by the migration. Tokens are 256-bit random values stored only as hashes, valid for 15 minutes, replaced on resend, rate-limited and consumed with an atomic email/ownership update. Existing email accounts are never merged. A link adds the email to its original requesting account, not a user ID supplied by the caller. Delivery refusal invalidates the challenge. Account deletion cascades pending challenges; expired challenges are purged on requests.

Unchecked marketing choice opts the new address out even if an older account default allowed unknown consent. Existing unsubscribe or suppression states win over a pending request. Existing one-click unsubscribe, paid-user exclusions, daytime scheduling, rollout controls and global email switches are unchanged. No sample verification message, campaign email, Stripe session or Garmin grant was created in production for testing.

## Verification before promotion

- 47 targeted tests passed for onboarding, arithmetic, consent withdrawal, email ownership/expiry/replay/resend, unsubscribe preservation, existing sign-in, combined runs and signup reminder safety.
- Additional email delivery and SEO tests passed; existing Strava Premium preview assertions passed with a non-routable local fixture database configuration.
- Phone/desktop browser fixtures cover ready, waiting and paid states, optional email request/check, trial Checkout attribution and exclusion of readings from analytics. All email/payment requests in those fixtures are mocked locally.
- Frontend and D1 application builds passed. Repository-wide typechecking retains unrelated existing diagnostics; feature paths are checked separately before release.
- Applied and journaled only migration 0044 in the existing production D1. Verified its schema and zero live pending verification challenges after the migration. Other pending migrations were left untouched.

This is a web/backend release. It does not change or upload an iOS binary. Garmin AI approval remains a separate prerequisite for enabling that data in the coach.
