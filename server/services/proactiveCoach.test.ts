import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";

test("quiet hours support overnight and daytime windows in runner timezone", async () => {
  const { isInQuietHours } = await import("./proactiveCoach");
  const overnight = { coachQuietHoursStart: 22, coachQuietHoursEnd: 7, coachTimezone: "America/New_York" };
  assert.equal(isInQuietHours(overnight as any, new Date("2026-08-08T06:00:00Z")), true); // 02:00 local
  assert.equal(isInQuietHours(overnight as any, new Date("2026-08-08T16:00:00Z")), false); // 12:00 local
  const daytime = { coachQuietHoursStart: 9, coachQuietHoursEnd: 17, coachTimezone: "UTC" };
  assert.equal(isInQuietHours(daytime as any, new Date("2026-08-08T12:00:00Z")), true);
});

test("invalid timezones are rejected before preferences are stored", async () => {
  const { isValidTimezone } = await import("./proactiveCoach");
  assert.equal(isValidTimezone("Europe/London"), true);
  assert.equal(isValidTimezone("Moon/Sea_of_Tranquility"), false);
});

test("Hermes webhook includes a stable delivery ID and timestamp-bound HMAC", async () => {
  const { emitSignedCoachEvent } = await import("./proactiveCoach");
  const originalUrl = process.env.COACH_AGENT_WEBHOOK_URL;
  const originalSecret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  const originalPilotUserId = process.env.COACH_AGENT_PILOT_USER_ID;
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  process.env.COACH_AGENT_WEBHOOK_URL = "https://hermes.example.test/webhooks/runanalytics-post-run";
  process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 = "test-hermes-secret-with-at-least-32-characters";
  process.env.COACH_AGENT_PILOT_USER_ID = "17";
  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    const occurredAt = new Date("2026-08-21T14:00:00.000Z");
    assert.equal(await emitSignedCoachEvent({ activityId: 77361, userId: 17, occurredAt }), true);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.url, process.env.COACH_AGENT_WEBHOOK_URL);
    assert.equal(request.init?.method, "POST");
    const body = JSON.parse(String(request.init?.body));
    assert.equal(body.event_type, "activity.ready");
    assert.equal(body.activityId, 77361);
    assert.equal(body.occurred_at, occurredAt.toISOString());
    assert.match(body.event_id, /^[a-f0-9]{64}$/);

    const headers = new Headers(request.init?.headers);
    const expected = crypto
      .createHmac("sha256", process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2!)
      .update(String(request.init?.body))
      .digest("hex");
    assert.equal(headers.get("X-Hub-Signature-256"), `sha256=${expected}`);
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(headers.get("x-runanalytics-timestamp"), "1787320800");
    assert.equal(headers.get("x-runanalytics-delivery"), body.event_id);
    const replaySafe = crypto
      .createHmac("sha256", process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2!)
      .update(`${headers.get("x-runanalytics-timestamp")}.${request.init?.body}`)
      .digest("hex");
    assert.equal(headers.get("x-runanalytics-signature"), `v1=${replaySafe}`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COACH_AGENT_WEBHOOK_URL;
    else process.env.COACH_AGENT_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
    else process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 = originalSecret;
    if (originalPilotUserId === undefined) delete process.env.COACH_AGENT_PILOT_USER_ID;
    else process.env.COACH_AGENT_PILOT_USER_ID = originalPilotUserId;
  }
});

test("Hermes webhook is skipped when settings are absent", async () => {
  const { emitSignedCoachEvent } = await import("./proactiveCoach");
  const originalUrl = process.env.COACH_AGENT_WEBHOOK_URL;
  const originalSecret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  const originalPilotUserId = process.env.COACH_AGENT_PILOT_USER_ID;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  delete process.env.COACH_AGENT_WEBHOOK_URL;
  delete process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    assert.equal(await emitSignedCoachEvent({ activityId: 77361, userId: 17 }), false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COACH_AGENT_WEBHOOK_URL;
    else process.env.COACH_AGENT_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
    else process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 = originalSecret;
    if (originalPilotUserId === undefined) delete process.env.COACH_AGENT_PILOT_USER_ID;
    else process.env.COACH_AGENT_PILOT_USER_ID = originalPilotUserId;
  }
});

test("legacy rollback webhook rejects a runner outside the configured account", async () => {
  const { emitSignedCoachEvent } = await import("./proactiveCoach");
  const originalUrl = process.env.COACH_AGENT_WEBHOOK_URL;
  const originalSecret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  const originalPilotUserId = process.env.COACH_AGENT_PILOT_USER_ID;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  process.env.COACH_AGENT_WEBHOOK_URL = "https://hermes.example.test/webhook";
  process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 = "test-hermes-secret-with-at-least-32-characters";
  process.env.COACH_AGENT_PILOT_USER_ID = "17";
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    assert.equal(await emitSignedCoachEvent({ activityId: 99, userId: 18 }), false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COACH_AGENT_WEBHOOK_URL;
    else process.env.COACH_AGENT_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
    else process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 = originalSecret;
    if (originalPilotUserId === undefined) delete process.env.COACH_AGENT_PILOT_USER_ID;
    else process.env.COACH_AGENT_PILOT_USER_ID = originalPilotUserId;
  }
});
