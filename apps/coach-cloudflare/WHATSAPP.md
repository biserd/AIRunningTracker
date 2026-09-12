# Twilio WhatsApp preview

This integration belongs only to `codex/cloudflare-coach` / `new.aitracker.run`. No main-site account, subscription or Strava data is connected. No iMessage or SMS integration is included.

## Configure and deploy

Add these encrypted secrets to Worker `aitracker-coach-preview` in Cloudflare Settings > Variables and Secrets. Do not put credentials in Git or chat:

| Name | Value |
| --- | --- |
| TWILIO_ACCOUNT_SID | Your account SID, beginning AC |
| TWILIO_AUTH_TOKEN | That account's Auth Token, also used for webhook validation |
| TWILIO_WHATSAPP_FROM | Your approved sender, formatted whatsapp:+15551234567 |
| TWILIO_WHATSAPP_CONTENT_SID | Approved fixed reminder-notification template SID, beginning HX |

OPENAI_API_KEY and PUBLIC_ORIGIN remain unchanged. Missing Twilio configuration disables WhatsApp without disabling email. The template secret can be absent for reply-window-only sandbox tests (Wrangler may warn); a valid template is required for reminders outside the reply window. No actual secret is supplied by this change.

1. Apply additive migration `0005_whatsapp.sql` to the preview D1, not the main database:
   `npx wrangler d1 migrations apply aitracker-coach-preview --remote`
2. Run `npm run build` (or the existing Vite build), then `npx wrangler deploy --keep-vars` from this app.
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

1. Open `/preview` and verify your email. This remains the identity prerequisite.
2. In the reminders panel, choose **Agree and connect WhatsApp**. Open the link and send the prefilled LINK message. The random token is single-use and expires in ten minutes. Never share it.
3. Wait for the connection status (polls every five seconds). Ask the browser coach for a reminder, select WhatsApp in the confirmation card and confirm. Only that chosen channel receives it.
4. Text a question to WhatsApp. Signed inbound messages are queued in D1, processed by the minute scheduler and answered using the same session's sample plan and conversation history. Allow up to a few minutes. Media/voice notes are not downloaded or transcribed.
5. Ask for a plan change or reminder in WhatsApp. It should direct you to the browser, not claim it changed anything. Mutations still require the existing on-screen flow.
6. Send STOP, or disconnect in Settings. Pending WhatsApp reminders are cancelled; email remains connected. A message already in flight cannot be recalled. Reconnection requires explicit browser consent and a new token.
7. Check Twilio delivery logs and the app's delivery status. API acceptance is not inbox delivery. A callback that arrives before the provider SID is saved may not appear in the app; Twilio logs remain authoritative.

## Boundaries and operations

- Preview session expires in seven days. The verified phone is uniquely bound to one preview. Paid-runner entitlements and persistent accounts are not implemented.
- HMAC-SHA1 validates the full configured URL plus every form parameter, with Web Crypto verification. Unexpected account, sender, signature, duplicate fields, media and oversized input are rejected/limited. Public webhook paths alone bypass browser Origin/cookie checks.
- Durable SID receipts prevent replay of pairing, STOP and messages. Receipts store only message SID and time, retained for replay protection. Other records cascade with preview session cleanup. No raw token is stored, only its SHA-256 digest. Phone numbers are private D1 fields needed for delivery, never API-selected by the model.
- No provider request/response bodies, phone numbers or credentials are intentionally logged. Twilio and Meta process message content. Conversation text is retained with the preview's ordinary session history; queued text is cleared after completion/failure. Disclose this in user consent.
- Limits: five pairing links/session/hour; 20 inbound messages/number/minute; 30 coaching questions/session/day and 300 globally/day; 60 outbound messages/session/day and 500 globally/day. TwiML pairing/help replies may additionally incur Twilio fees. Configure Twilio account spending alerts too.
- At most three AI reply jobs per scheduler run, 25-second AI timeout and 15-second Twilio timeout. Requests are atomically claimed. Crashed or ambiguous sends are not retried automatically. Work older than ten minutes expires. This avoids duplicate billing but is not an exactly-once-delivery guarantee.
- STOP must remain supported. Disable automatic START opt-in for the app: reconnect through the browser instead. A stale STOP cannot be replayed after reconnection because its SID is recorded.
- To disable WhatsApp only, remove TWILIO_WHATSAPP_FROM and redeploy. Do not disable the shared cron, which also handles email and the separately controlled waitlist. No launch campaign is enabled by this integration.

Live end-to-end delivery must be tested after credentials and sender/template setup. Automated tests use fake Twilio and do not send messages.
