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

test("Hermes webhook uses the expected payload and raw-body HMAC header", async () => {
  const { emitSignedCoachEvent } = await import("./proactiveCoach");
  const originalUrl = process.env.COACH_AGENT_WEBHOOK_URL;
  const originalSecret = process.env.COACH_AGENT_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  process.env.COACH_AGENT_WEBHOOK_URL = "https://hermes.example.test/webhooks/runanalytics-post-run";
  process.env.COACH_AGENT_WEBHOOK_SECRET = "test-hermes-secret";
  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    assert.equal(await emitSignedCoachEvent({ activityId: 77361 }), true);
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.url, process.env.COACH_AGENT_WEBHOOK_URL);
    assert.equal(request.init?.method, "POST");
    assert.equal(request.init?.body, JSON.stringify({ event_type: "activity.ready", activityId: 77361 }));
    assert.equal(typeof JSON.parse(String(request.init?.body)).activityId, "number");

    const headers = new Headers(request.init?.headers);
    const expected = crypto
      .createHmac("sha256", "test-hermes-secret")
      .update(String(request.init?.body))
      .digest("hex");
    assert.equal(headers.get("X-Hub-Signature-256"), `sha256=${expected}`);
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(headers.has("x-runanalytics-signature"), false);
    assert.equal(headers.has("x-runanalytics-timestamp"), false);
    assert.equal(headers.has("x-runanalytics-delivery"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COACH_AGENT_WEBHOOK_URL;
    else process.env.COACH_AGENT_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.COACH_AGENT_WEBHOOK_SECRET;
    else process.env.COACH_AGENT_WEBHOOK_SECRET = originalSecret;
  }
});

test("Hermes webhook is skipped when settings are absent", async () => {
  const { emitSignedCoachEvent } = await import("./proactiveCoach");
  const originalUrl = process.env.COACH_AGENT_WEBHOOK_URL;
  const originalSecret = process.env.COACH_AGENT_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  delete process.env.COACH_AGENT_WEBHOOK_URL;
  delete process.env.COACH_AGENT_WEBHOOK_SECRET;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    assert.equal(await emitSignedCoachEvent({ activityId: 77361 }), false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COACH_AGENT_WEBHOOK_URL;
    else process.env.COACH_AGENT_WEBHOOK_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.COACH_AGENT_WEBHOOK_SECRET;
    else process.env.COACH_AGENT_WEBHOOK_SECRET = originalSecret;
  }
});
