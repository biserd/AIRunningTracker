# Cloudflare production cutover, September 13, 2026

## Current state

- `aitracker.run/*` and `www.aitracker.run/*` route to `aitracker-main`.
- Production Worker version: `3df4bc23-27d2-4293-a15f-cb7c151139e7`.
- Production image digest: `sha256:a3046219ff46aa36a3e87a8c4039adf0d48594a26545d73e8d8ad81ce43b5d5a`.
- New outbound email now uses Cloudflare Email Service. The controlled inbox test passed; see `CLOUDFLARE_EMAIL_CUTOVER.md`. Earlier Resend verification entries below are historical, not the current sending provider.
- Account: `73d71a2bef58f7469ecb48e2b8e84c0e`.
- Verified aitracker.run zone: `210ac2ad4e37375dacd9d1aa1234d9d8`.
- Existing production Neon database retained; no runner data migration or new SQL
  was performed during this cutover.
- Public assets remain in `aitracker-main-assets` R2.
- `new.aitracker.run` remains the separate preview deployment.
- At the user's request, the Replit DNS origin was removed: the proxied apex A
  record now uses Cloudflare's reserved originless placeholder `192.0.2.0`, not
  `34.111.179.208`. The proxied `www` CNAME still points to the apex.
- The obsolete apex TXT `replit-verify=b13af9a6-2dde-4df5-bbce-bbaaba898ea4`
  was deleted with explicit confirmation. It can be recreated manually from this
  value if required. All other DNS records were left unchanged.
- After DNS cleanup, the homepage, health, race predictor, OAuth metadata and
  preview returned HTTP 200; `www` redirected to the working apex. The DNS UI
  contained no remaining Replit target or verification record.
- Replit production shows **Paused**, not unpublished or deleted. Replit explicitly
  warns that billing continues while paused. Do not treat this as cancellation.
- `APP_ROLE=jobs`, stable container identity `production-live`, every-minute cron
  keepalive. The database advisory lock fences scheduler ownership.
- Marketing campaigns remain disabled. The previously unset proactive-coach and
  notification-delivery flags remain unset; this is not a new messaging rollout.

## Handover evidence

1. Replit admin queue: zero pending, processing and delayed jobs before handover.
2. Auth-only canary accepted the existing biserd@gmail.com session without a new
   login, then full-site routing was applied while Cloudflare jobs remained off.
3. Dashboard, activities and training plans rendered with existing runner data.
4. Replit was paused through its Publishing settings. Its UI confirmed Paused.
5. Cloudflare scheduler was enabled only afterward. Its queue processed seven
   live STRAVA_WEBHOOK jobs with zero failed/pending/processing jobs observed.
6. Public health, homepage, race predictor, robots.txt, sitemap, OAuth metadata and
   Stripe public configuration returned HTTP 200. Public MCP initialize returned
   200; anonymous private MCP returned 401.
7. Prior private-runtime Resend tests returned 200 for a signed no-op and 401 for
   tampered bytes. The user confirmed receipt of the single approved delivery
   email. The staging test-send capability has now been disabled.

The admin-only staging checks now query the exact scheduler advisory lock and
aggregate durable job counts. These are reads, not a trigger or queue mutation.

The September 13 11:05 EDT admin check showed exactly one scheduler lease and
26 completed jobs, with no other queue statuses listed. The production image
rollout completed at 14:57:13 UTC, with one healthy active instance and no rollout
errors. The later instance listing identified `production-live` as running version
2 and the previous preflight instance as inactive. This is rollout evidence, not
a complete scheduler crash/failover rehearsal.

## Billing investigation deferred by user

On September 13 the user requested that billing-handler work be deferred while
other migration work continues. Do not automatically promote the subsequent
diagnostic build or keep opening billing portal sessions.

- The live Stripe billing portal opens. No payment or subscription was changed.
- Actual Stripe webhook deliveries returned HTTP 400. A bounded edge diagnostic
  confirmed that the signature header was present and the application returned
  its generic handler-error response.
- Explicit verified TLS was added to StripeSync's separate database pool, but
  the HTTP 400 persisted. The root cause is not established.
- Successful checkout/payment capture and automatic Premium activation have NOT
  been verified. A working portal is not evidence of either. Failed webhook
  processing can prevent entitlements from updating after a successful charge.
- Commit `60cdee1` adds a further runtime marker/diagnostic for staging. It has
  not been promoted to production. Billing remains an unresolved migration risk.

## Still not established

- A controlled live Stripe checkout/subscription webhook round trip and Hermes
  delivery round trip have not been performed after cutover.
- Database restore and live scheduler failover have not been rehearsed.
- A longer observation window is required before permanently retiring Replit.
- Cloudflare's instance listing reported `production-live` as stopped while the
  application queue showed increasing uptime and successful processing. Its SSH
  probe failed. Investigate this control-plane discrepancy; do not infer a
  successful restart/failover test from the live request checks.

## Rollback constraints

Keep Replit paused until rollback is deliberately initiated. Never resume it while
Cloudflare owns scheduled work. First stop new Cloudflare job ingress, drain or
record durable pending/in-flight jobs, disable cron, and stop the jobs container.
Verify the scheduler database lease is released before resuming Replit. Merely
changing APP_ROLE or removing a route is not proof that a running container stopped.
Replit's old in-memory queue cannot automatically consume the new durable queue.

Only after scheduler ownership is safely transferred should the two aitracker.run
Worker routes be removed. The user subsequently removed the Replit DNS origin,
so removing the Worker routes alone is NOT a working rollback. A deliberate
rollback would also need to restore the old proxied apex A target `34.111.179.208`
and, if required by Replit, the verification TXT recorded above. Do not touch
preview, mail, Google verification, or unrelated domains' DNS records.

Production remains pinned to the tested immutable staging image digest in
`apps/api-cloudflare/container/wrangler.production.jsonc`. Git builds deploy staging,
not production. Promote a new tested digest deliberately; do not silently replace
the production image when staging changes.
