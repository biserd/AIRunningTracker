import assert from "node:assert/strict";

// Read-only live checks. Never sign in, create a grant, link a phone or send a message.
const origin = process.argv[2] || "https://aitracker.run";
const shard = process.argv[3];
const headers = shard === undefined ? {} : { Cookie: "cf_migration_shard=" + shard };
async function get(path: string) {
  return fetch(new URL(path, origin), { headers, signal: AbortSignal.timeout(45000) });
}
const status = await get("/api/coach/whatsapp");
assert.equal(status.status, 401, "new WhatsApp endpoint must require authentication");
assert.equal((await status.json()).message, "Access token required");
const htmlResponse = await get("/settings"); assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
const script = html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/);
assert.ok(script, "SPA entry script");
const entry = await (await get(script[1])).text();
const spaPath = entry.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1];
assert.ok(spaPath, "lazy SPA entry");
const spa = await (await get("/assets/" + spaPath)).text();
const pages: string[] = [];
let connectionPath: string | undefined;
for (const name of ["settings", "coach-settings"]) {
  const file = spa.match(new RegExp('(?:\\./|/assets/|\")(' + name + '-[A-Za-z0-9_-]+\\.js)'))?.[1];
  assert.ok(file, name + " chunk");
  const response = await get("/assets/" + file); assert.equal(response.status, 200);
  const source = await response.text();
  assert.doesNotMatch(source, /Telegram|channels\/telegram/, name + " must not show legacy messaging controls");
  const card = source.match(/(?:\.\/)(WhatsAppConnectionCard-[A-Za-z0-9_-]+\.js)/)?.[1];
  assert.ok(card, name + " uses WhatsApp card");
  if (connectionPath) assert.equal(connectionPath, card); else connectionPath = card;
  pages.push(name);
}
const card = await (await get("/assets/" + connectionPath)).text();
for (const marker of ["/api/coach/whatsapp", "Review WhatsApp access", "Allow read-only access", "Prepare private WhatsApp link", "Disconnect WhatsApp"]) assert.ok(card.includes(marker), marker);
console.log(JSON.stringify({ origin, shard, checkedAt: new Date().toISOString(), authenticatedEndpoint: true, pages, connectionPath, legacySettingsRemoved: true }));
