// Local-only browser regression: real hook/button/API adapter, fixture account,
// fixture OAuth exchange. Strava navigation is intercepted, never sent.
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "vite";
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { registerWebStravaConnect } from "../server/services/webStravaConnect";

const app = express(); app.use(express.json());
let available = true;
const starts: boolean[] = [], saved: any[] = [];
app.use("/api/strava/authorize", async (_req, _res, next) => { await new Promise(resolve => setTimeout(resolve, 250)); next(); });
registerWebStravaConnect(app, {
  authenticate: (req, res, next) => { if (req.headers.authorization !== "Bearer local-fixture") { res.status(401).json({ message: "Unauthorized" }); return; } (req as any).user = { id: 1007 }; starts.push(req.body.write); next(); },
  clientId: () => { if (!available) throw new Error("fixture unavailable"); return "1234"; },
  signingSecret: () => "fixture-only-signing-key-for-browser-reconnect-check",
  getUser: async id => ({ id }), findAthlete: async () => undefined,
  exchange: async () => ({ access_token: "fixture-access", refresh_token: "fixture-refresh", athlete: { id: 555 } }),
  save: async (id, connection) => { saved.push({ id, ...connection }); },
  afterConnect: async () => "upgrade_required",
});
app.get("/dashboard", (req, res) => res.type("html").send(`<h1>Fixture return</h1><p>${req.query.sync}</p>`));
const vite = await createServer({ server: { middlewareMode: true, fs: { allow: [resolve(".")] } }, appType: "custom" });
app.get("/fixture", async (req, res) => {
  const entry = `/@fs/${resolve("scripts/fixtures/strava-connect.tsx").replace(/\\/g, "/")}`;
  res.type("html").send(await vite.transformIndexHtml(req.originalUrl, `<html><head></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`));
});
app.use(vite.middlewares);
let server: ReturnType<typeof app.listen>;
await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${(server!.address() as any).port}`;
const browser = await puppeteer.launch({ headless: true, timeout: 30000 });
const errors: string[] = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on("request", request => {
    if (request.url().startsWith("https://www.strava.com/oauth/authorize")) void request.respond({ status: 200, contentType: "text/html", body: "<h1>Intercepted fixture consent, no Strava request sent</h1>" });
    else if (!request.url().startsWith(origin)) void request.abort();
    else void request.continue();
  });
  await page.goto(`${origin}/fixture`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.setItem("auth_token", "local-fixture"));
  for (const write of [false, true]) {
    await page.goto(`${origin}/fixture${write ? "?write=1" : ""}`, { waitUntil: "networkidle0" });
    await page.click('[data-testid="strava-connect-button"]');
    await page.waitForFunction(() => document.body.innerText.includes("Opening Strava"));
    assert.equal(await page.$eval("button", button => button.disabled), true);
    await page.waitForFunction(() => location.hostname === "www.strava.com");
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("client_id"), "1234");
    assert.notEqual(url.searchParams.get("state"), "1007");
    assert.equal(url.searchParams.get("scope")?.includes("activity:write"), write);
    const callback = new URL("/strava/callback", origin);
    callback.search = new URLSearchParams({ code: "fixture-code", state: url.searchParams.get("state")!, scope: write ? "read,activity:read_all,activity:write" : "read,activity:read_all" }).toString();
    await page.goto(callback.toString(), { waitUntil: "networkidle0" });
    assert.ok(page.url().endsWith("/dashboard?connected=true&sync=upgrade_required"));
  }
  available = false;
  await page.goto(`${origin}/fixture`, { waitUntil: "networkidle0" });
  await page.click('[data-testid="strava-connect-button"]');
  await page.waitForFunction(() => document.body.innerText.includes("Could not open Strava"));
  assert.equal(await page.$eval("button", button => button.disabled), false);
  assert.ok(page.url().startsWith(origin));
  assert.deepEqual(starts, [false, true, false]);
  assert.deepEqual(saved.map(s => ({ id: s.id, write: s.stravaHasWriteScope })), [{ id: 1007, write: false }, { id: 1007, write: true }]);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, flows: ["dashboard read reconnect", "settings explicit write", "loading/disabled state", "browser-bound callback", "honest Free sync status", "friendly config failure and retry"], realStravaRequests: 0, savedFixtureAccounts: saved.length }));
} finally { await browser.close(); await vite.close(); server!.closeAllConnections(); server!.close(); }
