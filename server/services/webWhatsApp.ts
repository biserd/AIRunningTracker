import { createHmac, timingSafeEqual } from "node:crypto";
import type { Express, RequestHandler } from "express";

const ISSUER = "https://aitracker.run";
const COACH = "https://new.aitracker.run";
export const WHATSAPP_READ_SCOPES = ["mcp:profile.read", "mcp:activities.read", "mcp:analytics.read", "mcp:goals.read", "mcp:plans.read"];
type Ticket = { userId: number; request: string; state: string; expires: number };
type Details = { clientName: string; eligible: boolean; scopes: { scope: string; description: string }[] };
class SetupError extends Error { constructor(public status: number, message: string) { super(message); } }
const invalid = () => new SetupError(409, "WhatsApp setup expired or could not be verified. Please start again.");
const signature = (value: string, secret: string) => createHmac("sha256", secret).update("web-whatsapp-consent-v1." + value).digest("base64url");
const same = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function trusted(raw: string, origin: string, path: string) {
  const url = new URL(raw, origin);
  if (url.origin !== origin || url.pathname !== path || url.username || url.password || url.hash) throw invalid();
  return url;
}
function param(url: URL, name: string) {
  const values = url.searchParams.getAll(name);
  if (values.length !== 1 || !values[0]) throw invalid();
  return values[0];
}
function exactScopes(scopes: string[]) {
  if (scopes.length !== WHATSAPP_READ_SCOPES.length || new Set(scopes).size !== scopes.length || scopes.some(s => !WHATSAPP_READ_SCOPES.includes(s))) throw invalid();
}
function checkedDetails(value: any): Details {
  if (!value || typeof value.clientName !== "string" || !Array.isArray(value.scopes) || value.scopes.some((s: any) => !s || typeof s.scope !== "string" || typeof s.description !== "string")) throw invalid();
  exactScopes(value.scopes.map((s: any) => s.scope));
  if (value.eligible !== true) throw new SetupError(403, "An active trial or subscription is required for WhatsApp coaching.");
  return value;
}
export function whatsappConsentTicket(value: Ticket, secret: string): string {
  if (secret.length < 32) throw invalid();
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function readWhatsAppConsentTicket(raw: unknown, userId: number, secret: string, now = Date.now()): Ticket {
  if (typeof raw !== "string" || raw.length > 2048 || secret.length < 32) throw invalid();
  const [payload, signed, extra] = raw.split(".");
  if (!payload || !signed || extra !== undefined || !same(signature(payload, secret), signed)) throw invalid();
  const value: Ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const time = Math.floor(now / 1000);
  if (value.userId !== userId || !Number.isSafeInteger(value.expires) || value.expires <= time || value.expires > time + 600 || !/^ra_mcp_req_[A-Za-z0-9_-]{40,80}$/.test(value.request) || !/^[a-f0-9]{64}$/.test(value.state)) throw invalid();
  return value;
}
export function checkedWhatsAppLink(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 512) throw invalid();
  const parsed = new URL(raw);
  const url = trusted(raw, "https://wa.me", parsed.pathname);
  if (!/^\/[1-9][0-9]{7,14}$/.test(url.pathname) || !/^LINK [a-f0-9]{48}$/.test(param(url, "text")) || Array.from(url.searchParams.keys()).some(key => key !== "text")) throw invalid();
  return url.toString();
}

export interface WebWhatsAppDependencies {
  authenticate: RequestHandler;
  signingSecret: () => string;
  fetch?: typeof fetch;
  now?: () => number;
}

// Same first-party, account-bound PKCE flow as iOS. Only fixed destinations and
// read scopes are accepted; never forward client-supplied URLs or account IDs.
export function registerWebWhatsApp(app: Express, deps: WebWhatsAppDependencies) {
  const request = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  async function json(url: string, token: string, body?: unknown, coach = false) {
    const origin = coach ? COACH : ISSUER;
    if (new URL(url).origin !== origin) throw invalid();
    const response = await request(url, {
      method: body === undefined ? "GET" : "POST", redirect: "manual", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", Origin: origin, ...(coach ? { Cookie: `__Host-coach_account=${token}` } : { Authorization: `Bearer ${token}` }), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 403) throw new SetupError(403, "An active trial or subscription is required for WhatsApp coaching.");
      if (response.status === 429) throw new SetupError(429, "Please wait before trying WhatsApp setup again.");
      throw new SetupError(503, "WhatsApp is temporarily unavailable. Please try again.");
    }
    const text = await response.text();
    if (text.length > 32000) throw invalid();
    return JSON.parse(text);
  }
  const coachCall = (token: string, path = "", body?: unknown) => json(COACH + "/api/whatsapp" + path, token, body, true);
  const details = async (token: string, id: string) => checkedDetails(await json(ISSUER + "/mcp/oauth/authorization-request?request=" + encodeURIComponent(id), token));
  const route = (path: string, method: "get" | "post", action: (token: string, userId: number, body: any) => Promise<unknown>) => {
    app[method]("/api/coach/whatsapp" + path, deps.authenticate, async (req, res) => {
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      // Existing web auth is a bearer JWT, not ambient browser cookies.
      const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
      if (!token) return res.status(401).json({ message: "Please sign in again." });
      if (method === "post" && req.body?.confirm !== true) return res.status(400).json({ message: "Please confirm this action." });
      try { return res.json(await action(token, (req as any).user.id, req.body)); }
      catch (error) {
        return res.status(error instanceof SetupError ? error.status : 503).json({ message: error instanceof SetupError ? error.message : "WhatsApp setup could not be completed. Please try again." });
      }
    });
  };
  route("", "get", async token => {
    const result = await coachCall(token);
    if (["configured", "authorized", "connected", "templateReady"].some(key => typeof result[key] !== "boolean") || !(result.destination === null || typeof result.destination === "string")) throw invalid();
    return { configured: result.configured, authorized: result.authorized, connected: result.connected, templateReady: result.templateReady, destination: result.destination };
  });
  route("/review", "post", async (token, userId) => {
    const start = await coachCall(token, "/authorize", { confirm: true });
    if (typeof start.authorizationUrl !== "string") throw invalid();
    const url = trusted(start.authorizationUrl, ISSUER, "/mcp/oauth/authorize");
    const state = param(url, "state");
    if (!/^[a-f0-9]{64}$/.test(state) || param(url, "response_type") !== "code" || param(url, "code_challenge_method") !== "S256" || param(url, "redirect_uri") !== COACH + "/whatsapp/callback" || param(url, "resource") !== ISSUER + "/mcp") throw invalid();
    exactScopes(param(url, "scope").split(" "));
    const response = await request(url.toString(), { redirect: "manual", signal: AbortSignal.timeout(15000) });
    await response.body?.cancel();
    if (response.status !== 302) throw invalid();
    const consent = trusted(response.headers.get("location") || "", ISSUER, "/mcp/consent");
    const id = param(consent, "request");
    if (!/^ra_mcp_req_[A-Za-z0-9_-]{40,80}$/.test(id)) throw invalid();
    const review = await details(token, id);
    return { details: review, ticket: whatsappConsentTicket({ userId, request: id, state, expires: Math.floor(now() / 1000) + 600 }, deps.signingSecret()) };
  });
  route("/approve", "post", async (token, userId, body) => {
    const ticket = readWhatsAppConsentTicket(body.ticket, userId, deps.signingSecret(), now());
    await details(token, ticket.request);
    const decision = await json(ISSUER + "/mcp/oauth/authorize/decision", token, { request: ticket.request, approved: true });
    if (typeof decision.redirectTo !== "string") throw invalid();
    const callback = trusted(decision.redirectTo, COACH, "/whatsapp/callback");
    const code = param(callback, "code");
    if (param(callback, "state") !== ticket.state || callback.searchParams.has("error") || code.length > 512) throw invalid();
    await coachCall(token, "/finish", { code, state: ticket.state });
    return { approved: true };
  });
  route("/connect", "post", async token => {
    const result = await coachCall(token, "/connect", { confirm: true });
    return { url: checkedWhatsAppLink(result.url), expiresIn: 600 };
  });
  route("/disconnect", "post", async token => {
    await coachCall(token, "/disconnect", { confirm: true });
    return { disconnected: true };
  });
}
