# Lifecycle campaigns

The Cloudflare-backed email worker is implemented for one neutral notice about a Checkout session the runner actually started and left unfinished. Delivery is disabled by default. Other promotional lifecycle templates are not scheduled or sent through Cloudflare Email Service. Before enabling this notice, confirm that Cloudflare accepts the specific message as transactional; Cloudflare Email Service does not support marketing campaigns.

## Safe rollout state

Migration `0003_lifecycle_campaigns.sql` explicitly sets:

- `drip_campaigns_enabled=false`
- `drip_campaigns_dry_run=true`
- `drip_campaigns_rollout_percent=5`
- `drip_campaigns_holdout_percent=10`
- `drip_campaigns_hourly_limit=50`

Applying the migration cannot start delivery. Delivery requires both `enabled=true` and `dry_run=false`. The server refuses to disable dry-run unless all readiness checks pass.

## Required production configuration

- `MARKETING_LINK_SIGNING_SECRET`: at least 32 random characters. It signs click, attribution and unsubscribe tokens.
- `CLOUDFLARE_EMAIL_API_TOKEN`: the existing Email Sending token must also be able to list suppressions for a recipient. A failed suppression check blocks recovery delivery.
- `CLOUDFLARE_EMAIL_ACCOUNT_ID` and `EMAIL_FROM`: the existing account and verified sender.
- `PUBLIC_APP_URL`: canonical deployment URL. Production should use `https://aitracker.run`.
- `CLOUDFLARE_CHECKOUT_NOTICE_POLICY_APPROVED=true`: set only after confirming with Cloudflare that this exact one-time notice is allowed as transactional mail. The worker refuses live delivery without it.

Cloudflare automatically adds eligible bounces and spam complaints to its suppression list. Before every recovery notice, the app checks that list for the exact recipient across the account's sending domains. A suppression or unavailable check prevents sending; a soft-bounce suppression defers for 25 hours. The Cloudflare API's accepted/queued response is recorded as sent, not as confirmed delivery. The message ID is retained for Cloudflare email-log correlation.

## Segments

The resolver uses this priority order:

1. Paid, unsubscribed, suppressed or consent-missing runners are excluded.
2. Trial ending.
3. Trial needs activation or trial engaged.
4. Expired trial win-back.
5. Signup without Strava.
6. Checkout abandoned.
7. Preview engaged without trial.
8. Preview ready but unseen.
9. Inactive free runner.

The current campaign version is 2. The broader segments remain visible in analytics, but only `checkout_abandoned` / `CA1` is eligible for Cloudflare delivery. Checkout must be server-recorded, at least 30 minutes old and no more than 48 hours old; the notice is scheduled one hour after Checkout and the Stripe session is rechecked before sending. Old pending jobs are cancelled rather than backfilled.

## Delivery controls

- Only explicit `marketing_consent_status=consented` users are messageable.
- One active lifecycle campaign is allowed per runner.
- Unique job keys prevent duplicate steps.
- The signed Checkout link expires after 72 hours. Opening it displays a same-origin confirmation page without signing in, so routine email link previews do not consume access. The runner's confirmation POST atomically claims the existing unique email-click record and signs in that browser once; a repeat or expired link requires normal sign-in. The recipient does not need to be logged in beforehand.
- D1's atomic claim query leases jobs so autoscaled workers do not claim the same job simultaneously. Immediately before calling Cloudflare, the job is moved to a non-reclaimable state; an interrupted send is not retried automatically.
- Definitive transient failures retry with backoff; an uncertain Cloudflare send outcome is never automatically retried because that could duplicate the email.
- Marketing is capped at one message per runner per 24 hours.
- The global hourly cap defaults to 50.
- Delivery respects the runner's timezone and quiet hours, defaulting to 8:00 AM through 8:00 PM.
- Paid conversion and opt-out stop pending notices. Cloudflare suppression preflight prevents follow-ups to bounced or complaining recipients.
- The notice copy is selected from an approved template. The model cannot invent claims or change eligibility.

## Launch sequence

1. Apply the migration.
2. Deploy the application with all required secrets.
3. Confirm the Cloudflare token can read Email Sending suppressions, and test clear and suppressed recipient paths without sending to a runner.
4. Confirm the admin readiness panel is green.
5. Leave delivery disabled and inspect segment counts and copy.
6. Set `drip_campaigns_enabled=true` while dry-run remains true. Confirm only unfinished-Checkout jobs reconcile without sending.
7. Confirm this exact notice is permitted by Cloudflare's transactional-only policy. Until then, keep dry-run enabled. If permitted, set `CLOUDFLARE_CHECKOUT_NOTICE_POLICY_APPROVED=true` and disable dry-run for a 5 percent rollout.
8. Review delivery, click, trial, bounce, complaint and holdout metrics for at least seven days.
9. Increase rollout gradually only if guardrails remain healthy.

Rollback is immediate: set `drip_campaigns_enabled=false`. Pending jobs remain stored and are not delivered.

The dashboard's unfinished-Checkout prompt is independent of this email rollout. It is shown from a server-recorded Checkout session and does not require marketing consent. Lifecycle email requires explicit `marketing_consent_status=consented`; no-consent runners are excluded even if they see the in-app prompt.
