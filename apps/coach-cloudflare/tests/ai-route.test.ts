import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { aiRoute, history } from "../worker/ai";
import { seed } from "../shared/coach";
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../migrations/0001_preview.sql", import.meta.url),
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(new URL("../migrations/0002_ai.sql", import.meta.url), "utf8"),
  );
  const state = JSON.stringify(seed(new Date("2026-09-09T12:00:00Z")));
  for (const id of ["runner-a", "runner-b"])
    sqlite
      .prepare("INSERT INTO sessions(id,state,expires_at) VALUES (?,?,?)")
      .run(id, state, 2_000_000_000);
  const adapter = {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let values: (string | number | null)[] = [];
      return {
        bind(...args: (string | number | null)[]) {
          values = args;
          return this;
        },
        async first() {
          return stmt.get(...values) || null;
        },
        async all() {
          return { results: stmt.all(...values) };
        },
        async run() {
          return { meta: { changes: Number(stmt.run(...values).changes) } };
        },
      };
    },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      const result = [];
      for (const stmt of statements) result.push(await stmt.run());
      return result;
    },
  };
  // Test adapter executes real SQLite SQL; no production service is contacted.
  const env = Object.assign({} as Env, {
    DB: adapter,
    OPENAI_API_KEY: "test-only",
  });
  return { sqlite, env, row: { id: "runner-a", state, version: 1 } };
}
test("AI route caches chat replay, preserves ownership and rejects changed replay payload", async (t) => {
  const { sqlite, env, row } = fixture();
  t.after(() => sqlite.close());
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => {
    count++;
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "Keep the sample run easy." }],
        },
      ],
    });
  });
  const request = new Request("https://test.example/api/ai/chat"),
    body = { id: crypto.randomUUID(), message: "What should I do?" };
  const allow = async () => true;
  const result = await aiRoute(request, env, row, body, allow);
  assert.deepEqual(await aiRoute(request, env, row, body, allow), result);
  assert.equal(count, 1);
  assert.equal((await history(env, row.id)).length, 2);
  assert.equal((await history(env, "runner-b")).length, 0);
  await assert.rejects(
    aiRoute(request, env, row, { ...body, message: "different" }, allow),
    /new request ID/,
  );
  assert.equal(
    sqlite.prepare("SELECT version FROM sessions WHERE id=?").get(row.id)
      ?.version,
    1,
  );
});
test("quota blocks calls before provider execution and failures cannot silently retry", async (t) => {
  const { sqlite, env, row } = fixture();
  t.after(() => sqlite.close());
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => {
    count++;
    return new Response("", { status: 500 });
  });
  const request = new Request("https://test.example/api/ai/chat"),
    body = { id: crypto.randomUUID(), message: "Hi" };
  await assert.rejects(
    aiRoute(request, env, row, body, async () => false),
    /limit/,
  );
  assert.equal(count, 0);
  await assert.rejects(
    aiRoute(request, env, row, body, async () => true),
    /already finished/,
  );
  assert.equal(count, 0);
  const next = { ...body, id: crypto.randomUUID() };
  await assert.rejects(aiRoute(request, env, row, next, async () => true));
  assert.equal(count, 1);
  await assert.rejects(
    aiRoute(request, env, row, next, async () => true),
    /already finished/,
  );
  assert.equal(count, 1);
});
test("image request is fixed-scope, counted once and not stored as a D1 blob", async (t) => {
  const { sqlite, env, row } = fixture();
  t.after(() => sqlite.close());
  let count = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, options: RequestInit) => {
      count++;
      assert.equal(url, "https://api.openai.com/v1/images/generations");
      const body = JSON.parse(options.body as string);
      assert.equal(body.model, "gpt-image-2.5-flare");
      assert.equal(body.n, 1);
      return Response.json({ data: [{ b64_json: "YQ==" }] });
    },
  );
  const request = new Request("https://test.example/api/ai/image"),
    body = { id: crypto.randomUUID() };
  const result = (await aiRoute(request, env, row, body, async () => true)) as {
    image: string;
  };
  assert.equal(result.image, "data:image/webp;base64,YQ==");
  assert.equal(
    sqlite.prepare("SELECT result FROM ai_jobs").get()?.result,
    '{"completed":true}',
  );
  await assert.rejects(
    aiRoute(request, env, row, body, async () => true),
    /already finished/,
  );
  assert.equal(count, 1);
  await assert.rejects(
    aiRoute(
      request,
      env,
      row,
      { id: crypto.randomUUID(), prompt: "unrestricted" },
      async () => true,
    ),
    /Invalid/,
  );
});
