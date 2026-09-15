# Twilio WhatsApp preview

This integration belongs to `codex/cloudflare-coach` / `new.aitracker.run`. Real running data is authorized through the main site's dedicated read-only MCP OAuth service. The main deployment is unchanged. No iMessage or SMS integration is included.

WhatsApp replies use `gpt-5.6-luna` with low reasoning effort, one Responses API request and the full existing authorized context. Browser chat and voice models are unchanged. Compare live AI timings and answer quality after a model change; queue, context-loading and handset delivery delays are separate. No additional secret or database migration is required for this model switch.

## Configure and deploy

### Chat reminders

Apply `0010_whatsapp_reminders.sql` to the **coach** D1 database before deploying.
No new secret, main-site schema change, or MCP write scope is required.

Real-account chats expose only `create_whatsapp_reminder`, `list_whatsapp_reminders`,
and `cancel_whatsapp_reminder`. Try “Remind me to get ready for my run tomorrow at 7am.”
Clear requests save immediately, with a brief receipt showing the title, date and timezone.
No code or extra yes is needed. Unclear requests get one short question. Reply `cancel`
or `undo` within ten minutes to cancel the latest reminder; repeated undo never cancels
older reminders. `REMINDERS` lists chat-created reminders for specific cancellation requests.
These reminders are separate from web/email reminders. Plan changes still require review.

The signed inbound message reference determines a stable reminder primary key, preventing
duplicate creation even during concurrent retries. No new migration is needed beyond 0010.
Existing unconfirmed drafts are not silently activated; already-issued explicit codes remain
valid until their original expiry. Running context is read-only and cannot choose identity.

Limits: one-time only, ten pending, at least one minute ahead, at most seven days and
within the active session/OAuth lifetime. Without an approved template, creation is
limited to the next 23 hours. Outside the active chat window an approved generic
notification is used, not arbitrary private text. Reply `REMINDERS` to view its content.
Cron checks due reminders each minute. Authorization and link generations are checked
at creation, cancellation, and dispatch; STOP cancels pending reminders. Claims are
atomic and uncertain provider outcomes are not resent. Status callbacks record delivery
separately from Twilio API acceptance. No provider secrets or reminder text enter logs.

Test a reminder five minutes ahead, list it, and verify delivery on the phone.
Then test a cancellation. Automated tests mock providers and cannot verify handset delivery.
To roll back, retain the additive table and deploy the preceding coach version; pending
chat reminders will not dispatch until a compatible version is restored. Do not disable
the shared cron or change the main-site deployment.

Add these encrypted secrets to Worker `aitracker-coach-preview` in Cloudflare Settings > Variables and Secrets. Do not put credentials in Git or chat:

| Name | Value |
| --- | --- |
| TWILIO_ACCOUNT_SID | Your account SID, beginning AC |
| TWILIO_AUTH_TOKEN | That account's Auth Token, also used for webhook validation |
| TWILIO_WHATSAPP_FROM | Your approved sender, formatted whatsapp:+15551234567 |
| TWILIO_WHATSAPP_CONTENT_SID | Approved fixed reminder-notification template SID, beginning HX |
| WHATSAPP_GRANT_KEY | 32 cryptographically random bytes encoded as 64 lowercase hex characters; encrypts dedicated OAuth grants |

OPENAI_API_KEY and PUBLIC_ORIGIN remain unchanged. Missing Twilio configuration disables WhatsApp without disabling email. The template secret can be absent for reply-window-only sandbox tests (Wrangler may warn); a valid template is required for reminders outside the reply window. No actual secret is supplied by this change.

1. Apply additive migrations through `0009_whatsapp_immediate.sql` to the coach D1, not the main database:
   `npx wrangler d1 migrations apply aitracker-coach-preview --remote`
2. Create the dedicated queue once: `npx wrangler queues create aitracker-coach-whatsapp`. Run `npm run build` (or the existing Vite build), then `npx wrangler deploy --keep-vars` from this app. The config registers the producer, consumer and SQLite-backed `WhatsAppDispatch` Durable Object automatically. No new secrets are needed.
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
4. Text a question to WhatsApp. The signed webhook saves it to D1, starts a typing indicator and wakes the runner's dedicated Durable Object through internal RPC. A persisted alarm starts processing immediately, outside the webhook lifetime. A Queue wakeup delayed by 15 seconds provides recovery; if immediate dispatch fails, the queue is published with no delay. Either path loads owner-scoped context and history and makes one AI request. Connection-time preloading and a two-minute encrypted context cache avoid repeated snapshot/plan reads in an active conversation. Every reply still validates live OAuth access before loading context and before sending. Send `/refresh` (optionally followed by a question) after a sync or plan change to reload immediately. Typing is refreshed every 18 seconds while preparing the reply, then stopped before sending. It is best-effort (Twilio beta); failure never blocks coaching. Provider processing still takes time, so this is low-latency messaging, not a guaranteed instantaneous response. Media/voice notes are not downloaded or transcribed.
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
- The immediate alarm and Queue recovery share that same inbox claim and D1 lease. Duplicate alarms, late RPC completion and delayed Queue delivery cannot replay completed sends. The Durable Object stores only the opaque session reference, validates it against its deterministic object ID, and exposes no public HTTP endpoint. An idle runner has no periodic alarm. Busy processing retries via alarm while unexpired pending work exists. The queue's concurrency limit applies to recovery, not to independent per-runner alarms; existing global AI/send budgets still apply.
- Cron now only republishes stranded pending work and expires stale claims; it is not the normal WhatsApp path. Queue publication failures return an error so a webhook retry can republish the existing inbox row. Duplicate wakeups cannot repeat a completed send. Queue retry exhaustion leaves the D1 outbox available for recovery. The existing email/launch scheduler remains separate and unchanged.
- `whatsapp_inbox` stores dispatch/context/AI/delivery milliseconds, start/finish timestamps, processing path (`direct` or `queue`) and a fixed failure stage. `queue_ms` now measures webhook receipt to processing start using millisecond timestamps, including ingress checks; older rows used second-resolution insertion timestamps. Typing attempts store accepted counts, HTTP status, allowlisted numeric error code, outcome and duration. Structured logs never contain runner IDs, phone numbers, messages, bearer tokens or provider response bodies. Accepted typing means Twilio returned `success:true`, not that handset display was verified. Reply timings measure Twilio API acceptance, not delivery to the handset. Sampled Worker logs are supplementary; D1 timings cover every processed inbox row.
- STOP must remain supported. Disable automatic START opt-in for the app: reconnect through the browser instead. A stale STOP cannot be replayed after reconnection because its SID is recorded.
- Plain CANCEL is an application reminder undo, not an application disconnect command.
  Provider-reported `OptOutType=STOP` is always honored. If Twilio Advanced Opt-Out is
  configured to treat CANCEL as STOP, use UNDO for reminders or adjust that provider keyword
  configuration; the app must never override a provider unsubscribe.
- To disable WhatsApp only, remove TWILIO_WHATSAPP_FROM and redeploy. Do not disable the shared cron, which also handles email and the separately controlled waitlist. No launch campaign is enabled by this integration.

Live end-to-end delivery must be tested after credentials and sender/template setup. Automated tests use fake Twilio and do not send messages.

## Latency verification and rollback

Apply `0008_whatsapp_context.sql` to the coach D1 database before deploying this version. It adds only an encrypted cache table and expiry index, with no main-site database changes or new secrets. Cache entries use session ID plus OAuth grant generation as AES-GCM authenticated data. They expire two minutes from fetch start, are deleted on disconnect/re-consent and pruned by cron. A missing, oversized or corrupt cache loads normally; authorization failures never fall back to cached data. Preloading uses the same per-runner conversation lease as replies to avoid competing refresh-token rotations. It sends no unsolicited coaching message. The first message after the cache expires still needs a fresh data fetch.

Send two short questions from the linked test account. Check that replies arrive in order, without a minute-boundary wait, and that each ordinary reply uses one AI call. Query only operational columns:

```sql
SELECT status, queue_ms, context_ms, ai_ms, delivery_ms, failure_stage,
       processing_path, typing_attempts, typing_accepted,
       typing_last_status, typing_last_code, typing_last_outcome, typing_last_ms,
       finished_at_ms - started_at_ms AS processing_ms
FROM whatsapp_inbox ORDER BY created_at DESC LIMIT 20;
```

Run `node --test tests/whatsapp-runtime.test.mjs` from this app to verify a signed webhook reaches an actual local Workers Queue consumer without cron (mock providers). Unit tests cover ownership, concurrent ordering, duplicates, publish recovery, STOP and revoked OAuth access.

To revert the immediate path, deploy a forward compatibility release that retains the `WhatsAppDispatch` export, binding and migration but routes wakeups only to the Queue. Do not delete the Durable Object namespace or assume a pre-migration version can be rolled back directly. Existing alarms and queue consumers share the D1 lease, so draining overlap remains safe. Leave additive D1 columns in place. Do not delete pending rows or OAuth grants, remove the main backend binding, change the main deployment, or disable the shared email cron.
