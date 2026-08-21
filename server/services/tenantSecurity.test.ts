import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";

test("production application secrets fail closed", async () => {
  const { isStrongApplicationSecret, requireApplicationSecret } = await import("../config/security");
  assert.equal(isStrongApplicationSecret("your-secret-key-change-in-production"), false);
  assert.equal(isStrongApplicationSecret("short"), false);
  assert.equal(isStrongApplicationSecret("a-secure-value-with-at-least-thirty-two-characters"), true);

  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.TEST_REQUIRED_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.TEST_REQUIRED_SECRET;
  try {
    assert.throws(
      () => requireApplicationSecret("TEST_REQUIRED_SECRET"),
      /must be configured with at least 32 characters in production/,
    );
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.TEST_REQUIRED_SECRET;
    else process.env.TEST_REQUIRED_SECRET = originalSecret;
  }
});

test("client user serializer excludes authentication and provider credentials", async () => {
  const { toClientUser } = await import("./clientUser");
  const serialized = JSON.stringify(toClientUser({
    id: 17,
    email: "runner@example.test",
    password: "password-hash",
    stravaAccessToken: "strava-access",
    stravaRefreshToken: "strava-refresh",
    stravaAthleteId: "998877",
    resetToken: "reset-token",
    resetTokenExpiry: new Date(),
    stripeCustomerId: "cus_secret",
    stripeSubscriptionId: "sub_secret",
    firstName: "Runner",
    coachEnabled: true,
  } as any));
  assert.match(serialized, /runner@example\.test/);
  assert.match(serialized, /coachEnabled/);
  assert.doesNotMatch(serialized, /password-hash|strava-access|strava-refresh|998877|reset-token|cus_secret|sub_secret/);
  assert.doesNotMatch(serialized, /password|stravaAccessToken|stravaRefreshToken|resetToken|stripeCustomerId|stripeSubscriptionId/);
});

test("JSON string responses are parsed before log redaction", async () => {
  const { truncateData } = await import("../middleware/performance-logger");
  const logged = truncateData(JSON.stringify({
    ok: true,
    nested: { accessToken: "secret-access", refreshToken: "secret-refresh" },
  }));
  assert.ok(logged);
  assert.doesNotMatch(logged!, /secret-access|secret-refresh/);
  assert.match(logged!, /\[REDACTED\]/);
});

test("chat and recap code paths require the authenticated runner at storage boundaries", () => {
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../storage.ts", import.meta.url), "utf8");
  const chat = readFileSync(new URL("./chat.ts", import.meta.url), "utf8");
  const coaching = readFileSync(new URL("./coachingService.ts", import.meta.url), "utf8");

  assert.match(routes, /getMessagesByConversationId\(conversationId, req\.user\.id\)/);
  assert.match(routes, /updateConversationTitle\(conversationId, req\.user\.id, title\)/);
  assert.match(routes, /deleteConversation\(conversationId, req\.user\.id\)/);
  assert.match(routes, /storage\.addMessage\([\s\S]*?\}, userId\)/);
  assert.match(chat, /getMessagesByConversationId\(conversationId, userId\)/);
  assert.match(storage, /eq\(aiConversations\.userId, userId\)/);
  assert.match(storage, /getActivityByIdForUser\(activityId: number, userId: number\)/);
  assert.match(coaching, /getActivityByIdForUser\(activityId, userId\)/);
  assert.doesNotMatch(coaching, /stravaActivityId:\s*stravaId/);
});
