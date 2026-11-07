import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { checkedWhatsAppLink, readWhatsAppConsentTicket, registerWebWhatsApp, whatsappConsentTicket, WHATSAPP_READ_SCOPES } from "./webWhatsApp";

const secret = "fixture-only-whatsapp-signing-secret-at-least-32-characters";
const now = 1700000000000;
const requestId = "ra_mcp_req_" + "a".repeat(48);
const state = "a".repeat(64);
const link = "https://wa.me/15551234567?text=LINK%20" + "a".repeat(48);
const payload = { userId: 1007, request: requestId, state, expires: now / 1000 + 600 };
test("consent tickets reject changed account, tampering, expiry and wrong signing key", () => {
  const ticket = whatsappConsentTicket(payload, secret);
  assert.deepEqual(readWhatsAppConsentTicket(ticket, 1007, secret, now), payload);
  assert.throws(() => readWhatsAppConsentTicket(ticket, 1008, secret, now));
  assert.throws(() => readWhatsAppConsentTicket(ticket + "x", 1007, secret, now));
  assert.throws(() => readWhatsAppConsentTicket(ticket, 1007, secret, now + 600000));
  assert.throws(() => readWhatsAppConsentTicket(ticket, 1007, secret + "different", now));
});
test("private WhatsApp links cannot redirect to arbitrary URLs or carry arbitrary text", () => {
  assert.equal(checkedWhatsAppLink(link), link);
  for (const raw of [link.replace("wa.me", "evil.example"), link.replace("https:", "http:"), link + "&text=duplicate", link + "&redirect=evil", link + "#fragment", "https://wa.me/15551234567?text=Hello", "https://wa.me@evil.example/15551234567?text=LINK"]) assert.throws(() => checkedWhatsAppLink(raw));
});

async function fixture(run: (ctx: { call: (path?: string, body?: unknown, account?: string) => Promise<Response>; calls: { url: URL; init: RequestInit }[]; mode: { value: string } }) => Promise<void>) {
  const app = express(); app.use(express.json());
  const calls: { url: URL; init: RequestInit }[] = [];
  const mode = { value: "ok" };
  registerWebWhatsApp(app, {
    authenticate: (req, res, next) => { if (!req.headers.authorization?.startsWith("Bearer fixture-")) { res.status(401).json({ message: "Unauthorized" }); return; } (req as any).user = { id: req.headers.authorization.endsWith("other") ? 1008 : 1007 }; next(); },
    signingSecret: () => secret, now: () => now,
    fetch: (async (raw, init = {}) => {
      const url = new URL(String(raw)); calls.push({ url, init });
      assert.equal(init.redirect, "manual");
      if (mode.value === "outage") return Response.json({ error: "private upstream detail" }, { status: 503 });
      const headers = new Headers(init.headers);
      if (url.hostname === "new.aitracker.run") {
        assert.equal(headers.get("cookie"), "__Host-coach_account=fixture-owner");
        assert.equal(headers.get("authorization"), null);
        assert.equal(headers.get("origin"), "https://new.aitracker.run");
      } else if (url.pathname !== "/mcp/oauth/authorize") {
        assert.equal(headers.get("authorization"), "Bearer fixture-owner");
        assert.equal(headers.get("cookie"), null);
      }
      if (url.pathname === "/api/whatsapp") return Response.json({ configured: true, connected: false, authorized: false, destination: null, templateReady: false });
      if (url.pathname === "/api/whatsapp/authorize") {
        const params = new URLSearchParams({ state, response_type: "code", code_challenge_method: "S256", code_challenge: "b".repeat(43), client_id: "fixture", scope: WHATSAPP_READ_SCOPES.join(" ") + (mode.value === "escalate" ? " billing:write" : ""), redirect_uri: "https://new.aitracker.run/whatsapp/callback", resource: "https://aitracker.run/mcp" });
        return Response.json({ authorizationUrl: (mode.value === "redirect" ? "https://evil.example" : "https://aitracker.run") + "/mcp/oauth/authorize?" + params });
      }
      if (url.pathname === "/mcp/oauth/authorize") { assert.equal(headers.get("cookie"), null); assert.equal(headers.get("authorization"), null); return new Response(null, { status: 302, headers: { location: "/mcp/consent?request=" + requestId } }); }
      if (url.pathname === "/mcp/oauth/authorization-request") return Response.json({ clientName: "AITracker WhatsApp coach", eligible: mode.value !== "ineligible", scopes: WHATSAPP_READ_SCOPES.map(scope => ({ scope, description: scope })) });
      if (url.pathname === "/mcp/oauth/authorize/decision") return Response.json({ redirectTo: "https://new.aitracker.run/whatsapp/callback?state=" + (mode.value === "state" ? "b".repeat(64) : state) + "&code=fixture-code" });
      if (url.pathname === "/api/whatsapp/finish") { assert.deepEqual(JSON.parse(String(init.body)), { code: "fixture-code", state }); return Response.json({ ok: true }); }
      if (url.pathname === "/api/whatsapp/connect") return Response.json({ url: mode.value === "link" ? "https://evil.example/" : link });
      if (url.pathname === "/api/whatsapp/disconnect") return Response.json({ ok: true });
      throw Error("Unexpected fixture route");
    }) as typeof fetch,
  });
  let server: ReturnType<typeof app.listen>;
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const origin = "http://127.0.0.1:" + (server!.address() as any).port;
  try {
    await run({ calls, mode, call: (path = "", body?: unknown, account = "owner") => fetch(origin + "/api/coach/whatsapp" + path, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer fixture-" + account, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }) });
  } finally { await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); }
}
test("existing native status, consent, PKCE completion, private link and disconnect work without sharing credentials across origins", () => fixture(async ({ call, calls }) => {
  assert.equal((await call()).status, 200);
  const review = await (await call("/review", { confirm: true })).json();
  assert.equal(review.details.scopes.length, 5);
  assert.equal((await call("/approve", { confirm: true, ticket: review.ticket })).status, 200);
  assert.equal((await (await call("/connect", { confirm: true })).json()).url, link);
  assert.equal((await call("/disconnect", { confirm: true })).status, 200);
  assert.equal(calls.filter(c => c.url.pathname === "/api/whatsapp/finish").length, 1);
}));
test("explicit confirmation and matching account are required before upstream writes", () => fixture(async ({ call, calls }) => {
  assert.equal((await call("/review", {})).status, 400);
  assert.equal(calls.length, 0);
  const review = await (await call("/review", { confirm: true })).json();
  const count = calls.length;
  assert.equal((await call("/approve", { confirm: true, ticket: review.ticket }, "other")).status, 409);
  assert.equal(calls.length, count);
}));
for (const scenario of ["redirect", "escalate", "ineligible", "outage"]) test("access review fails closed: " + scenario, () => fixture(async ({ call, mode, calls }) => {
  mode.value = scenario;
  const response = await call("/review", { confirm: true });
  assert.equal(response.status, scenario === "ineligible" ? 403 : scenario === "outage" ? 503 : 409);
  assert.ok(calls.every(c => ["aitracker.run", "new.aitracker.run"].includes(c.url.hostname)));
  assert.doesNotMatch(await response.text(), /private upstream detail/);
}));
test("mismatched callback state never completes OAuth and invalid pairing links never reach the browser", () => fixture(async ({ call, mode, calls }) => {
  const review = await (await call("/review", { confirm: true })).json();
  mode.value = "state";
  assert.equal((await call("/approve", { confirm: true, ticket: review.ticket })).status, 409);
  assert.ok(!calls.some(c => c.url.pathname.endsWith("/finish")));
  mode.value = "link";
  assert.equal((await call("/connect", { confirm: true })).status, 409);
}));
