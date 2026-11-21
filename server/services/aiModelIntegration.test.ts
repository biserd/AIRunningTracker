import assert from "node:assert/strict";
import { test } from "node:test";

// Keep these requests local and exercise the actual SDK serialization and response
// parsing. No provider key, runner data, email, or remote database is used.
test("Luna streams welcome chat and saves exactly one analysis for the free run", async (t) => {
  process.env.OPENAI_API_KEY = "synthetic-integration-key";
  process.env.DATABASE_URL = "postgresql://fixture:fixture@127.0.0.1:1/fixture";
  delete process.env.OPENAI_BASE_URL;
  const providerCalls: { path: string; body: Record<string, any> }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const target = new URL(typeof url === "object" && "url" in url ? url.url : String(url));
    assert.equal(target.hostname, "api.openai.com");
    const body = JSON.parse(String(init?.body));
    providerCalls.push({ path: target.pathname, body });
    assert.equal(body.model, "gpt-6-luna");
    assert.equal(body.store, false);
    if (target.pathname === "/v1/responses") {
      assert.equal(body.stream, true);
      assert.equal(body.reasoning.effort, "low");
      assert.match(body.input[0].content, /welcome chat/);
      assert.equal(body.input.at(-1).content, "I can run three times a week.");
      return new Response(
        'data: {"type":"response.output_text.delta","delta":"Start with " }\n\n' +
        'data: {"type":"response.output_text.delta","delta":"three easy runs." }\n\n' +
        'data: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      );
    }
    assert.equal(target.pathname, "/v1/chat/completions");
    assert.equal(body.reasoning_effort, "none");
    assert.equal(body.max_completion_tokens, 600);
    assert.equal(body.max_tokens, undefined);
    assert.equal(body.response_format.type, "json_object");
    assert.match(body.messages[0].content, /5\.00 km/);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
      recapBullets: ["You ran 5.00 km."],
      coachingCue: "Relax your shoulders.",
      nextStep: "easy",
      nextStepRationale: "Keep the next session conversational.",
    }) } }] });
  });

  const { storage } = await import("../storage");
  const { ChatService } = await import("./chat");
  const { generateCoachRecap } = await import("./coachingService");
  const { DAY_ONE_COACH_SOURCE } = await import("../../shared/dayOneCoach");
  const user = {
    id: 1, subscriptionPlan: "free", subscriptionStatus: "active",
    stravaConnected: true, premiumPreview: { activityId: 11 },
    coachEnabled: true, coachNotifyRecap: true, email: "fixture@example.invalid",
    unitPreference: "km", recoveryCalculatedAt: new Date(),
    cachedRecoveryState: {
      daysSinceLastRun: 1, acuteChronicRatio: 1, freshnessScore: 90,
      riskLevel: "low", readyToRun: true, recommendedNextStep: "easy",
    },
  };
  const run = {
    id: 11, userId: 1, name: "Fixture 5K", type: "Run", stravaId: "311",
    distance: 5000, movingTime: 1800, startDate: new Date(), totalElevationGain: 10,
  };
  let recap: Awaited<ReturnType<typeof generateCoachRecap>> = null;
  t.mock.method(storage, "getUser", async () => user);
  t.mock.method(storage, "getMessagesByConversationId", async () => []);
  t.mock.method(storage, "getActivityByIdForUser", async (id: number) => id === 11 ? run : { ...run, id });
  t.mock.method(storage, "getActivitiesByUserId", async () => [run]);
  t.mock.method(storage, "getActiveTrainingPlan", async () => undefined);
  t.mock.method(storage, "getCoachRecapByActivityId", async () => recap);
  t.mock.method(storage, "createCoachRecap", async (entry: NonNullable<typeof recap>) => {
    recap = { ...entry, id: 1 };
    return recap;
  });
  t.mock.method(storage, "createAgentRun", async () => {});
  const notifications = t.mock.method(storage, "createNotification", () => {
    assert.fail("A complimentary recap must not send an email or push");
  });

  const chunks: string[] = [];
  const text = await new ChatService().chat(
    1, 2, "I can run three times a week.", (chunk) => chunks.push(chunk),
    { page: { pageName: "welcome", entrySource: DAY_ONE_COACH_SOURCE } }, false,
  );
  assert.equal(text, "Start with three easy runs.");
  assert.deepEqual(chunks, ["Start with ", "three easy runs."]);
  assert.equal(await generateCoachRecap(1, 12, "311"), null);
  const saved = await generateCoachRecap(1, 11, "311");
  assert.equal(saved?.modelVersion, "gpt-6-luna");
  assert.deepEqual(saved?.recapBullets, ["You ran 5.00 km."]);
  assert.equal(await generateCoachRecap(1, 11, "311"), saved);
  assert.equal(notifications.mock.callCount(), 0);
  assert.deepEqual(providerCalls.map(({ path }) => path), ["/v1/responses", "/v1/chat/completions"]);
});
