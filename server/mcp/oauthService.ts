import crypto from "node:crypto";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  mcpAuditEvents,
  mcpOauthAuthorizationCodes,
  mcpOauthClients,
  mcpOauthRequests,
  mcpOauthTokens,
  coachChannelBindings,
  users,
} from "@shared/schema";
import { canAccessCapability, hasPremiumAccess } from "@shared/entitlements";
import {
  MCP_RESOURCE,
  MCP_SCOPE_NAMES,
  type McpScope,
  OAuthRequestError,
  isBoundTokenActive,
  isScopeSubset,
  verifyPkce,
} from "./contract";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

export interface McpPrincipal {
  userId: number;
  clientId: string;
  scopes: McpScope[];
  resource: string;
  tokenId: number;
}

function getHashSecret(): string {
  const secret = process.env.MCP_TOKEN_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new OAuthRequestError("temporarily_unavailable", "MCP OAuth is not configured", 503);
  }
  return secret;
}

export function hashMcpSecret(value: string): string {
  return crypto.createHmac("sha256", getHashSecret()).update(value).digest("hex");
}

function randomSecret(prefix: string): string {
  return `${prefix}${crypto.randomBytes(32).toString("base64url")}`;
}

async function requireActiveClient(clientId: string): Promise<void> {
  const [client] = await db.select({ clientId: mcpOauthClients.clientId }).from(mcpOauthClients).where(and(
    eq(mcpOauthClients.clientId, clientId),
    isNull(mcpOauthClients.disabledAt),
  )).limit(1);
  if (!client) throw new OAuthRequestError("invalid_client", "OAuth client is unavailable", 401);
}

export async function isPrivateMcpGrantEligible(userId: number, clientId: string): Promise<boolean> {
  const [runner] = await db.select({
    subscriptionPlan: users.subscriptionPlan,
    subscriptionStatus: users.subscriptionStatus,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!runner || !hasPremiumAccess(runner)) return false;

  if (!process.env.HERMES_MCP_CLIENT_ID || clientId !== process.env.HERMES_MCP_CLIENT_ID) return true;
  if (process.env.COACH_MULTI_RUNNER_PILOT_ENABLED === "false") return false;
  const [row] = await db.select({ runner: users, bindingStatus: coachChannelBindings.status })
    .from(users)
    .innerJoin(coachChannelBindings, eq(coachChannelBindings.userId, users.id))
    .where(and(
      eq(users.id, userId),
      eq(coachChannelBindings.channel, "telegram"),
      or(eq(coachChannelBindings.status, "provisioning"), eq(coachChannelBindings.status, "active")),
      isNull(coachChannelBindings.revokedAt),
    ))
    .limit(1);
  if (row?.bindingStatus && canAccessCapability(row.runner, "ai_coach")) return true;

  // Before channel bindings existed, Hermes received a dedicated MCP grant
  // directly. Those grants are the explicit legacy Telegram authorization set:
  // the configured Hermes client, the private MCP resource, and a still-live
  // refresh grant. Do not broaden this to other OAuth clients.
  return Boolean(await hasRecognizedLegacyCoachGrant(userId, clientId));
}

function getLegacyCoachClientIds(): string[] {
  return [...new Set(
    (process.env.HERMES_LEGACY_MCP_CLIENT_IDS || "")
      .split(",")
      .map((clientId) => clientId.trim())
      .filter((clientId) => /^ra_mcp_client_[A-Za-z0-9_-]+$/.test(clientId)),
  )];
}

function getCoachAgentClientIds(): string[] {
  return [...new Set([
    process.env.HERMES_MCP_CLIENT_ID,
    ...getLegacyCoachClientIds(),
  ].filter((clientId): clientId is string => Boolean(clientId)))];
}

export async function hasRecognizedLegacyCoachGrant(userId: number) {
  const legacyClientIds = getLegacyCoachClientIds();
  if (legacyClientIds.length === 0 || !Number.isSafeInteger(userId) || userId <= 0) return null;
  const [grant] = await db.select({
    createdAt: mcpOauthTokens.createdAt,
  }).from(mcpOauthTokens).where(and(
    eq(mcpOauthTokens.userId, userId),
    inArray(mcpOauthTokens.clientId, legacyClientIds),
    eq(mcpOauthTokens.resource, MCP_RESOURCE),
    isNull(mcpOauthTokens.revokedAt),
    gt(mcpOauthTokens.refreshExpiresAt, new Date()),
  )).limit(1);
  return grant || null;
}

export async function ensureMcpSchema(): Promise<void> {
  // Idempotent startup migration keeps the autoscaled production deployment
  // operational without a separate worker. It creates only MCP auth/audit
  // state and never alters runner, activity, plan, subscription, or catalog data.
  const statements = [
    `CREATE TABLE IF NOT EXISTS mcp_oauth_clients (client_id text PRIMARY KEY, client_name text NOT NULL, redirect_uris jsonb NOT NULL, token_endpoint_auth_method text NOT NULL DEFAULT 'none', created_at timestamp NOT NULL DEFAULT now(), disabled_at timestamp)`,
    `CREATE TABLE IF NOT EXISTS mcp_oauth_requests (request_hash text PRIMARY KEY, client_id text NOT NULL, redirect_uri text NOT NULL, scopes text[] NOT NULL, state text NOT NULL, resource text NOT NULL, code_challenge text NOT NULL, created_at timestamp NOT NULL DEFAULT now(), expires_at timestamp NOT NULL, consumed_at timestamp)`,
    `CREATE TABLE IF NOT EXISTS mcp_oauth_authorization_codes (code_hash text PRIMARY KEY, user_id integer NOT NULL, client_id text NOT NULL, redirect_uri text NOT NULL, scopes text[] NOT NULL, resource text NOT NULL, code_challenge text NOT NULL, created_at timestamp NOT NULL DEFAULT now(), expires_at timestamp NOT NULL, consumed_at timestamp)`,
    `CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (id serial PRIMARY KEY, access_token_hash text NOT NULL UNIQUE, refresh_token_hash text NOT NULL UNIQUE, user_id integer NOT NULL, client_id text NOT NULL, scopes text[] NOT NULL, resource text NOT NULL, access_expires_at timestamp NOT NULL, refresh_expires_at timestamp NOT NULL, created_at timestamp NOT NULL DEFAULT now(), last_used_at timestamp, revoked_at timestamp)`,
    `CREATE TABLE IF NOT EXISTS mcp_audit_events (id serial PRIMARY KEY, event_type text NOT NULL, user_id integer, client_id text, tool_name text, success boolean NOT NULL, error_code text, duration_ms integer, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS mcp_rate_limits (key text PRIMARY KEY, window_started_at timestamp NOT NULL, count integer NOT NULL DEFAULT 0, updated_at timestamp NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS mcp_oauth_requests_client_idx ON mcp_oauth_requests(client_id)`,
    `CREATE INDEX IF NOT EXISTS mcp_oauth_requests_expiry_idx ON mcp_oauth_requests(expires_at)`,
    `CREATE INDEX IF NOT EXISTS mcp_oauth_codes_user_idx ON mcp_oauth_authorization_codes(user_id)`,
    `CREATE INDEX IF NOT EXISTS mcp_oauth_codes_client_idx ON mcp_oauth_authorization_codes(client_id)`,
    `CREATE INDEX IF NOT EXISTS mcp_oauth_tokens_user_client_idx ON mcp_oauth_tokens(user_id, client_id)`,
    `CREATE INDEX IF NOT EXISTS mcp_audit_events_created_idx ON mcp_audit_events(created_at)`,
  ];
  for (const statement of statements) await db.execute(sql.raw(statement));
}

export async function registerPublicClient(input: {
  clientName: string;
  redirectUris: string[];
}): Promise<{ clientId: string; clientName: string; redirectUris: string[] }> {
  const clientId = `ra_mcp_client_${crypto.randomBytes(18).toString("base64url")}`;
  await db.insert(mcpOauthClients).values({
    clientId,
    clientName: input.clientName,
    redirectUris: input.redirectUris,
    tokenEndpointAuthMethod: "none",
  });
  await recordMcpAudit({ eventType: "client_registered", clientId, success: true });
  return { clientId, clientName: input.clientName, redirectUris: input.redirectUris };
}

export async function createAuthorizationRequest(input: {
  clientId: string;
  redirectUri: string;
  scopes: McpScope[];
  state: string;
  resource: string;
  codeChallenge: string;
}): Promise<string> {
  const [client] = await db.select().from(mcpOauthClients).where(and(
    eq(mcpOauthClients.clientId, input.clientId),
    isNull(mcpOauthClients.disabledAt),
  )).limit(1);
  if (!client || !client.redirectUris.includes(input.redirectUri)) {
    throw new OAuthRequestError("invalid_request", "Unknown client or redirect_uri mismatch");
  }
  const rawRequest = randomSecret("ra_mcp_req_");
  await db.insert(mcpOauthRequests).values({
    requestHash: hashMcpSecret(rawRequest),
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    scopes: input.scopes,
    state: input.state,
    resource: input.resource,
    codeChallenge: input.codeChallenge,
    expiresAt: new Date(Date.now() + AUTH_REQUEST_TTL_MS),
  });
  return rawRequest;
}

export async function getPendingAuthorizationRequest(rawRequest: string) {
  const [request] = await db.select().from(mcpOauthRequests).where(and(
    eq(mcpOauthRequests.requestHash, hashMcpSecret(rawRequest)),
    isNull(mcpOauthRequests.consumedAt),
    gt(mcpOauthRequests.expiresAt, new Date()),
  )).limit(1);
  if (!request) throw new OAuthRequestError("invalid_request", "Authorization request is invalid or expired");
  const [client] = await db.select().from(mcpOauthClients).where(eq(mcpOauthClients.clientId, request.clientId)).limit(1);
  if (!client || client.disabledAt) throw new OAuthRequestError("invalid_request", "OAuth client is unavailable");
  return { request, client };
}

export async function decideAuthorization(rawRequest: string, userId: number, approved: boolean) {
  const { request, client } = await getPendingAuthorizationRequest(rawRequest);
  if (approved && !await isPrivateMcpGrantEligible(userId, client.clientId)) {
    throw new OAuthRequestError("access_denied", "Private runner MCP access requires an active Premium subscription or trial", 403);
  }
  const consumed = await db.update(mcpOauthRequests)
    .set({ consumedAt: new Date() })
    .where(and(eq(mcpOauthRequests.requestHash, request.requestHash), isNull(mcpOauthRequests.consumedAt)))
    .returning({ requestHash: mcpOauthRequests.requestHash });
  if (consumed.length !== 1) throw new OAuthRequestError("invalid_request", "Authorization request was already used");

  if (!approved) {
    await recordMcpAudit({ eventType: "authorization_denied", userId, clientId: client.clientId, success: true });
    return { approved: false as const, redirectUri: request.redirectUri, state: request.state };
  }

  const rawCode = randomSecret("ra_mcp_code_");
  await db.insert(mcpOauthAuthorizationCodes).values({
    codeHash: hashMcpSecret(rawCode),
    userId,
    clientId: request.clientId,
    redirectUri: request.redirectUri,
    scopes: request.scopes,
    resource: request.resource,
    codeChallenge: request.codeChallenge,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });
  await recordMcpAudit({ eventType: "authorization_approved", userId, clientId: client.clientId, success: true });
  return { approved: true as const, code: rawCode, redirectUri: request.redirectUri, state: request.state };
}

async function issueToken(input: { userId: number; clientId: string; scopes: McpScope[]; resource: string }) {
  const accessToken = randomSecret("ra_mcp_at_");
  const refreshToken = randomSecret("ra_mcp_rt_");
  const now = Date.now();
  const [inserted] = await db.insert(mcpOauthTokens).values({
    accessTokenHash: hashMcpSecret(accessToken),
    refreshTokenHash: hashMcpSecret(refreshToken),
    userId: input.userId,
    clientId: input.clientId,
    scopes: input.scopes,
    resource: input.resource,
    accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  }).returning({ id: mcpOauthTokens.id });
  if (!inserted) throw new OAuthRequestError("temporarily_unavailable", "MCP grant could not be created", 503);
  return {
    tokenId: inserted.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: input.scopes.join(" "),
    resource: input.resource,
  };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
}) {
  const [code] = await db.select().from(mcpOauthAuthorizationCodes).where(and(
    eq(mcpOauthAuthorizationCodes.codeHash, hashMcpSecret(input.code)),
    isNull(mcpOauthAuthorizationCodes.consumedAt),
    gt(mcpOauthAuthorizationCodes.expiresAt, new Date()),
  )).limit(1);
  if (!code || code.clientId !== input.clientId || code.redirectUri !== input.redirectUri || code.resource !== input.resource) {
    throw new OAuthRequestError("invalid_grant", "Authorization code is invalid, expired, or bound to another client");
  }
  if (!verifyPkce(input.codeVerifier, code.codeChallenge)) {
    throw new OAuthRequestError("invalid_grant", "PKCE verification failed");
  }
  await requireActiveClient(input.clientId);
  if (!await isPrivateMcpGrantEligible(code.userId, input.clientId)) {
    throw new OAuthRequestError("invalid_grant", "Private runner MCP access requires an active Premium subscription or trial", 403);
  }
  const consumed = await db.update(mcpOauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(mcpOauthAuthorizationCodes.codeHash, code.codeHash), isNull(mcpOauthAuthorizationCodes.consumedAt)))
    .returning({ codeHash: mcpOauthAuthorizationCodes.codeHash });
  if (consumed.length !== 1) throw new OAuthRequestError("invalid_grant", "Authorization code was already used");
  const token = await issueToken({ userId: code.userId, clientId: code.clientId, scopes: code.scopes as McpScope[], resource: code.resource });
  await recordMcpAudit({ eventType: "token_issued", userId: code.userId, clientId: code.clientId, success: true });
  const { tokenId: _tokenId, ...response } = token;
  return response;
}

export async function refreshAccessToken(input: {
  refreshToken: string;
  clientId: string;
  resource: string;
  requestedScopes?: McpScope[];
}) {
  const [existing] = await db.select().from(mcpOauthTokens).where(and(
    eq(mcpOauthTokens.refreshTokenHash, hashMcpSecret(input.refreshToken)),
    isNull(mcpOauthTokens.revokedAt),
    gt(mcpOauthTokens.refreshExpiresAt, new Date()),
  )).limit(1);
  if (!existing || existing.clientId !== input.clientId || existing.resource !== input.resource) {
    throw new OAuthRequestError("invalid_grant", "Refresh token is invalid, expired, or bound to another client");
  }
  await requireActiveClient(input.clientId);
  if (!await isPrivateMcpGrantEligible(existing.userId, input.clientId)) {
    throw new OAuthRequestError("invalid_grant", "Private runner MCP access is no longer eligible", 401);
  }
  const scopes = input.requestedScopes || (existing.scopes as McpScope[]);
  if (!isScopeSubset(scopes, existing.scopes)) throw new OAuthRequestError("invalid_scope", "Refresh cannot add scopes");
  const revoked = await db.update(mcpOauthTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpOauthTokens.id, existing.id), isNull(mcpOauthTokens.revokedAt)))
    .returning({ id: mcpOauthTokens.id });
  if (revoked.length !== 1) throw new OAuthRequestError("invalid_grant", "Refresh token was already rotated");
  const token = await issueToken({ userId: existing.userId, clientId: existing.clientId, scopes, resource: existing.resource });
  await recordMcpAudit({ eventType: "token_refreshed", userId: existing.userId, clientId: existing.clientId, success: true });
  const { tokenId: _tokenId, ...response } = token;
  return response;
}

/**
 * Creates the dedicated read-only grant used by the trusted Hermes service
 * after a runner has completed the one-time channel-link consent flow. This is
 * intentionally not exposed as an HTTP OAuth grant type.
 */
export async function issueCoachAgentRunnerGrant(userId: number) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new OAuthRequestError("invalid_request", "Runner identity is invalid");
  }
  const clientId = process.env.HERMES_MCP_CLIENT_ID;
  if (!clientId) throw new OAuthRequestError("temporarily_unavailable", "Coach MCP client is not configured", 503);
  await requireActiveClient(clientId);
  if (!await isPrivateMcpGrantEligible(userId, clientId)) {
    throw new OAuthRequestError("access_denied", "Runner has not opted in to a current coach connection", 403);
  }
  const token = await issueToken({
    userId,
    clientId,
    scopes: [...MCP_SCOPE_NAMES],
    resource: MCP_RESOURCE,
  });
  await recordMcpAudit({ eventType: "coach_binding_token_issued", userId, clientId, success: true });
  return { ...token, client_id: clientId };
}

/** Revokes every live token generation for this runner/client, including
 * refresh-rotated descendants whose database ID no longer matches the binding. */
export async function revokeAllCoachAgentRunnerGrants(userId: number): Promise<number> {
  const coachClientIds = getCoachAgentClientIds();
  if (coachClientIds.length === 0 || !Number.isSafeInteger(userId) || userId <= 0) return 0;
  const revoked = await db.update(mcpOauthTokens)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(mcpOauthTokens.userId, userId),
      inArray(mcpOauthTokens.clientId, coachClientIds),
      eq(mcpOauthTokens.resource, MCP_RESOURCE),
      isNull(mcpOauthTokens.revokedAt),
    ))
    .returning({ id: mcpOauthTokens.id });
  if (revoked.length > 0) {
    await recordMcpAudit({ eventType: "coach_binding_tokens_revoked", userId, success: true });
  }
  return revoked.length;
}

export async function validateAccessToken(rawToken: string): Promise<McpPrincipal> {
  if (!rawToken.startsWith("ra_mcp_at_") || rawToken.length > 256) {
    throw new OAuthRequestError("invalid_token", "Bearer token is invalid", 401);
  }
  const [token] = await db.select().from(mcpOauthTokens)
    .where(eq(mcpOauthTokens.accessTokenHash, hashMcpSecret(rawToken)))
    .limit(1);
  if (!token || !isBoundTokenActive(token, MCP_RESOURCE)) {
    throw new OAuthRequestError("invalid_token", "Bearer token is invalid or expired", 401);
  }
  const [client] = await db.select({ clientId: mcpOauthClients.clientId }).from(mcpOauthClients).where(and(
    eq(mcpOauthClients.clientId, token.clientId),
    isNull(mcpOauthClients.disabledAt),
  )).limit(1);
  if (!client) throw new OAuthRequestError("invalid_token", "Bearer token is invalid or expired", 401);
  if (!await isPrivateMcpGrantEligible(token.userId, token.clientId)) {
    throw new OAuthRequestError("invalid_token", "Bearer token is invalid or expired", 401);
  }
  return {
    userId: token.userId,
    clientId: token.clientId,
    scopes: token.scopes as McpScope[],
    resource: token.resource,
    tokenId: token.id,
  };
}

export async function revokeToken(rawToken: string, clientId: string): Promise<void> {
  const hash = hashMcpSecret(rawToken);
  const [token] = await db.select().from(mcpOauthTokens).where(and(
    eq(mcpOauthTokens.clientId, clientId),
    or(eq(mcpOauthTokens.accessTokenHash, hash), eq(mcpOauthTokens.refreshTokenHash, hash)),
  )).limit(1);
  if (token && !token.revokedAt) {
    await db.update(mcpOauthTokens).set({ revokedAt: new Date() }).where(eq(mcpOauthTokens.id, token.id));
    await recordMcpAudit({ eventType: "token_revoked", userId: token.userId, clientId, success: true });
  }
}

export async function recordMcpAudit(input: {
  eventType: string;
  userId?: number;
  clientId?: string;
  toolName?: string;
  success: boolean;
  errorCode?: string;
  durationMs?: number;
}): Promise<void> {
  try {
    await db.insert(mcpAuditEvents).values(input);
  } catch (error) {
    console.error("[MCP audit] Failed to record metadata-only audit event");
  }
}

export async function consumeDistributedRateLimit(key: string, limit: number, windowMs: number) {
  // Rate-limit keys are pseudonymous operational identifiers, not bearer
  // credentials. A plain one-way hash keeps the public catalog available even
  // when private OAuth has deliberately been disabled by removing its secret.
  const keyHash = crypto.createHash("sha256").update(`mcp-rate-v1:${key}`).digest("hex");
  const cutoff = new Date(Date.now() - windowMs);
  const result = await db.execute(sql`
    INSERT INTO mcp_rate_limits (key, window_started_at, count, updated_at)
    VALUES (${keyHash}, now(), 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN mcp_rate_limits.window_started_at <= ${cutoff} THEN 1 ELSE mcp_rate_limits.count + 1 END,
      window_started_at = CASE WHEN mcp_rate_limits.window_started_at <= ${cutoff} THEN now() ELSE mcp_rate_limits.window_started_at END,
      updated_at = now()
    RETURNING count, window_started_at
  `);
  const row = (result.rows?.[0] || {}) as any;
  const count = Number(row.count || 1);
  const startedAt = new Date(row.window_started_at || Date.now());
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: new Date(startedAt.getTime() + windowMs) };
}
