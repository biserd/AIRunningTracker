import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createWebStravaState, readWebStravaState, registerWebStravaConnect, webStravaAuthorizeUrl, webStravaClientId, type WebStravaDependencies } from "./webStravaConnect";

const secret = "fixture-only-connection-signing-secret-not-for-production";
const now = 1700000000000;
const cookie = (state: string) => `strava_connect_state=${state}`;

test("runtime client configuration is numeric and has no placeholder fallback", () => {
  assert.equal(webStravaClientId({ STRAVA_CLIENT_ID: "1234", VITE_STRAVA_CLIENT_ID: "5678" }), "1234");
  assert.equal(webStravaClientId({ VITE_STRAVA_CLIENT_ID: " 5678 " }), "5678");
  for (const value of [undefined, "", "default_client_id", "0", "12&scope=write"]) assert.throws(() => webStravaClientId({ VITE_STRAVA_CLIENT_ID: value }));
});

test("connection state binds the authenticated account, browser and ten-minute expiry", () => {
  const state = createWebStravaState(1007, secret, now);
  assert.equal(readWebStravaState(state, cookie(state), secret, now).userId, 1007);
  assert.notEqual(state, createWebStravaState(1007, secret, now));
  for (const invalid of ["1007", "1007_audit", state + "x", state.replace(/.$/, state.endsWith("a") ? "b" : "a")]) assert.throws(() => readWebStravaState(invalid, cookie(invalid), secret, now));
  assert.throws(() => readWebStravaState(state, undefined, secret, now));
  assert.throws(() => readWebStravaState(state, cookie(createWebStravaState(1008, secret, now)), secret, now));
  assert.throws(() => readWebStravaState(state, cookie(state), secret + "different", now));
  assert.throws(() => readWebStravaState(state, cookie(state), secret, now + 600000));
  assert.throws(() => createWebStravaState(0, secret, now));
});

test("read-only reconnect and explicit write authorization use server configuration", () => {
  const state = createWebStravaState(1007, secret);
  const read = new URL(webStravaAuthorizeUrl("1234", "https://aitracker.run", state));
  assert.equal(read.searchParams.get("client_id"), "1234");
  assert.equal(read.searchParams.get("redirect_uri"), "https://aitracker.run/strava/callback");
  assert.equal(read.searchParams.get("approval_prompt"), "force");
  assert.equal(read.searchParams.get("state"), state);
  assert.equal(read.searchParams.get("scope"), "read,activity:read_all");
  const write = new URL(webStravaAuthorizeUrl("1234", "https://aitracker.run", state, true));
  assert.equal(write.searchParams.get("scope"), "read,activity:read_all,activity:write");
});

async function fixture(run: (context: { origin: string; stats: { exchanges: number; saves: any[]; after: number }; start: (body?: unknown) => Promise<{ state: string; cookie: string; url: URL }> }) => Promise<void>, overrides: Partial<WebStravaDependencies> = {}) {
  const app = express(); app.use(express.json());
  const stats = { exchanges: 0, saves: [] as any[], after: 0 };
  const deps: WebStravaDependencies = {
    authenticate: (req, res, next) => { if (req.headers.authorization !== "Bearer fixture-user") { res.status(401).json({ message: "Unauthorized" }); return; } (req as any).user = { id: 1007 }; next(); },
    clientId: () => "1234", signingSecret: () => secret,
    getUser: async id => ({ id }), findAthlete: async () => undefined,
    exchange: async () => { stats.exchanges++; return { access_token: "fixture-access", refresh_token: "fixture-refresh", athlete: { id: 555 } }; },
    save: async (id, connection) => { stats.saves.push({ id, ...connection }); },
    afterConnect: async () => { stats.after++; return "queued"; },
    ...overrides,
  };
  registerWebStravaConnect(app, deps);
  let server: ReturnType<typeof app.listen>;
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${(server!.address() as any).port}`;
  const start = async (body: unknown = {}) => {
    const response = await fetch(`${origin}/api/strava/authorize`, { method: "POST", headers: { Authorization: "Bearer fixture-user", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const setCookie = response.headers.get("set-cookie")!;
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/); assert.match(setCookie, /Path=\/strava\/callback/);
    const data = await response.json(); const url = new URL(data.url);
    return { url, state: url.searchParams.get("state")!, cookie: setCookie.split(";")[0] };
  };
  try { await run({ origin, stats, start }); }
  finally { server!.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
}

test("authorization start requires authentication and ignores a supplied account ID", async () => fixture(async ({ origin, stats, start }) => {
  const anonymous = await fetch(`${origin}/api/strava/authorize`, { method: "POST" });
  assert.equal(anonymous.status, 401);
  const started = await start({ userId: 9999 });
  assert.equal(readWebStravaState(started.state, started.cookie, secret).userId, 1007);
  assert.equal(stats.exchanges, 0);
  const invalid = await fetch(`${origin}/api/strava/authorize`, { method: "POST", headers: { Authorization: "Bearer fixture-user", "Content-Type": "application/json" }, body: JSON.stringify({ write: "true" }) });
  assert.equal(invalid.status, 400);
}));

test("missing runtime configuration is a friendly 503, never a placeholder redirect", async () => fixture(async ({ origin }) => {
  const response = await fetch(`${origin}/api/strava/authorize`, { method: "POST", headers: { Authorization: "Bearer fixture-user" } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match((await response.json()).message, /temporarily unavailable/);
}, { clientId: () => webStravaClientId({}) }));

test("legacy account-ID callbacks are rejected before token exchange or saving", async () => fixture(async ({ origin, stats }) => {
  for (const state of ["1007", "1007_audit"]) {
    const response = await fetch(`${origin}/strava/callback?code=fixture-code&state=${state}`, { redirect: "manual" });
    assert.equal(response.headers.get("location"), "/dashboard?error=strava_state_invalid");
  }
  assert.equal(stats.exchanges, 0); assert.equal(stats.saves.length, 0);
}));

test("read-only reconnect saves the authenticated account and reports queued, not completed", async () => fixture(async ({ origin, stats, start }) => {
  const started = await start();
  const response = await fetch(`${origin}/strava/callback?code=fixture-code&scope=read,activity:read_all&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(response.headers.get("location"), "/dashboard?connected=true&sync=queued");
  assert.equal(stats.saves[0].id, 1007); assert.equal(stats.saves[0].stravaHasWriteScope, false);
  assert.equal(stats.after, 1);
  assert.match(response.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
}));

test("write-scope flag reflects the granted permission, not the requested permission", async () => fixture(async ({ origin, stats, start }) => {
  for (const scope of ["read,activity:read_all", "read,activity:read_all,activity:write"]) {
    const started = await start({ write: true });
    await fetch(`${origin}/strava/callback?code=fixture-code&scope=${scope}&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  }
  assert.deepEqual(stats.saves.map(s => s.stravaHasWriteScope), [false, true]);
}));

test("denied authorization, missing activity access and another browser cannot update a connection", async () => fixture(async ({ origin, stats, start }) => {
  const started = await start();
  const denied = await fetch(`${origin}/strava/callback?error=access_denied&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(denied.headers.get("location"), "/dashboard?error=strava_denied");
  const missing = await fetch(`${origin}/strava/callback?code=fixture-code&scope=read&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(missing.headers.get("location"), "/dashboard?error=strava_read_permission");
  const noCookie = await fetch(`${origin}/strava/callback?code=fixture-code&scope=read,activity:read_all&state=${started.state}`, { redirect: "manual" });
  assert.equal(noCookie.headers.get("location"), "/dashboard?error=strava_state_invalid");
  assert.equal(stats.saves.length, 0);
}));

test("an athlete owned by another account cannot be reassigned", async () => fixture(async ({ origin, stats, start }) => {
  const started = await start();
  const response = await fetch(`${origin}/strava/callback?code=fixture-code&scope=activity:read_all&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(response.headers.get("location"), "/dashboard?error=strava_already_connected");
  assert.equal(stats.saves.length, 0); assert.equal(stats.after, 0);
}, { findAthlete: async () => ({ id: 1008 }) }));

test("a restored connection honestly reports Free sync limits", async () => fixture(async ({ origin, stats, start }) => {
  const started = await start();
  const response = await fetch(`${origin}/strava/callback?code=fixture-code&scope=activity:read_all&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(response.headers.get("location"), "/dashboard?connected=true&sync=upgrade_required");
  assert.equal(stats.saves.length, 1);
}, { afterConnect: async () => "upgrade_required" }));

test("a queue failure does not discard saved tokens or claim activities synced", async () => fixture(async ({ origin, stats, start }) => {
  const started = await start();
  const response = await fetch(`${origin}/strava/callback?code=fixture-code&scope=activity:read_all&state=${started.state}`, { headers: { Cookie: started.cookie }, redirect: "manual" });
  assert.equal(response.headers.get("location"), "/dashboard?connected=true&sync=unavailable");
  assert.equal(stats.saves.length, 1);
}, { afterConnect: async () => { throw new Error("fixture queue failure"); } }));
