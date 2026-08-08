import crypto from "node:crypto";

export const MCP_PROTOCOL_VERSION = "2025-11-25";
export const MCP_SERVER_NAME = "runanalytics-read-only";
export const MCP_SERVER_VERSION = "1.0.0";

export function validateIssuerUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("MCP_ISSUER must be an absolute URL");
  }
  const loopback = parsed.protocol === "http:" && ["127.0.0.1", "::1", "localhost"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !loopback) throw new Error("MCP_ISSUER must use HTTPS except on loopback development hosts");
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("MCP_ISSUER must be an origin without credentials, path, query, or fragment");
  }
  return parsed.origin;
}

export const MCP_ISSUER = validateIssuerUrl(process.env.MCP_ISSUER || "https://aitracker.run");
export const MCP_RESOURCE = `${MCP_ISSUER}/mcp`;
export const MCP_PUBLIC_RESOURCE = `${MCP_ISSUER}/mcp/public`;

export const MCP_SCOPES = {
  "mcp:profile.read": "Read your RunAnalytics runner profile and preferences",
  "mcp:activities.read": "Read your visible running activities",
  "mcp:analytics.read": "Read your dashboard trends, fitness, recovery, and runner scores",
  "mcp:goals.read": "Read your goals",
  "mcp:plans.read": "Read your training-plan summaries and details",
} as const;

export type McpScope = keyof typeof MCP_SCOPES;
export const MCP_SCOPE_NAMES = Object.freeze(Object.keys(MCP_SCOPES) as McpScope[]);

export class OAuthRequestError extends Error {
  constructor(
    public readonly error: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OAuthRequestError";
  }
}

export function parseRequestedScopes(value: unknown): McpScope[] {
  if (typeof value !== "string" || value.length > 512) {
    throw new OAuthRequestError("invalid_scope", "A bounded scope value is required");
  }
  const scopes = Array.from(new Set(value.trim().split(/\s+/).filter(Boolean)));
  if (scopes.length === 0 || scopes.some((scope) => !(scope in MCP_SCOPES))) {
    throw new OAuthRequestError("invalid_scope", "Only documented RunAnalytics read scopes are supported");
  }
  return scopes as McpScope[];
}

export function validateCodeChallenge(value: unknown, method: unknown): string {
  if (method !== "S256") {
    throw new OAuthRequestError("invalid_request", "PKCE code_challenge_method must be S256");
  }
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(value)) {
    throw new OAuthRequestError("invalid_request", "A valid PKCE code_challenge is required");
  }
  return value;
}

export function verifyPkce(codeVerifier: unknown, expectedChallenge: string): boolean {
  if (typeof codeVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return false;
  const actual = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const left = Buffer.from(actual);
  const right = Buffer.from(expectedChallenge);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function validateRedirectUri(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) {
    throw new OAuthRequestError("invalid_redirect_uri", "redirect_uri is required");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new OAuthRequestError("invalid_redirect_uri", "redirect_uri must be an absolute URI");
  }
  if (parsed.hash || parsed.username || parsed.password) {
    throw new OAuthRequestError("invalid_redirect_uri", "redirect_uri cannot contain a fragment or credentials");
  }
  const isHttps = parsed.protocol === "https:";
  const isLoopbackHttp = parsed.protocol === "http:" && ["127.0.0.1", "::1", "localhost"].includes(parsed.hostname);
  if (!isHttps && !isLoopbackHttp) {
    throw new OAuthRequestError("invalid_redirect_uri", "redirect_uri must use HTTPS or an HTTP loopback host");
  }
  return parsed.toString();
}

export function requireExactResource(value: unknown): string {
  if (value !== MCP_RESOURCE) {
    throw new OAuthRequestError("invalid_target", `resource must be ${MCP_RESOURCE}`);
  }
  return MCP_RESOURCE;
}

export function buildOAuthRedirect(
  redirectUri: string,
  params: Record<string, string | undefined>,
): string {
  const target = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) target.searchParams.set(key, value);
  }
  return target.toString();
}

export function isScopeSubset(requested: readonly string[], granted: readonly string[]): boolean {
  const allowed = new Set(granted);
  return requested.every((scope) => allowed.has(scope));
}

export function isBoundTokenActive(
  token: { resource: string; accessExpiresAt: Date; revokedAt: Date | null },
  expectedResource: string,
  now = new Date(),
): boolean {
  return token.resource === expectedResource && token.revokedAt === null && token.accessExpiresAt > now;
}

export function authorizationServerMetadata() {
  return {
    issuer: MCP_ISSUER,
    authorization_endpoint: `${MCP_ISSUER}/mcp/oauth/authorize`,
    token_endpoint: `${MCP_ISSUER}/mcp/oauth/token`,
    registration_endpoint: `${MCP_ISSUER}/mcp/oauth/register`,
    revocation_endpoint: `${MCP_ISSUER}/mcp/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: MCP_SCOPE_NAMES,
    service_documentation: `${MCP_ISSUER}/docs/mcp`,
  };
}

export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [MCP_ISSUER],
    scopes_supported: MCP_SCOPE_NAMES,
    bearer_methods_supported: ["header"],
    resource_documentation: `${MCP_ISSUER}/docs/mcp`,
  };
}
