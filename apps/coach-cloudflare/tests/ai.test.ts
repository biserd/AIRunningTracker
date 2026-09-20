import { test } from "node:test";
import assert from "node:assert/strict";
import { coach, openai, boundedJSON, validateChange } from "../worker/openai";
import { seed } from "../shared/coach";
import type { ReminderIntent } from "../shared/reminders";

test("agent prepares email reminders without sending or confirming them", async (t) => {
  let count = 0;
  let validated = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      count++;
      if (count === 1)
        return Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              name: "get_training_context",
              arguments: "{}",
              call_id: "context",
            },
          ],
        });
      if (count === 2) {
        assert.equal(
          JSON.parse(body.input.at(-1).output).emailReminders.timezone,
          "UTC",
        );
        return Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              name: "preview_email_reminder",
              arguments: JSON.stringify({
                title: "Lay out running kit",
                localTime: "2026-09-13T07:00",
              }),
              call_id: "reminder",
            },
          ],
        });
      }
      assert.equal(JSON.parse(body.input.at(-1).output).status, "draft_only");
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "Review and confirm your reminder below.",
              },
            ],
          },
        ],
      });
    },
  );
  const result = await coach(
    "test",
    seed(),
    [],
    "Remind me about my kit",
    AbortSignal.timeout(1000),
    {
      context: { verified: true, timezone: "UTC" },
      validate: async (intent) => {
        validated = true;
        assert.deepEqual(intent, {
          kind: "create",
          title: "Lay out running kit",
          localTime: "2026-09-13T07:00",
        });
        return intent as ReminderIntent;
      },
    },
  );
  assert(validated);
  assert.equal(result.reminder?.kind, "create");
  assert.equal(result.change, undefined);
});

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
      assert.equal(body.model, "gpt-5.6-luna");
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

test("optional knowledge tools fall back to the proven coaching tool set when rejected",async t=>{
  const bodies:Record<string,unknown>[]=[];
  t.mock.method(console,'error',()=>{});
  t.mock.method(console,'warn',()=>{});
  t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{
    const body=JSON.parse(String(options.body));bodies.push(body);
    if(bodies.length===1)return Response.json({error:{message:'unsupported schema'}},{status:400});
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Ready to help.'}]}]});
  });
  const result=await coach('test',seed(),[],'Hi',AbortSignal.timeout(1000),undefined,undefined,undefined,{run:async()=>({})});
  assert.equal(result.message,'Ready to help.');
  assert.equal((bodies[0].tools as {name:string}[]).some(x=>x.name==='search_running_shoes'),true);
  assert.equal((bodies[1].tools as {name:string}[]).some(x=>x.name==='search_running_shoes'),false);
});
test("production plan tools use OpenAI-compatible strict schemas", async (t) => {
  let body: Record<string, unknown> | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      body = JSON.parse(String(options.body));
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Ready to plan." }],
          },
        ],
      });
    },
  );
  await coach(
    "test",
    { ...seed(), source: "production_account" },
    [],
    "Help me plan",
    AbortSignal.timeout(1000),
    undefined,
    { validate: () => { throw new Error("not called"); } },
  );
  const serialized = JSON.stringify(body?.tools);
  assert.equal(serialized.includes("uniqueItems"), false);
  assert.equal(serialized.includes("preview_create_plan"), true);
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
