# Lifecycle campaigns

AITracker's lifecycle campaign service sends consented runners a small number of relevant emails based on their current product state. It is separate from account, billing, post-run and requested service messages.

## Safe rollout state

Migration `0003_lifecycle_campaigns.sql` explicitly sets:

- `drip_campaigns_enabled=false`
- `drip_campaigns_dry_run=true`
- `drip_campaigns_rollout_percent=5`
- `drip_campaigns_holdout_percent=10`
- `drip_campaigns_hourly_limit=50`

Applying the migration cannot start delivery. Delivery requires both `enabled=true` and `dry_run=false`. The server refuses to disable dry-run unless all readiness checks pass.

## Required production secrets

- `MARKETING_LINK_SIGNING_SECRET`: at least 32 random characters. It signs click, attribution and unsubscribe tokens.
- `RESEND_API_KEY`: Resend API key used for delivery.
- `RESEND_FROM_EMAIL`: verified sender, for example `AITracker <coach@aitracker.run>`.
- `RESEND_WEBHOOK_SECRET`: signing secret from the Resend webhook configuration.
- `PUBLIC_APP_URL`: canonical deployment URL. Production should use `https://aitracker.run`.

Configure Resend to send `email.delivered`, `email.bounced` and `email.complained` events to:

`https://aitracker.run/api/webhooks/resend`

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

The current campaign version is 2. Cohorts and copy variants are deterministic, so autoscaled instances assign the same runner consistently.

## Delivery controls

- Only explicit `marketing_consent_status=consented` users are messageable.
- One active lifecycle campaign is allowed per runner.
- Unique job keys prevent duplicate steps.
- PostgreSQL `FOR UPDATE SKIP LOCKED` leasing prevents autoscaled workers from claiming the same job.
- Failed delivery retries up to five times with exponential backoff.
- Marketing is capped at one message per runner per 24 hours.
- The global hourly cap defaults to 50.
- Delivery respects the runner's timezone and quiet hours, defaulting to 8:00 AM through 8:00 PM.
- Paid conversion, opt-out, bounce and complaint immediately stop pending campaigns.
- Marketing copy is selected from approved templates. The model cannot invent claims or change eligibility.

## Launch sequence

1. Apply the migration.
2. Deploy the application with all required secrets.
3. Configure and test the Resend webhook.
4. Confirm the admin readiness panel is green.
5. Leave delivery disabled and inspect segment counts and copy.
6. Set `drip_campaigns_enabled=true` while dry-run remains true. Confirm jobs reconcile without sending.
7. Disable dry-run for a 5 percent rollout.
8. Review delivery, click, trial, bounce, complaint and holdout metrics for at least seven days.
9. Increase rollout gradually only if guardrails remain healthy.

Rollback is immediate: set `drip_campaigns_enabled=false`. Pending jobs remain stored and are not delivered.
