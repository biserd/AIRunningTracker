import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  MCP_RESOURCE,
  OAuthRequestError,
  authorizationServerMetadata,
  buildOAuthRedirect,
  isBoundTokenActive,
  isScopeSubset,
  parseRequestedScopes,
  protectedResourceMetadata,
  requireExactResource,
  validateCodeChallenge,
  validateIssuerUrl,
  validateRedirectUri,
  verifyPkce,
} from "../contract";

test("publishes OAuth and protected-resource discovery metadata", () => {
  const auth = authorizationServerMetadata();
  const resource = protectedResourceMetadata();
  assert.equal(auth.authorization_endpoint, "https://aitracker.run/mcp/oauth/authorize");
  assert.equal(auth.token_endpoint, "https://aitracker.run/mcp/oauth/token");
  assert.equal(auth.code_challenge_methods_supported[0], "S256");
  assert.equal(resource.resource, MCP_RESOURCE);
  assert.deepEqual(resource.authorization_servers, ["https://aitracker.run"]);
});

test("accepts only narrow documented scopes and prevents escalation", () => {
  assert.deepEqual(parseRequestedScopes("mcp:profile.read mcp:activities.read mcp:profile.read"), [
    "mcp:profile.read",
    "mcp:activities.read",
  ]);
  assert.throws(() => parseRequestedScopes("mcp:activities.write"), (error: unknown) =>
    error instanceof OAuthRequestError && error.error === "invalid_scope");
  assert.equal(isScopeSubset(["mcp:profile.read"], ["mcp:profile.read", "mcp:goals.read"]), true);
  assert.equal(isScopeSubset(["mcp:plans.read"], ["mcp:profile.read"]), false);
});

test("enforces PKCE S256", () => {
  const verifier = "a".repeat(43);
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  assert.equal(validateCodeChallenge(challenge, "S256"), challenge);
  assert.equal(verifyPkce(verifier, challenge), true);
  assert.equal(verifyPkce("b".repeat(43), challenge), false);
  assert.throws(() => validateCodeChallenge(challenge, "plain"), /must be S256/);
});

test("redirect URIs are absolute, exact, and safe", () => {
  assert.equal(validateRedirectUri("https://client.example/callback"), "https://client.example/callback");
  assert.equal(validateRedirectUri("http://127.0.0.1:49152/callback"), "http://127.0.0.1:49152/callback");
  assert.throws(() => validateRedirectUri("http://client.example/callback"), /HTTPS/);
  assert.throws(() => validateRedirectUri("https://client.example/callback#token"), /fragment/);
  assert.throws(() => validateRedirectUri("/callback"), /absolute/);
  const redirected = buildOAuthRedirect("https://client.example/callback?existing=1", { code: "safe", state: "s" });
  assert.equal(redirected, "https://client.example/callback?existing=1&code=safe&state=s");
});

test("issuer is a secure origin rather than a configurable path", () => {
  assert.equal(validateIssuerUrl("https://aitracker.run/"), "https://aitracker.run");
  assert.equal(validateIssuerUrl("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.throws(() => validateIssuerUrl("http://aitracker.run"), /HTTPS/);
  assert.throws(() => validateIssuerUrl("https://aitracker.run/private"), /origin/);
});

test("resource and token checks reject wrong audience, expiry, and revocation", () => {
  assert.equal(requireExactResource(MCP_RESOURCE), MCP_RESOURCE);
  assert.throws(() => requireExactResource("https://aitracker.run/mcp/public"), /resource must be/);
  const now = new Date("2026-08-08T12:00:00Z");
  assert.equal(isBoundTokenActive({ resource: MCP_RESOURCE, accessExpiresAt: new Date("2026-08-08T12:01:00Z"), revokedAt: null }, MCP_RESOURCE, now), true);
  assert.equal(isBoundTokenActive({ resource: MCP_RESOURCE, accessExpiresAt: now, revokedAt: null }, MCP_RESOURCE, now), false);
  assert.equal(isBoundTokenActive({ resource: MCP_RESOURCE, accessExpiresAt: new Date("2026-08-08T12:01:00Z"), revokedAt: now }, MCP_RESOURCE, now), false);
  assert.equal(isBoundTokenActive({ resource: "https://other.example/mcp", accessExpiresAt: new Date("2026-08-08T12:01:00Z"), revokedAt: null }, MCP_RESOURCE, now), false);
});
