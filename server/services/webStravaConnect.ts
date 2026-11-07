import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, RequestHandler } from "express";

const COOKIE = "strava_connect_state";
const TTL = 600;
const PREFIX = "strava_connect_v1.";
interface ConnectionState { userId: number; expires: number; nonce: string }
type SyncStatus = "queued" | "upgrade_required" | "unavailable";
const sign = (value: string, secret: string) => createHmac("sha256", secret).update(PREFIX + value).digest("base64url");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function webStravaClientId(env: NodeJS.ProcessEnv = process.env): string {
  const clientId = (env.STRAVA_CLIENT_ID || env.VITE_STRAVA_CLIENT_ID || "").trim();
  if (!/^[1-9]\d*$/.test(clientId)) throw new Error("STRAVA_UNAVAILABLE");
  return clientId;
}

export function createWebStravaState(userId: number, secret: string, now = Date.now()): string {
  if (!Number.isSafeInteger(userId) || userId <= 0 || secret.length < 32) throw new Error("INVALID_STATE");
  const value = Buffer.from(JSON.stringify({ userId, expires: Math.floor(now / 1000) + TTL, nonce: randomBytes(24).toString("hex") })).toString("base64url");
  return `${PREFIX}${value}.${sign(value, secret)}`;
}

export function readWebStravaState(state: unknown, cookieHeader: string | undefined, secret: string, now = Date.now()): ConnectionState {
  if (typeof state !== "string" || state.length > 1024 || !state.startsWith(PREFIX) || secret.length < 32) throw new Error("INVALID_STATE");
  const cookie = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie || !equal(state, cookie)) throw new Error("INVALID_STATE");
  const [value, signature, extra] = state.slice(PREFIX.length).split(".");
  if (!value || !signature || extra !== undefined || !equal(sign(value, secret), signature)) throw new Error("INVALID_STATE");
  const payload: ConnectionState = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  const time = Math.floor(now / 1000);
  if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0 || !Number.isSafeInteger(payload.expires) || payload.expires <= time || payload.expires > time + TTL || !/^[a-f0-9]{48}$/.test(payload.nonce)) throw new Error("INVALID_STATE");
  return payload;
}

export function webStravaAuthorizeUrl(clientId: string, origin: string, state: string, write = false): string {
  if (!/^[1-9]\d*$/.test(clientId)) throw new Error("STRAVA_UNAVAILABLE");
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: new URL("/strava/callback", origin).toString(), approval_prompt: "force", scope: `read,activity:read_all${write ? ",activity:write" : ""}`, state }).toString();
  return url.toString();
}

export interface WebStravaDependencies {
  authenticate: RequestHandler;
  clientId: () => string;
  signingSecret: () => string;
  getUser: (id: number) => Promise<{ id: number } | null | undefined>;
  findAthlete: (id: string) => Promise<{ id: number } | null | undefined>;
  exchange: (code: string) => Promise<{ access_token: string; refresh_token: string; athlete: { id: number }; scope?: string }>;
  save: (userId: number, connection: { stravaAccessToken: string; stravaRefreshToken: string; stravaAthleteId: string; stravaConnected: boolean; stravaHasWriteScope: boolean }) => Promise<unknown>;
  afterConnect: (userId: number) => Promise<SyncStatus>;
}

export function registerWebStravaConnect(app: Express, deps: WebStravaDependencies): void {
  app.post("/api/strava/authorize", deps.authenticate, (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.body?.write !== undefined && typeof req.body.write !== "boolean") return res.status(400).json({ message: "Invalid connection options" });
    try {
      const state = createWebStravaState((req as any).user.id, deps.signingSecret());
      const url = webStravaAuthorizeUrl(deps.clientId(), `${req.protocol}://${req.get("host")}`, state, req.body?.write === true);
      res.cookie(COOKIE, state, { maxAge: TTL * 1000, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/strava/callback" });
      return res.json({ url });
    } catch {
      return res.status(503).json({ message: "Strava connection is temporarily unavailable. Please try again later." });
    }
  });

  app.get("/strava/callback", async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    let userId: number;
    try { userId = readWebStravaState(req.query.state, req.headers.cookie, deps.signingSecret()).userId; }
    catch { return res.redirect("/dashboard?error=strava_state_invalid"); }
    res.clearCookie(COOKIE, { path: "/strava/callback", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    if (req.query.error || typeof req.query.code !== "string" || !req.query.code) return res.redirect("/dashboard?error=strava_denied");
    try {
      if (!await deps.getUser(userId)) return res.redirect("/auth?error=strava_failed");
      const tokens = await deps.exchange(req.query.code);
      const scope = typeof tokens.scope === "string" ? tokens.scope : typeof req.query.scope === "string" ? req.query.scope : "";
      const granted = new Set(scope.split(/[,\s]+/));
      if (!granted.has("activity:read_all") && !granted.has("activity:read")) return res.redirect("/dashboard?error=strava_read_permission");
      if (!Number.isSafeInteger(tokens.athlete?.id) || tokens.athlete.id <= 0 || !tokens.access_token || !tokens.refresh_token) throw new Error("INVALID_TOKENS");
      const athleteId = String(tokens.athlete.id);
      const owner = await deps.findAthlete(athleteId);
      if (owner && owner.id !== userId) return res.redirect("/dashboard?error=strava_already_connected");
      await deps.save(userId, { stravaAccessToken: tokens.access_token, stravaRefreshToken: tokens.refresh_token, stravaAthleteId: athleteId, stravaConnected: true, stravaHasWriteScope: granted.has("activity:write") });
      let sync: SyncStatus = "unavailable";
      try { sync = await deps.afterConnect(userId); } catch { /* Saved connection remains valid; do not claim sync succeeded. */ }
      return res.redirect(`/dashboard?connected=true&sync=${sync}`);
    } catch {
      console.error("[Strava] Web reconnect failed during token exchange or connection save");
      return res.redirect("/dashboard?error=connection_failed");
    }
  });
}
