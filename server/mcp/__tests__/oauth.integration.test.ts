import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const testDatabaseUrl = process.env.MCP_TEST_DATABASE_URL;

test("OAuth code, PKCE, refresh rotation, validation, and revocation lifecycle", {
  skip: testDatabaseUrl ? false : "Set MCP_TEST_DATABASE_URL to run the PostgreSQL lifecycle test",
}, async () => {
  process.env.DATABASE_URL = testDatabaseUrl!;
  process.env.MCP_TOKEN_HASH_SECRET = "integration-test-secret-with-at-least-thirty-two-characters";
  const { MCP_RESOURCE } = await import("../contract");
  const oauth = await import("../oauthService");
  const { db } = await import("../../db");
  const { sql } = await import("drizzle-orm");
  const verifier = "v".repeat(43);
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const userId = 2_000_000_000;
  let clientId = "";

  await oauth.ensureMcpSchema();
  try {
    const client = await oauth.registerPublicClient({
      clientName: "MCP integration test",
      redirectUris: ["https://client.example/callback"],
    });
    clientId = client.clientId;
    const request = await oauth.createAuthorizationRequest({
      clientId,
      redirectUri: client.redirectUris[0],
      scopes: ["mcp:profile.read", "mcp:activities.read"],
      state: "integration-state",
      resource: MCP_RESOURCE,
      codeChallenge: challenge,
    });
    const decision = await oauth.decideAuthorization(request, userId, true);
    assert.equal(decision.approved, true);
    if (!decision.approved) assert.fail("Authorization unexpectedly denied");
    await assert.rejects(() => oauth.exchangeAuthorizationCode({
      code: decision.code,
      clientId,
      redirectUri: client.redirectUris[0],
      codeVerifier: "x".repeat(43),
      resource: MCP_RESOURCE,
    }), /PKCE/);
    const first = await oauth.exchangeAuthorizationCode({
      code: decision.code,
      clientId,
      redirectUri: client.redirectUris[0],
      codeVerifier: verifier,
      resource: MCP_RESOURCE,
    });
    const principal = await oauth.validateAccessToken(first.access_token);
    assert.equal(principal.userId, userId);
    assert.deepEqual(principal.scopes, ["mcp:profile.read", "mcp:activities.read"]);

    const second = await oauth.refreshAccessToken({
      refreshToken: first.refresh_token,
      clientId,
      resource: MCP_RESOURCE,
      requestedScopes: ["mcp:profile.read"],
    });
    await assert.rejects(() => oauth.validateAccessToken(first.access_token), /invalid or expired/);
    assert.deepEqual((await oauth.validateAccessToken(second.access_token)).scopes, ["mcp:profile.read"]);
    await assert.rejects(() => oauth.refreshAccessToken({
      refreshToken: second.refresh_token,
      clientId,
      resource: MCP_RESOURCE,
      requestedScopes: ["mcp:plans.read"],
    }), /cannot add scopes/);
    await oauth.revokeToken(second.refresh_token, clientId);
    await assert.rejects(() => oauth.validateAccessToken(second.access_token), /invalid or expired/);
  } finally {
    if (clientId) {
      await db.execute(sql.raw(`DELETE FROM mcp_oauth_tokens WHERE client_id = '${clientId.replace(/'/g, "''")}'`));
      await db.execute(sql.raw(`DELETE FROM mcp_oauth_authorization_codes WHERE client_id = '${clientId.replace(/'/g, "''")}'`));
      await db.execute(sql.raw(`DELETE FROM mcp_oauth_requests WHERE client_id = '${clientId.replace(/'/g, "''")}'`));
      await db.execute(sql.raw(`DELETE FROM mcp_audit_events WHERE client_id = '${clientId.replace(/'/g, "''")}'`));
      await db.execute(sql.raw(`DELETE FROM mcp_oauth_clients WHERE client_id = '${clientId.replace(/'/g, "''")}'`));
    }
  }
});
