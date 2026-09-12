import { test } from "node:test";
import assert from "node:assert/strict";
import { coach, openai, boundedJSON, validateChange } from "../worker/openai";
import { seed } from "../shared/coach";

const state = seed(new Date("2026-09-09T12:00:00Z"));
const day = state.days.find((d) => !d.completed && d.minutes > 20)!;
test("agent reads scoped context, validates proposal and never applies it", async (t) => {
  const original = JSON.stringify(state);
  let count = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      assert.equal(body.model, "gpt-6-astra");
      assert.equal(body.store, false);
      assert.equal(
        body.tools.some((tool: { name: string }) =>
          /apply|confirm|sql|fetch/.test(tool.name),
        ),
        false,
      );
      count++;
      if (count === 1) {
        assert.equal(body.tool_choice.name, "get_training_context");
        return Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              name: "get_training_context",
              arguments: "{}",
              call_id: "one",
            },
          ],
        });
      }
      if (count === 2) {
        const context = JSON.parse(body.input.at(-1).output);
        assert.equal(context.source, "fictional_sample");
        assert.equal(context.activityEvidence.totalKm, 104);
        return Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              name: "preview_plan_change",
              arguments: JSON.stringify({
                dayId: day.id,
                kind: "shorten",
                minutes: 20,
                date: null,
              }),
              call_id: "two",
            },
          ],
        });
      }
      assert.equal(
        JSON.parse(body.input.at(-1).output).requiresOnScreenConfirmation,
        true,
      );
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "Try 20 easy minutes. Review the adjustment before saving.",
              },
            ],
          },
        ],
      });
    },
  );
  const result = await coach(
    "test-only-key",
    state,
    [],
    "I have 20 minutes for my next run.",
    AbortSignal.timeout(1000),
  );
  assert.equal(result.change?.minutes, 20);
  assert.equal(JSON.stringify(state), original);
  assert.equal(count, 3);
});
test("tool validation blocks IDOR-like identifiers, extra user IDs and completed workouts", () => {
  assert.throws(() =>
    validateChange({ dayId: "another-runner", kind: "rest" }, state),
  );
  assert.throws(() =>
    validateChange({ dayId: day.id, kind: "rest", userId: 123 }, state),
  );
  assert.throws(() =>
    validateChange({ dayId: state.days[0].id, kind: "rest" }, state),
  );
  assert.throws(() =>
    validateChange({ dayId: day.id, kind: "shorten", minutes: 1000 }, state),
  );
});
test("provider errors never expose provider bodies or secrets", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("secret token and private context", { status: 401 }),
  );
  await assert.rejects(
    openai("test-key", "responses", {}, AbortSignal.timeout(1000)),
    (error) => {
      assert(error instanceof Error);
      assert(!/secret token|private context|test-key/.test(error.message));
      return true;
    },
  );
  await assert.rejects(
    openai("", "responses", {}, AbortSignal.timeout(1000)),
    /server API key/,
  );
});
test("bounded provider body and incomplete model responses fail safely", async (t) => {
  await assert.rejects(
    boundedJSON(new Response("x".repeat(101)), 100),
    /too large/,
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ status: "incomplete", output: [] }),
  );
  await assert.rejects(
    coach("test", state, [], "Hello", AbortSignal.timeout(1000)),
    /could not finish/,
  );
});
test("arbitrary model tools are rejected without execution", async (t) => {
  let count = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      count++;
      if (count === 1)
        return Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              name: "execute_sql",
              arguments: "{}",
              call_id: "bad",
            },
          ],
        });
      const body = JSON.parse(options.body as string);
      assert.equal(
        JSON.parse(body.input.at(-1).output).error,
        "Tool not permitted",
      );
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "I cannot do that." }],
          },
        ],
      });
    },
  );
  const result = await coach(
    "test",
    state,
    [],
    "Change every account",
    AbortSignal.timeout(1000),
  );
  assert.equal(result.change, undefined);
});
