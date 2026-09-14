# Twilio WhatsApp preview

This integration belongs to `codex/cloudflare-coach` / `new.aitracker.run`. Real running data is authorized through the main site's dedicated read-only MCP OAuth service. The main deployment is unchanged. No iMessage or SMS integration is included.

WhatsApp replies use `gpt-5.6-luna` with low reasoning effort, one Responses API request and the full existing authorized context. Browser chat and voice models are unchanged. Compare live AI timings and answer quality after a model change; queue, context-loading and handset delivery delays are separate. No additional secret or database migration is required for this model switch.

## Configure and deploy

Add these encrypted secrets to Worker `aitracker-coach-preview` in Cloudflare Settings > Variables and Secrets. Do not put credentials in Git or chat:

| Name | Value |
| --- | --- |
| TWILIO_ACCOUNT_SID | Your account SID, beginning AC |
| TWILIO_AUTH_TOKEN | That account's Auth Token, also used for webhook validation |
| TWILIO_WHATSAPP_FROM | Your approved sender, formatted whatsapp:+15551234567 |
| TWILIO_WHATSAPP_CONTENT_SID | Approved fixed reminder-notification template SID, beginning HX |
| WHATSAPP_GRANT_KEY | 32 cryptographically random bytes encoded as 64 lowercase hex characters; encrypts dedicated OAuth grants |

OPENAI_API_KEY and PUBLIC_ORIGIN remain unchanged. Missing Twilio configuration disables WhatsApp without disabling email. The template secret can be absent for reply-window-only sandbox tests (Wrangler may warn); a valid template is required for reminders outside the reply window. No actual secret is supplied by this change.

1. Apply additive migrations through `0007_whatsapp_realtime.sql` to the coach D1, not the main database:
   `npx wrangler d1 migrations apply aitracker-coach-preview --remote`
2. Create the dedicated queue once: `npx wrangler queues create aitracker-coach-whatsapp`. Run `npm run build` (or the existing Vite build), then `npx wrangler deploy --keep-vars` from this app. The config registers the producer and consumer automatically. No new secrets are needed.
3. Configure the WhatsApp sender or sandbox **When a message comes in** webhook, method POST:
   `https://new.aitracker.run/api/whatsapp/inbound`
4. Status callback is supplied on outbound API requests automatically:
   `https://new.aitracker.run/api/whatsapp/status`
   If configuring it in Twilio, also use POST. Do not append query parameters or trailing slashes. Signature validation uses PUBLIC_ORIGIN, not an untrusted Host header. Any Cloudflare WAF challenge on these paths must be addressed with a narrow rule, never a sitewide security bypass.
5. In the Sandbox, every test number must first send Twilio's sandbox join phrase. Then use the separate AITracker linking message.

## Template

Create a fixed text template, without variables, and obtain Meta approval before setting its HX SID. Suggested copy:

> Your requested AITracker running reminder is ready. Open your preview to view it: https://new.aitracker.run/preview. Reply STOP to stop WhatsApp reminders.

Approval/category is determined by Meta, not this app. Outside a conservative 23-hour reply window the app sends only that template, not the private reminder body. Inside the window it sends the confirmed reminder text. No automatic email fallback or double-send. Missing template/configuration fails closed; inspect reminder status instead of repeatedly retrying.

## Test as a runner

1. Sign into `/preview` with an active trial/subscription. In Settings, choose **Allow read-only coaching access**. Approve the main-site OAuth consent using the same runner account. The callback must be `https://new.aitracker.run/whatsapp/callback`.
2. Return to Settings and choose **Connect my WhatsApp**. Open the link and send the prefilled LINK message. The random token is single-use and expires in ten minutes. Never share it. Separate email verification is only needed for email/reminder setup, not WhatsApp coaching authorization.
3. Wait for the connection status (polls every five seconds). Ask the browser coach for a reminder, select WhatsApp in the confirmation card and confirm. Only that chosen channel receives it.
4. Text a question to WhatsApp. The signed webhook saves it to D1, starts a typing indicator and immediately publishes an opaque SID to Cloudflare Queues. A consumer starts without waiting for cron, loads owner-scoped context and history, and makes one AI request. Connection-time preloading and a two-minute encrypted context cache avoid repeated snapshot/plan reads in an active conversation. Every reply still validates live OAuth access before loading context and before sending. Send `/refresh` (optionally followed by a question) after a sync or plan change to reload immediately. Typing is refreshed every 18 seconds while preparing the reply, then stopped before sending. It is best-effort (Twilio beta); failure never blocks coaching. Provider processing still takes time, so this is low-latency messaging, not a guaranteed instantaneous response. Media/voice notes are not downloaded or transcribed.
5. Ask for a plan change or reminder in WhatsApp. It should direct you to the browser, not claim it changed anything. Mutations still require the existing on-screen flow.
6. Send STOP, or disconnect in Settings. Pending WhatsApp reminders are cancelled; email remains connected. A message already in flight cannot be recalled. Reconnection requires explicit browser consent and a new token.
7. Check Twilio delivery logs and the app's delivery status. API acceptance is not inbox delivery. A callback that arrives before the provider SID is saved may not appear in the app; Twilio logs remain authoritative.

## Boundaries and operations

- Consent lasts up to 30 days. The phone is uniquely bound to one authenticated runner. The MCP issuer checks entitlement and revocation on every private read. No normal web-session token is persisted for background use. PKCE, single-use state and an email-hash comparison prevent callback/account mix-ups. Access and refresh tokens are encrypted with AES-GCM and the runner session ID as authenticated additional data. Rotate the encryption key only with a planned reconnect of existing users.
- Refresh rotation is claimed with a D1 compare-and-set. An uncertain refresh fails closed and requires reconnection. STOP/disconnect removes the local grant and attempts issuer revocation. A failed remote revoke cannot re-enable local access. An already in-flight delivery cannot be recalled.
- Context includes up to 20 recent activities in 90 days and the active plan's bounded full MCP detail (up to 32 weeks). Missing fields are unknown, not zero. No arbitrary tool names, routes or SQL are accepted. Plan writes and scheduling remain browser-confirmed.
- HMAC-SHA1 validates the full configured URL plus every form parameter, with Web Crypto verification. Unexpected account, sender, signature, duplicate fields, media and oversized input are rejected/limited. Public webhook paths alone bypass browser Origin/cookie checks.
- Durable SID receipts prevent replay of pairing, STOP and messages. Receipts store only message SID and time, retained for replay protection. Other records cascade with preview session cleanup. No raw token is stored, only its SHA-256 digest. Phone numbers are private D1 fields needed for delivery, never API-selected by the model.
- No provider request/response bodies, phone numbers or credentials are intentionally logged. Twilio and Meta process message content. Conversation text is retained with the preview's ordinary session history; queued text is cleared after completion/failure. Disclose this in user consent.
- Limits: five pairing links/session/hour; 20 inbound messages/number/minute; 30 coaching questions/session/day and 300 globally/day; 60 outbound messages/session/day and 500 globally/day. TwiML pairing/help replies may additionally incur Twilio fees. Configure Twilio account spending alerts too.
- Queue batching is one event with zero batching delay, up to ten consumer invocations concurrently. Each consumer drains up to three messages for one runner, then immediately retries its wakeup if more remain. An atomic, renewable five-minute D1 conversation lease serializes each runner; separate runners run independently. Inbox arrival order, not queue delivery order, determines the reply order. A 25-second AI timeout and bounded provider calls keep work within the lease. Pending work older than ten minutes and crashed processing claims older than ten minutes expire. Crashed/ambiguous outbound sends are never retried automatically. This is not an exactly-once-delivery guarantee.
- Cron now only republishes stranded pending work and expires stale claims; it is not the normal WhatsApp path. Queue publication failures return an error so a webhook retry can republish the existing inbox row. Duplicate wakeups cannot repeat a completed send. Queue retry exhaustion leaves the D1 outbox available for recovery. The existing email/launch scheduler remains separate and unchanged.
- `whatsapp_inbox` stores queue/context/AI/delivery milliseconds, start/finish timestamps and a fixed failure stage. Structured logs contain only stages and timing values, no runner IDs, phone numbers, messages, bearer tokens or provider response bodies. These timings measure Twilio API acceptance, not delivery to the handset. Inspect Twilio logs for actual delivery. Sampled Worker logs are supplementary; D1 timings cover every processed inbox row.
- STOP must remain supported. Disable automatic START opt-in for the app: reconnect through the browser instead. A stale STOP cannot be replayed after reconnection because its SID is recorded.
- To disable WhatsApp only, remove TWILIO_WHATSAPP_FROM and redeploy. Do not disable the shared cron, which also handles email and the separately controlled waitlist. No launch campaign is enabled by this integration.

Live end-to-end delivery must be tested after credentials and sender/template setup. Automated tests use fake Twilio and do not send messages.

## Latency verification and rollback

Apply `0008_whatsapp_context.sql` to the coach D1 database before deploying this version. It adds only an encrypted cache table and expiry index, with no main-site database changes or new secrets. Cache entries use session ID plus OAuth grant generation as AES-GCM authenticated data. They expire two minutes from fetch start, are deleted on disconnect/re-consent and pruned by cron. A missing, oversized or corrupt cache loads normally; authorization failures never fall back to cached data. Preloading uses the same per-runner conversation lease as replies to avoid competing refresh-token rotations. It sends no unsolicited coaching message. The first message after the cache expires still needs a fresh data fetch.

Send two short questions from the linked test account. Check that replies arrive in order, without a minute-boundary wait, and that each ordinary reply uses one AI call. Query only operational columns:

```sql
SELECT status, queue_ms, context_ms, ai_ms, delivery_ms, failure_stage,
       finished_at_ms - started_at_ms AS processing_ms
FROM whatsapp_inbox ORDER BY created_at DESC LIMIT 20;
```

Run `node --test tests/whatsapp-runtime.test.mjs` from this app to verify a signed webhook reaches an actual local Workers Queue consumer without cron (mock providers). Unit tests cover ownership, concurrent ordering, duplicates, publish recovery, STOP and revoked OAuth access.

To roll back, redeploy the prior coach Worker version. Leave the additive D1 migration in place. Do not delete pending rows or OAuth grants, remove the main backend binding, change the main deployment, or disable the shared email cron. Check the queue consumer configuration after rollback; the previous release processes pending inbox messages through its cron.
