# Garmin connection admin notification

- Successful browser OAuth authorization sends `Garmin Connected - RunAnalytics` to `hello@bigappledigital.nyc`, the existing Strava signup admin destination, using the configured Cloudflare email transport and sender.
- Includes the RunAnalytics account ID, name, email and connection time in America/New_York. User-supplied HTML is escaped. No Garmin identity, provider tokens, activity details, health or sleep data is emailed.
- Trigger runs only after the connection save succeeds with `ACTIVITY_EXPORT`. Missing activity permission, denied authorization, invalid state, exchange/save failures and callback replay do not send an alert. A new, successful reauthorization/reconnection is a new event and can notify again.
- One delivery attempt per successful OAuth flow. The existing single-use, account-bound OAuth state prevents repeated callbacks from alerting twice. Network timeouts and unknown outcomes are not retried. This is a best-effort operational alert, not a durable notification queue; a delivery failure logs only `garmin_admin_notification_failed` and does not roll back the connection or change its success redirect.
- Token refreshes, run pushes, sync-status reads, separate health consent, deployments and existing connections do not send alerts. No historical notifications are backfilled.
- Callback hook and sender use injected dependencies in tests; no real account was connected and no real admin test email was sent. Thirty-five Garmin/activity/health/history/Cloudflare-email tests and the D1 bundle passed, including failed/replayed callbacks, an email-provider failure and HTML escaping.
- No migration, new database, new email provider, user-consent or campaign-switch changes.
