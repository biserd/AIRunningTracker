# Signup follow-ups: days 1, 7 and 14

## Current operator instructions

Delivery must stay OFF (`drip_campaigns_enabled=false`) with dry-run ON until the owner enables it manually in Admin. Deployment is not authorization to turn sending on. Do not re-run the historical prepare/enable scripts as part of a release.

The owner subsequently expanded this sequence to include `unknown` consent as well as recorded opt-ins. Explicit opt-outs, unsubscribes and delivery suppression still win. Stored consent values are never rewritten. This applies only to this signup sequence; other marketing flows keep their existing consent requirements.

Audience update deployed and verified at `2026-11-07T21:01:18Z`: runtime `9d3c3ba`, container version 44, image `sha256:d7c4f4180da37d7ea6292f7c1667ae3212f36f1ce09bee8fa7c2da028ce197e9`, Worker `84a2bde5-6825-4f17-ae5d-f5d355e6019e`. Admin shows the expanded audience policy. Twenty targeted tests and the real-ORM synthetic D1 test passed, including unknown-consent enrollment without modifying consent and unchanged opt-out/Apple/payment exclusions. Production readback confirmed delivery OFF, dry-run ON and zero campaign emails sent. No activation scripts were executed for this release.

Owner-requested sequence, using the existing Cloudflare Email Service transport. These are promotional follow-ups, not transactional messages. Cloudflare's published transactional-only restriction remains a provider/account risk; the feature flag records application configuration, not Cloudflare approval. Do not set `CLOUDFLARE_CHECKOUT_NOTICE_POLICY_APPROVED` to represent approval of this sequence.

## Timing and audience

- `signup_unpaid`, version 3, steps `DAY1`, `DAY7`, `DAY14`.
- Due 24, 168 and 336 hours after the original signup date, not after enrollment, last visit or Strava connection.
- Each step has a three-day grace period. A deadline falling outside permitted sending hours extends through the next daytime opening plus one hour, so quiet hours do not make a reminder expire overnight. Other missed historical steps are skipped.
- Recorded opt-in or unknown consent, a usable email and a non-Premium/non-trial account qualify. Explicit opt-outs, unsubscribes, delivery suppression, admins, unknown billing state, past-due/unpaid customers and paid-through cancellations are excluded.
- Apple entitlements are resolved again through `storage.getUser` before sending, including when the stored web plan is Free.
- Premium conversion and unsubscribe cancel pending jobs. The recipient is rechecked after provider suppression preflight, immediately before sending.
- Existing rollout/holdout settings are respected. Launch configuration is 100% of eligible recipients, 0% holdout and at most 25 accepted sends/hour. This is not 100% of all registered users.
- Delivery is limited to 09:00–18:00 in the saved local timezone, additionally respecting custom quiet hours (default 20:00–08:00). UTC/default/missing or invalid timezone uses America/New_York for this campaign only; no profile timezone is overwritten. IANA zones and daylight-saving changes are respected. No more than one job-recorded email per recipient per 24 hours.
- Operator-selected final holds are stored in `drip_campaigns_preserved_final_users` and require an existing pending/processing/retry `DAY14` job with the exact account-bound dedupe key. These holds survive a pause without expiring; they never override payment, opt-out, unsubscribe, suppression, rollout or one-send protections. A completed/cancelled/sent job is not reactivated. The hold reservation SQL refuses to run unless sending is OFF and dry-run ON.

## Delivery and links

The existing authenticated Cloudflare sender, suppression checks, signed account links, one-click unsubscribe headers and visible unsubscribe footer are retained. This sequence's footer says the recipient created an account, not that they opted in. Message links use the existing scanner-resistant confirmation page; the recipient does not have to be logged in already. No prices are hardcoded into the sequence; the CTA opens the current pricing page.

An atomic, owner/lease-conditional database write marks the email attempt terminal before the network send. Timeouts and unknown outcomes are not automatically retried. Explicit 429 responses, unavailable suppression checks and soft-bounce suppression can retry within the step's validity window. Accepted/queued mail is counted as sent, not proven inbox delivery.

## Configuration and operations

`ENABLE_SIGNUP_PAYMENT_REMINDERS=true` selects this narrow sequence. The worker still requires a configured sender, signing secret, a verified suppression lookup, `drip_campaigns_enabled=true` and `drip_campaigns_dry_run=false`. Legacy promotional segment templates remain disabled. Existing checkout-notice mode is unchanged when the new flag is off.

The worker reloads persisted operational settings every check. `drip_campaigns_runtime_status` stores a safe readiness/run summary for deployment verification without exposing credentials or recipient data. Pause with `drip_campaigns_enabled=false`; never override explicit opt-outs, unsubscribes or suppression.

Old legacy pending jobs are cancelled, not deleted or sent as a backlog. Existing users and consent records are not changed. No D1 schema migration is needed.

## Verification

- Signup timing/exclusion and service tests cover the complete sequence, exact signup anchors, deduplication, stale steps, Premium/Apple access, trials, opt-outs, suppression, quiet hours and unknown outcomes.
- Synthetic D1 integration uses the real application ORM, email-job storage, atomic send claim and Apple ledger; every external provider request is blocked.
- Email tests verify the feature's default-off allowlist, suppression failure paths, final eligibility callback and one-click unsubscribe headers.

## Daytime delivery and final reminder hold release

- Combined runtime source `22e8d77` preserves the parallel Garmin sync changes. Thirty-seven targeted tests (including Garmin), the synthetic real-ORM D1 integration and the production bundle passed.
- Production image `sha256:81f1176a49148a7073ec1c77d70a5ccb4531ea8b367452dae86ab840f85606e9`, container version 47, Worker `daf0f37f-35b5-4f7a-a8d7-080d31903942`. Existing Garmin enablement and secrets were preserved.
- Live signup daytime/admin verification passed at `2026-11-07T21:31:32.753Z`; WhatsApp settings verification also passed.
- At `2026-11-07T21:34Z`, the owner-selected account's single DAY14 reminder was reserved and read back as pending with no sent timestamp. Its private hold survives the pause; billing, opt-out and suppression checks still apply when delivery is enabled. No personal email address is stored in this release note.
- Production readback confirmed `drip_campaigns_enabled=false`, `drip_campaigns_dry_run=true`, zero signup campaign emails sent, and unchanged profile timezone/consent. No activation scripts were executed.

## Historical initial production release (subsequently paused by owner)

- Runtime source `39ba6c6`, image `sha256:5684ced2d79692cfba900b589b1f0961d0abf5fd8773d30615b0e625d51572e2`, container version 43.
- Worker `8a6a5620-cb9a-40fb-8a06-b89801e397fc`; stable `production-live` identity retained. The non-secret signup-reminder flag is explicitly forwarded from the current Worker environment when ensuring the runtime.
- The live suppression probe, sender configuration, signing secret and campaign flag passed readiness. Activation used the readiness-guarded SQL script; no Cloudflare policy-approval flag was asserted.
- Production settings: enabled, dry-run off, 100% eligible rollout, 0% holdout, 25 accepted messages/hour.
- 265 old pending legacy jobs were cancelled with an audit reason; job history and customer records were not deleted.
- At release, eight consented Free accounts existed, all outside the signup sequence window. No historical blast was queued. Unknown-consent accounts were not opted in automatically.
- Eighteen targeted tests and the synthetic D1 integration passed; TypeScript remains at 34 pre-existing diagnostics, with none in the new feature files. Production signup admin assets, admin authentication, WhatsApp settings and existing public tool/Strava checks passed.
- First confirmed live worker check: `2026-11-07T20:27:44.368Z`, signup reminders enabled, worker active, dry-run false, readiness true, zero processed/failed jobs and no signup-reminder backlog.
