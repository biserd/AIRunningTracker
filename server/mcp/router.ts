import type { Express, Request, Response } from "express";
import {consentPage} from '../../shared/mcpConsentPage';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { authService } from "../services/auth";
import { mayInitializeSchema } from '../config/runtime';
import {
  MCP_ISSUER,
  MCP_RESOURCE,
  MCP_SCOPES,
  MCP_SCOPE_NAMES,
  OAuthRequestError,
  authorizationServerMetadata,
  buildOAuthRedirect,
  parseRequestedScopes,
  protectedResourceMetadata,
  requireExactResource,
  validateCodeChallenge,
  validateRedirectUri,
} from "./contract";
import {
  consumeDistributedRateLimit,
  createAuthorizationRequest,
  decideAuthorization,
  ensureMcpSchema,
  exchangeAuthorizationCode,
  getPendingAuthorizationRequest,
  isPrivateMcpGrantEligible,
  refreshAccessToken,
  registerPublicClient,
  revokeToken,
  validateAccessToken,
} from "./oauthService";
import { createPrivateMcpServer, createPublicMcpServer } from "./tools";

const PRIVATE_RATE_LIMIT = 120;
const PUBLIC_RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function oauthError(res: Response, error: unknown) {
  const known = error instanceof OAuthRequestError;
  const status = known ? error.status : 500;
  res.status(status).set("Cache-Control", "no-store").json({
    error: known ? error.error : "server_error",
    error_description: known ? error.message : "The authorization request could not be completed",
  });
}

function requestIp(req: Request): string {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim().slice(0, 128);
}

function allowedOrigins(): string[] {
  const configured = (process.env.MCP_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set([MCP_ISSUER, ...configured]));
}

function allowedHosts(): string[] {
  const configured = (process.env.MCP_ALLOWED_HOSTS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set([new URL(MCP_ISSUER).host, "aitracker.run", ...configured]));
}

function validateOrigin(req: Request, res: Response): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  if (!allowedOrigins().includes(origin)) {
    res.status(403).json({ jsonrpc: "2.0", error: { code: -32000, message: "Origin is not allowed" }, id: null });
    return false;
  }
  return true;
}

function bearerChallenge(res: Response, error = "invalid_token", description = "A valid MCP access token is required") {
  const metadata = `${MCP_ISSUER}/.well-known/oauth-protected-resource/mcp`;
  res.set("WWW-Authenticate", `Bearer realm="runanalytics-mcp", resource_metadata="${metadata}", scope="${MCP_SCOPE_NAMES.join(" ")}", error="${error}", error_description="${description}"`);
  return res.status(401).set("Cache-Control", "no-store").json({ error, error_description: description });
}


async function handleMcpRequest(req: Request, res: Response, isPublic: boolean) {
  if (!validateOrigin(req, res)) return;
  res.set("Cache-Control", "no-store");
  let principal: Awaited<ReturnType<typeof validateAccessToken>> | undefined;
  try {
    if (isPublic) {
      const rate = await consumeDistributedRateLimit(`public:${requestIp(req)}`, PUBLIC_RATE_LIMIT, RATE_WINDOW_MS);
      res.set("X-RateLimit-Remaining", String(rate.remaining));
      if (!rate.allowed) return res.status(429).json({ error: "rate_limit_exceeded", retry_after: Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)) });
    } else {
      const header = req.get("authorization");
      if (!header?.startsWith("Bearer ")) return bearerChallenge(res);
      principal = await validateAccessToken(header.slice(7));
      const rate = await consumeDistributedRateLimit(`private:${principal.clientId}:${principal.userId}`, PRIVATE_RATE_LIMIT, RATE_WINDOW_MS);
      res.set("X-RateLimit-Remaining", String(rate.remaining));
      if (!rate.allowed) return res.status(429).json({ error: "rate_limit_exceeded", retry_after: Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)) });
    }

    const server = isPublic ? createPublicMcpServer() : createPrivateMcpServer(principal!);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedOrigins: allowedOrigins(),
      allowedHosts: allowedHosts(),
    });
    await server.connect(transport);
    try {
      await transport.handleRequest(req, res, req.body);
    } finally {
      await transport.close();
      await server.close();
    }
  } catch (error) {
    if (!isPublic && error instanceof OAuthRequestError && error.status === 401) {
      return bearerChallenge(res, error.error, error.message);
    }
    if (!res.headersSent) return oauthError(res, error);
  }
}

export async function registerMcpRoutes(app: Express): Promise<void> {
  if (mayInitializeSchema()) await ensureMcpSchema();
  if (!process.env.MCP_TOKEN_HASH_SECRET || process.env.MCP_TOKEN_HASH_SECRET.length < 32) {
    console.warn("[MCP] Private OAuth disabled until MCP_TOKEN_HASH_SECRET is configured with at least 32 characters");
  }

  app.get("/.well-known/oauth-authorization-server", (_req, res) => res.set("Cache-Control", "public, max-age=3600").json(authorizationServerMetadata()));
  app.get("/.well-known/oauth-protected-resource", (_req, res) => res.set("Cache-Control", "public, max-age=3600").json(protectedResourceMetadata()));
  app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => res.set("Cache-Control", "public, max-age=3600").json(protectedResourceMetadata()));
  app.get("/docs/mcp", (_req, res) => res.redirect(301, "/developers/mcp"));

  app.post("/mcp/oauth/register", async (req, res) => {
    try {
      const rate = await consumeDistributedRateLimit(`register:${requestIp(req)}`, 10, 60 * 60 * 1000);
      if (!rate.allowed) return res.status(429).json({ error: "rate_limit_exceeded" });
      const body = req.body || {};
      if (typeof body.client_name !== "string" || !body.client_name.trim() || body.client_name.length > 100) throw new OAuthRequestError("invalid_client_metadata", "client_name must be 1-100 characters");
      if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length < 1 || body.redirect_uris.length > 5) throw new OAuthRequestError("invalid_redirect_uri", "Provide 1-5 redirect_uris");
      if (body.redirect_uris.some((value: unknown) => typeof value !== "string")) throw new OAuthRequestError("invalid_redirect_uri", "Every redirect_uri must be a string");
      const redirectUris = Array.from(new Set((body.redirect_uris as string[]).map(validateRedirectUri)));
      if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") throw new OAuthRequestError("invalid_client_metadata", "Only public PKCE clients are supported");
      if (body.grant_types && (!Array.isArray(body.grant_types) || body.grant_types.some((value: string) => !["authorization_code", "refresh_token"].includes(value)))) throw new OAuthRequestError("invalid_client_metadata", "Only authorization_code and refresh_token grants are supported");
      if (body.response_types && (!Array.isArray(body.response_types) || body.response_types.some((value: string) => value !== "code"))) throw new OAuthRequestError("invalid_client_metadata", "Only the code response type is supported");
      const client = await registerPublicClient({ clientName: body.client_name.trim(), redirectUris });
      res.status(201).set("Cache-Control", "no-store").json({
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        client_id_issued_at: Math.floor(Date.now() / 1000),
      });
    } catch (error) { oauthError(res, error); }
  });

  app.get("/mcp/oauth/authorize", async (req, res) => {
    try {
      const rate = await consumeDistributedRateLimit(`authorize:${requestIp(req)}`, 120, 60 * 60 * 1000);
      if (!rate.allowed) return res.status(429).set("Cache-Control", "no-store").json({ error: "rate_limit_exceeded" });
      if (req.query.response_type !== "code") throw new OAuthRequestError("unsupported_response_type", "response_type must be code");
      const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
      const redirectUri = validateRedirectUri(req.query.redirect_uri);
      const scopes = parseRequestedScopes(req.query.scope);
      const state = typeof req.query.state === "string" && req.query.state.length >= 8 && req.query.state.length <= 512 ? req.query.state : (() => { throw new OAuthRequestError("invalid_request", "A bounded state value is required"); })();
      const resource = requireExactResource(req.query.resource);
      const codeChallenge = validateCodeChallenge(req.query.code_challenge, req.query.code_challenge_method);
      const request = await createAuthorizationRequest({ clientId, redirectUri, scopes, state, resource, codeChallenge });
      res.redirect(302, `/mcp/consent?request=${encodeURIComponent(request)}`);
    } catch (error) { oauthError(res, error); }
  });

  app.get("/mcp/consent", (req, res) => {
    const request = typeof req.query.request === "string" ? req.query.request : "";
    if (!/^ra_mcp_req_[A-Za-z0-9_-]{40,80}$/.test(request)) return res.status(400).type("html").send("Invalid authorization request");
    const {html,policy}=consentPage(request);
    // Exact-script authorization survives an intermediary adding a nonce. Unlike
    // unsafe-inline, a CSP hash is not disabled by a nonce elsewhere in the policy.
    res.set("Cache-Control", "no-store").set("Referrer-Policy","no-referrer").set("Content-Security-Policy", policy).type("html").send(html);
  });

  app.get("/mcp/oauth/authorization-request", async (req, res) => {
    try {
      const authHeader = req.get("authorization");
      const webUser = authHeader?.startsWith("Bearer ") ? await authService.verifyToken(authHeader.slice(7)) : null;
      if (!webUser) return res.status(401).set("Cache-Control", "no-store").json({ error: "login_required" });
      const rawRequest = typeof req.query.request === "string" ? req.query.request : "";
      const { request, client } = await getPendingAuthorizationRequest(rawRequest);
      const eligible = await isPrivateMcpGrantEligible(webUser.id, client.clientId);
      res.set("Cache-Control", "no-store").json({ clientName: client.clientName, eligible, scopes: request.scopes.map((scope) => ({ scope, description: MCP_SCOPES[scope as keyof typeof MCP_SCOPES] })) });
    } catch (error) { oauthError(res, error); }
  });

  app.post("/mcp/oauth/authorize/decision", async (req, res) => {
    try {
      if (!validateOrigin(req, res)) return;
      const authHeader = req.get("authorization");
      const webUser = authHeader?.startsWith("Bearer ") ? await authService.verifyToken(authHeader.slice(7)) : null;
      if (!webUser) return res.status(401).set("Cache-Control", "no-store").json({ error: "login_required" });
      const rawRequest = typeof req.body?.request === "string" ? req.body.request : "";
      const approved = req.body?.approved === true;
      const result = await decideAuthorization(rawRequest, webUser.id, approved);
      const redirectTo = result.approved
        ? buildOAuthRedirect(result.redirectUri, { code: result.code, state: result.state })
        : buildOAuthRedirect(result.redirectUri, { error: "access_denied", error_description: "The runner denied access", state: result.state });
      res.set("Cache-Control", "no-store").json({ redirectTo });
    } catch (error) { oauthError(res, error); }
  });

  app.post("/mcp/oauth/token", async (req, res) => {
    try {
      const rate = await consumeDistributedRateLimit(`token:${requestIp(req)}`, 120, 60 * 1000);
      if (!rate.allowed) return res.status(429).set("Cache-Control", "no-store").json({ error: "rate_limit_exceeded" });
      if (!req.is("application/x-www-form-urlencoded")) throw new OAuthRequestError("invalid_request", "Token requests must use application/x-www-form-urlencoded", 415);
      const body = req.body || {};
      const clientId = typeof body.client_id === "string" ? body.client_id : "";
      const resource = requireExactResource(body.resource);
      let token;
      if (body.grant_type === "authorization_code") {
        token = await exchangeAuthorizationCode({ code: String(body.code || ""), clientId, redirectUri: validateRedirectUri(body.redirect_uri), codeVerifier: String(body.code_verifier || ""), resource });
      } else if (body.grant_type === "refresh_token") {
        const requestedScopes = body.scope ? parseRequestedScopes(body.scope) : undefined;
        token = await refreshAccessToken({ refreshToken: String(body.refresh_token || ""), clientId, resource, requestedScopes });
      } else {
        throw new OAuthRequestError("unsupported_grant_type", "Only authorization_code and refresh_token are supported");
      }
      res.set("Cache-Control", "no-store").set("Pragma", "no-cache").json(token);
    } catch (error) { oauthError(res, error); }
  });

  app.post("/mcp/oauth/revoke", async (req, res) => {
    try {
      const rate = await consumeDistributedRateLimit(`revoke:${requestIp(req)}`, 120, 60 * 1000);
      if (!rate.allowed) return res.status(429).set("Cache-Control", "no-store").json({ error: "rate_limit_exceeded" });
      if (!req.is("application/x-www-form-urlencoded")) throw new OAuthRequestError("invalid_request", "Revocation requests must use application/x-www-form-urlencoded", 415);
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const clientId = typeof req.body?.client_id === "string" ? req.body.client_id : "";
      if (token && clientId) await revokeToken(token, clientId);
      res.status(200).set("Cache-Control", "no-store").send("");
    } catch (error) { oauthError(res, error); }
  });

  app.post("/mcp", (req, res) => { void handleMcpRequest(req, res, false); });
  app.get("/mcp", (req, res) => { void handleMcpRequest(req, res, false); });
  app.delete("/mcp", (req, res) => { void handleMcpRequest(req, res, false); });
  app.post("/mcp/public", (req, res) => { void handleMcpRequest(req, res, true); });
  app.get("/mcp/public", (req, res) => { void handleMcpRequest(req, res, true); });
  app.delete("/mcp/public", (req, res) => { void handleMcpRequest(req, res, true); });
}
