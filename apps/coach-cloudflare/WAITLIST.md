# Coach launch waitlist

Homepage `/` is the promotional landing page, `/preview` retains the working sample-data coach. Existing reminder unsubscribe fragments still work on the homepage. The preview remains noindex until a separate SEO launch decision.

Migration `0004_waitlist.sql` adds `coach_waitlist` (normalized unique email, consent version/time, unsubscribe token, delivery state) and `coach_launch` (disabled by default). Neither table expires with demo sessions. Only Cloudflare administrators can query the list; no public listing or campaign-trigger API exists. Do not export unsubscribe tokens or log email bodies.

Signup is single opt-in with an unchecked required consent box, honeypot, same-origin check, bounded JSON and IP throttling. Duplicate addresses return the same response and never reactivate unsubscribed recipients. Before promoting at scale, add email verification or Turnstile to improve abuse resistance. Consent covers one launch announcement, not recurring marketing.

## Launch procedure

1. Finish real-account onboarding and update the homepage so the destination is no longer just a waitlist. Review the fixed email copy in `worker/waitlist.ts`.
2. Verify Cloudflare Email Sending and the configured sender. Test delivery to an inbox you own before enabling this campaign. No real email delivery is established by unit tests.
3. Inspect counts in Cloudflare D1 console:

```sql
SELECT launch_status, COUNT(*) FROM coach_waitlist WHERE unsubscribed_at IS NULL GROUP BY launch_status;
```

4. When explicitly ready to announce, execute:

```sql
UPDATE coach_launch SET enabled=1, cutoff_at=unixepoch() WHERE id=1;
```

The existing minute cron automatically sends up to three eligible announcements per run. Only signups at or before the cutoff qualify. Atomic claims prevent overlapping cron runs from sending the same row. `accepted` means accepted by the email service, not confirmed inbox delivery. Unsubscribes are rechecked during the claim; an already in-flight email may still arrive. Tokens use URL fragments and require explicit POST confirmation.

Pause further claims:

```sql
UPDATE coach_launch SET enabled=0 WHERE id=1;
```

Unknown/failing deliveries become `review`; stale `sending` rows become `review` after ten minutes. Do not reset them to pending without checking provider logs for acceptance to avoid duplicates. No automatic retry or recurring campaign is enabled. Add delivery/bounce/complaint handling before expanding beyond a one-time launch.

For a pre-launch withdrawal requested through support, use a bound email parameter to set `unsubscribed_at=unixepoch()` on the matching row. Requests must be handled before launch. Review retention and delete waitlist personal data when the launch campaign no longer needs it.
