import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";

const callbackSecret = "callback-secret-for-tests-with-more-than-32-characters";
const identitySecret = "identity-secret-for-tests-with-more-than-32-characters";

test("Hermes binding signature is exact-body, timestamp-bound, and constant-format", async () => {
  const originalCallbackSecret = process.env.COACH_BINDING_CALLBACK_SECRET;
  process.env.COACH_BINDING_CALLBACK_SECRET = callbackSecret;
  const { verifyHermesBindingSignature } = await import("./coachChannelBindings");
  const timestamp = "1787320800";
  const rawBody = Buffer.from('{"event_type":"telegram.binding.complete","link_token":"ra_tg_link_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ","telegram_user_id":"123","telegram_chat_id":"123","telegram_chat_type":"private"}');
  const signature = crypto.createHmac("sha256", callbackSecret).update(`${timestamp}.`).update(rawBody).digest("hex");
  try {
    assert.doesNotThrow(() => verifyHermesBindingSignature({
      rawBody,
      timestampHeader: timestamp,
      signatureHeader: `v1=${signature}`,
      nowSeconds: Number(timestamp),
    }));
    assert.throws(() => verifyHermesBindingSignature({
      rawBody: Buffer.from(`${rawBody.toString()} `),
      timestampHeader: timestamp,
      signatureHeader: `v1=${signature}`,
      nowSeconds: Number(timestamp),
    }), /signature is invalid/);
    assert.throws(() => verifyHermesBindingSignature({
      rawBody,
      timestampHeader: timestamp,
      signatureHeader: `v1=${signature}`,
      nowSeconds: Number(timestamp) + 301,
    }), /timestamp is invalid or expired/);
  } finally {
    if (originalCallbackSecret === undefined) delete process.env.COACH_BINDING_CALLBACK_SECRET;
    else process.env.COACH_BINDING_CALLBACK_SECRET = originalCallbackSecret;
  }
});

test("link and Telegram identities are irreversibly represented in storage", async () => {
  const originalIdentitySecret = process.env.CHANNEL_IDENTITY_HASH_SECRET;
  process.env.CHANNEL_IDENTITY_HASH_SECRET = identitySecret;
  const { hashCoachLinkToken, hashCoachProviderIdentity } = await import("./coachChannelBindings");
  try {
    const link = "ra_tg_link_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
    const userHash = hashCoachProviderIdentity("user", "123456789");
    const chatHash = hashCoachProviderIdentity("chat", "123456789");
    assert.match(hashCoachLinkToken(link), /^[a-f0-9]{64}$/);
    assert.doesNotMatch(hashCoachLinkToken(link), /ra_tg_link|abcdefghijklmnopqrstuvwxyz/);
    assert.match(userHash, /^[a-f0-9]{64}$/);
    assert.notEqual(userHash, chatHash, "user and chat identities must be domain-separated");
    assert.equal(userHash, hashCoachProviderIdentity("user", "123456789"));
  } finally {
    if (originalIdentitySecret === undefined) delete process.env.CHANNEL_IDENTITY_HASH_SECRET;
    else process.env.CHANNEL_IDENTITY_HASH_SECRET = originalIdentitySecret;
  }
});

test("pilot routes derive runner identity server-side and outbound events expose no user ID", () => {
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("./coachChannelBindings.ts", import.meta.url), "utf8");
  const oauth = readFileSync(new URL("../mcp/oauthService.ts", import.meta.url), "utf8");
  assert.match(routes, /createTelegramLink\(user\)/);
  assert.match(routes, /disconnectTelegram\(req\.user\.id\)/);
  assert.doesNotMatch(routes, /coach\/channels[\s\S]{0,300}req\.body\.userId/);
  assert.match(service, /binding_id: bindingId/);
  assert.doesNotMatch(service, /JSON\.stringify\(\{[^\n]*userId/);
  assert.match(oauth, /eq\(mcpOauthTokens\.userId, userId\)/);
  assert.match(oauth, /eq\(mcpOauthTokens\.clientId, clientId\)/);
});

test("pilot migration enforces one live binding per runner and Telegram identity", () => {
  const migration = readFileSync(new URL("../../migrations/0002_coach_channel_pilot.sql", import.meta.url), "utf8");
  assert.match(migration, /active_user_channel_uidx[\s\S]*WHERE revoked_at IS NULL/);
  assert.match(migration, /active_provider_user_uidx[\s\S]*WHERE revoked_at IS NULL/);
  assert.match(migration, /active_provider_chat_uidx[\s\S]*WHERE revoked_at IS NULL/);
  assert.match(migration, /mcp_token_id integer REFERENCES mcp_oauth_tokens/);
});
