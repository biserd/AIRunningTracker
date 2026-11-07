// Local-only browser fixture; no production account, grant or message is changed.
import assert from "node:assert/strict";
import express from "express";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
const app = express(); app.use(express.json());
let connected = false, authorized = false, outage = false;
const posts: string[] = [];
app.get("/api/coach/whatsapp", (_req, res) => outage ? res.status(503).json({ message: "Unavailable" }) : res.json({ configured: true, authorized, connected, destination: connected ? "WhatsApp ending 4567" : null, templateReady: true }));
app.post("/api/coach/whatsapp/:action", (req, res) => {
  assert.equal(req.headers.authorization, "Bearer local-fixture"); assert.equal(req.body.confirm, true); posts.push(req.params.action);
  if (req.params.action === "review") return res.json({ ticket: "fixture-ticket", details: { clientName: "AITracker WhatsApp coach", scopes: [{ scope: "profile", description: "Your runner profile" }, { scope: "activities", description: "Your running activities" }] } });
  if (req.params.action === "approve") { assert.equal(req.body.ticket, "fixture-ticket"); authorized = true; }
  if (req.params.action === "connect") return res.json({ url: "https://wa.me/15551234567?text=LINK%20" + "a".repeat(48) });
  if (req.params.action === "disconnect") connected = authorized = false;
  return res.json({ ok: true });
});
const bundle = await build({ entryPoints: ["scripts/fixtures/whatsapp-settings.tsx"], bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", alias: { "@": resolve("client/src"), "@shared": resolve("shared") }, loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"production"', "import.meta.env.DEV": "false", "import.meta.env.MODE": '"production"' } });
app.get("/fixture.js", (_req, res) => res.type("js").send(bundle.outputFiles[0].text));
app.use("/assets", express.static(resolve("dist/public/assets")));
const css = readdirSync("dist/public/assets").find(file => /^index-.*\.css$/.test(file));
app.get("/fixture", (_req, res) => res.type("html").send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/${css}"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`));
let server: ReturnType<typeof app.listen>;
await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${(server!.address() as any).port}`;
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage(); const errors: string[] = [];
  page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", error => { errors.push(String(error)); console.error("Fixture browser error:", String(error)); });
  await page.setRequestInterception(true);
  page.on("request", req => req.url().startsWith(origin) ? void req.continue() : void req.abort());
  await page.goto(origin + "/fixture", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="whatsapp-connection-card"]', { timeout: 60000 });
  console.log("WhatsApp fixture loaded");
  await page.evaluate(() => localStorage.setItem("auth_token", "local-fixture"));
  const click = async (text: string) => page.evaluate(text => { const button = Array.from(document.querySelectorAll("button")).find(b => b.textContent === text); if (!button) throw Error("Missing button: " + text); button.click(); }, text);
  const sees = async (text: string) => page.waitForFunction(text => document.body.innerText.includes(text), {}, text);
  assert.equal(posts.length, 0);
  await click("Review WhatsApp access"); await sees("Your running activities");
  assert.deepEqual(posts, ["review"]);
  await click("Allow read-only access"); await sees("Prepare private WhatsApp link");
  await click("Prepare private WhatsApp link"); await sees("Continue in WhatsApp");
  console.log("Explicit consent and private link passed");
  const href = await page.$eval('a[target="_blank"]', a => a.getAttribute("href")); assert.match(href!, /^https:\/\/wa.me\/15551234567\?text=LINK/);
  connected = true; await sees("WhatsApp ending 4567");
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "output/whatsapp-web-settings-mobile.png", fullPage: true });
  await click("Disconnect WhatsApp"); await sees("Your saved runs and training plans are unchanged"); await click("Keep connected");
  assert.equal(posts.includes("disconnect"), false);
  await page.goto(origin + "/fixture?free", { waitUntil: "networkidle0" }); await sees("See trial and pricing");
  await click("Disconnect WhatsApp"); await sees("Disconnect WhatsApp?");
  await page.evaluate(() => (document.querySelector('[role="alertdialog"] button:last-child') as HTMLButtonElement).click());
  await sees("WhatsApp disconnected"); assert.equal(posts.at(-1), "disconnect");
  outage = true;
  await page.goto(origin + "/fixture", { waitUntil: "networkidle0" }); await sees("Retry connection check");
  outage = false; await click("Retry connection check"); await sees("Review WhatsApp access");
  for (const path of ["client/src/pages/settings.tsx", "client/src/pages/coach-settings.tsx"]) { const src = readFileSync(path, "utf8"); assert.ok(src.includes("<WhatsAppConnectionCard")); assert.doesNotMatch(src, /Telegram|channels\/telegram/); }
  assert.deepEqual(errors, []);
  console.log("WhatsApp browser checks passed: explicit consent, approval, private link, status polling, responsive layout, Free-account disconnect, retry; both settings pages have no Telegram controls.");
} finally { await browser.close(); await new Promise<void>(resolve => server!.close(() => resolve())); }
