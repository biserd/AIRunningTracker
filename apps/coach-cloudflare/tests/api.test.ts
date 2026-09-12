import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8787";
async function request(
  path: string,
  cookie = "",
  body?: unknown,
  origin = base,
) {
  return fetch(base + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
test("D1 session isolation, confirmation, replay, stale edit and undo", async () => {
  assert.equal((await request("state")).status, 401);
  assert.equal(
    (await request("session", "", {}, "https://evil.example")).status,
    403,
  );
  const start = await request("session", "", {});
  assert.equal(start.status, 200);
  const cookie = start.headers.get("set-cookie")!.split(";")[0];
  const other = (await request("session", "", {})).headers
    .get("set-cookie")!
    .split(";")[0];
  const snapshot = (await (await request("state", cookie)).json()) as any;
  const day = snapshot.state.days.find(
    (d: any) => !d.completed && d.minutes > 10,
  );
  assert(day);
  const proposal = (await (
    await request("proposals", cookie, {
      dayId: day.id,
      kind: "shorten",
      minutes: 10,
    })
  ).json()) as any;
  const stale = (await (
    await request("proposals", cookie, { dayId: day.id, kind: "rest" })
  ).json()) as any;
  assert.equal(
    (
      await request("confirm", other, {
        proposalId: proposal.id,
        confirm: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("confirm", cookie, { proposalId: proposal.id })).status,
    400,
  );
  assert.equal(
    (
      await request("confirm", cookie, {
        proposalId: proposal.id,
        confirm: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("confirm", cookie, {
        proposalId: proposal.id,
        confirm: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("confirm", cookie, { proposalId: stale.id, confirm: true }))
      .status,
    409,
  );
  const saved = (await (await request("state", cookie)).json()) as any;
  assert.equal(saved.version, snapshot.version + 1);
  assert.equal(saved.state.days.find((d: any) => d.id === day.id).minutes, 10);
  const isolated = (await (await request("state", other)).json()) as any;
  assert.equal(isolated.version, 1);
  const undo = (await (
    await request("undo-proposal", cookie, { actionId: proposal.id })
  ).json()) as any;
  assert.equal(
    (await request("confirm", cookie, { proposalId: undo.id, confirm: true }))
      .status,
    200,
  );
  const restored = (await (await request("state", cookie)).json()) as any;
  assert.deepEqual(restored.state, snapshot.state);
  assert.equal(
    (
      await request("proposals", cookie, {
        dayId: day.id,
        kind: "rest",
        userId: 123,
      })
    ).status,
    400,
  );
  const response = await request("state", cookie);
  assert.equal((await request("ai/status")).status, 401);
  const aiStatus = (await (await request("ai/status", cookie)).json()) as {
    configured: boolean;
    history: unknown[];
  };
  assert.equal(typeof aiStatus.configured, "boolean");
  assert.deepEqual(aiStatus.history, []);
  assert.equal(
    (
      await request("ai/chat", cookie, {
        id: crypto.randomUUID(),
        message: "Hi",
        userId: "someone-else",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("ai/voice", cookie, {
        id: crypto.randomUUID(),
        sdp: "arbitrary URL",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "ai/chat",
        cookie,
        { id: crypto.randomUUID(), message: "Hi" },
        "https://evil.example",
      )
    ).status,
    403,
  );
  if (!aiStatus.configured)
    assert.equal(
      (
        await request("ai/chat", cookie, {
          id: crypto.randomUUID(),
          message: "Hi",
        })
      ).status,
      503,
    );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(
    response.headers.get("content-security-policy")!,
    /frame-ancestors 'none'/,
  );
});
