import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";
process.env.MCP_TOKEN_HASH_SECRET ||= "test-only-secret-with-at-least-thirty-two-characters";

test("registered MCP surface contains only explicitly read-only tools", async () => {
  const { MCP_TOOL_DESCRIPTORS } = await import("../tools");
  assert.equal(MCP_TOOL_DESCRIPTORS.length, 15);
  assert.ok(MCP_TOOL_DESCRIPTORS.every((tool) => tool.readOnly === true));
  const forbidden = /(create|update|delete|remove|write|sync|send|email|subscribe|checkout|process|import|sql|route)/i;
  assert.ok(MCP_TOOL_DESCRIPTORS.every((tool) => !forbidden.test(tool.name)));
  assert.deepEqual(
    MCP_TOOL_DESCRIPTORS.filter((tool) => tool.visibility === "public").map((tool) => tool.name),
    ["search_running_shoes", "get_running_shoe", "list_runanalytics_tools"],
  );
});

test("aggregate coach tools require the complete read scope bundle", async () => {
  const { createPrivateMcpServer } = await import("../tools");
  const full = createPrivateMcpServer({
    userId: 17,
    clientId: "coach-client",
    scopes: ["mcp:profile.read", "mcp:activities.read", "mcp:analytics.read", "mcp:goals.read", "mcp:plans.read"],
    resource: "https://aitracker.run/mcp",
    tokenId: 1,
  });
  const fullTools = (full as any)._registeredTools as Record<string, unknown>;
  assert.ok(fullTools.get_runner_coach_snapshot);
  assert.ok(fullTools.get_post_run_brief);
  await full.close();

  const partial = createPrivateMcpServer({
    userId: 17,
    clientId: "partial-client",
    scopes: ["mcp:activities.read", "mcp:analytics.read"],
    resource: "https://aitracker.run/mcp",
    tokenId: 2,
  });
  const partialTools = (partial as any)._registeredTools as Record<string, unknown>;
  assert.equal(partialTools.get_runner_coach_snapshot, undefined);
  assert.equal(partialTools.get_post_run_brief, undefined);
  await partial.close();
});

test("scope-specific server registration does not expose ungranted tools", async () => {
  const { createPrivateMcpServer } = await import("../tools");
  const server = createPrivateMcpServer({
    userId: 17,
    clientId: "test-client",
    scopes: ["mcp:activities.read"],
    resource: "https://aitracker.run/mcp",
    tokenId: 1,
  });
  const registered = (server as any)._registeredTools as Record<string, unknown>;
  assert.deepEqual(Object.keys(registered).sort(), ["get_activity", "list_activities"]);
  assert.equal((server as any)._registeredResources.size ?? Object.keys((server as any)._registeredResources).length, 0);
  assert.equal((server as any)._registeredPrompts.size ?? Object.keys((server as any)._registeredPrompts).length, 0);
  await server.close();
});

test("ownership checks do not distinguish missing and foreign records", async () => {
  const { McpToolError, requireOwnedRecord } = await import("../adapters");
  assert.equal(requireOwnedRecord({ id: 1, userId: 7 }, 7, "Activity").id, 1);
  for (const value of [undefined, { id: 1, userId: 8 }]) {
    assert.throws(() => requireOwnedRecord(value, 7, "Activity"), (error: unknown) =>
      error instanceof McpToolError && error.code === "not_found" && error.message === "Activity not found");
  }
});

test("pagination and date ranges are bounded", async () => {
  const { clampInteger, normalizeDateRange, McpToolError } = await import("../adapters");
  assert.equal(clampInteger(1000, 25, 1, 100), 100);
  assert.equal(clampInteger(-10, 25, 1, 100), 1);
  assert.equal(clampInteger("not-a-number", 25, 1, 100), 25);
  assert.throws(
    () => normalizeDateRange("2025-01-01", "2026-08-08", 90, 365),
    (error: unknown) => error instanceof McpToolError && error.code === "invalid_arguments",
  );
  assert.throws(() => normalizeDateRange("2026-08-09", "2026-08-08"), /must not be after/);
});

test("representative public tool response is bounded and contains no account fields", async () => {
  const { listPublicTools } = await import("../adapters");
  const response = listPublicTools({ limit: 2 });
  assert.ok(response.returned <= 2);
  assert.ok(response.tools.every((tool) => typeof tool.slug === "string" && tool.url.startsWith("https://aitracker.run/tools/")));
  const serialized = JSON.stringify(response);
  assert.doesNotMatch(serialized, /userId|email|subscription|stravaToken|stripe/i);
});
