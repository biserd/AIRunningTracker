# Cloudflare production cutover, September 13, 2026

## Current state

- `aitracker.run/*` and `www.aitracker.run/*` route to `aitracker-main`.
- Production Worker version: `97e0344b-95d6-45e7-886e-dffbb47f2b2c`.
- Account: `73d71a2bef58f7469ecb48e2b8e84c0e`.
- Verified aitracker.run zone: `210ac2ad4e37375dacd9d1aa1234d9d8`.
- Existing production Neon database retained; no runner data migration or new SQL
  was performed during this cutover.
- Public assets remain in `aitracker-main-assets` R2.
- `new.aitracker.run` remains the separate preview deployment.
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
Worker routes be removed. The original proxied Replit DNS origin was left intact
(`34.111.179.208`; www CNAME to aitracker.run), enabling routing rollback. Do not
touch preview, mail, verification, or unrelated domains' DNS records.

Production remains pinned to the tested immutable staging image digest in
`apps/api-cloudflare/container/wrangler.production.jsonc`. Git builds deploy staging,
not production. Promote a new tested digest deliberately; do not silently replace
the production image when staging changes.
