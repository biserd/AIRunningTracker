# Signup follow-ups: days 1, 7 and 14

Owner-requested sequence, using the existing Cloudflare Email Service transport. These are promotional follow-ups, not transactional messages. Cloudflare's published transactional-only restriction remains a provider/account risk; the feature flag records application configuration, not Cloudflare approval. Do not set `CLOUDFLARE_CHECKOUT_NOTICE_POLICY_APPROVED` to represent approval of this sequence.

## Timing and audience

- `signup_unpaid`, version 3, steps `DAY1`, `DAY7`, `DAY14`.
- Due 24, 168 and 336 hours after the original signup date, not after enrollment, last visit or Strava connection.
- Each step expires three days after its due time. Missed historical steps are skipped; accounts at least 17 days old are not backfilled.
- Only recorded marketing consent, a usable email and a non-Premium/non-trial account qualify. Opt-outs, delivery suppression, admins, unknown billing state, past-due/unpaid customers and paid-through cancellations are excluded.
- Apple entitlements are resolved again through `storage.getUser` before sending, including when the stored web plan is Free.
- Premium conversion and unsubscribe cancel pending jobs. The recipient is rechecked after provider suppression preflight, immediately before sending.
- Existing rollout/holdout settings are respected. Launch configuration is 100% of eligible recipients, 0% holdout and at most 25 accepted sends/hour. This is not 100% of all registered users.
- Default quiet hours are 20:00–08:00 in the runner's timezone. No more than one job-recorded email per recipient per 24 hours.

## Delivery and links

The existing authenticated Cloudflare sender, suppression checks, signed account links, one-click unsubscribe headers and visible unsubscribe footer are retained. Message links use the existing scanner-resistant confirmation page; the recipient does not have to be logged in already. No prices are hardcoded into the sequence; the CTA opens the current pricing page.

An atomic, owner/lease-conditional database write marks the email attempt terminal before the network send. Timeouts and unknown outcomes are not automatically retried. Explicit 429 responses, unavailable suppression checks and soft-bounce suppression can retry within the step's validity window. Accepted/queued mail is counted as sent, not proven inbox delivery.

## Configuration and operations

`ENABLE_SIGNUP_PAYMENT_REMINDERS=true` selects this narrow sequence. The worker still requires a configured sender, signing secret, a verified suppression lookup, `drip_campaigns_enabled=true` and `drip_campaigns_dry_run=false`. Legacy promotional segment templates remain disabled. Existing checkout-notice mode is unchanged when the new flag is off.

The worker reloads persisted operational settings every check. `drip_campaigns_runtime_status` stores a safe readiness/run summary for deployment verification without exposing credentials or recipient data. Pause immediately with `drip_campaigns_enabled=false`; do not weaken suppression or consent checks.

Old legacy pending jobs are cancelled, not deleted or sent as a backlog. Existing users and consent records are not changed. No D1 schema migration is needed.

## Verification

- Signup timing/exclusion and service tests cover the complete sequence, exact signup anchors, deduplication, stale steps, Premium/Apple access, trials, opt-outs, suppression, quiet hours and unknown outcomes.
- Synthetic D1 integration uses the real application ORM, email-job storage, atomic send claim and Apple ledger; every external provider request is blocked.
- Email tests verify the feature's default-off allowlist, suppression failure paths, final eligibility callback and one-click unsubscribe headers.
