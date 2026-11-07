import assert from "node:assert/strict";
// Read-only public asset/auth checks; no emails or account events are created.
const origin = process.argv[2] || "https://aitracker.run";
const headers = process.argv[3] === undefined ? {} : { Cookie: "cf_migration_shard=" + process.argv[3] };
const get = (path: string) => fetch(new URL(path, origin), { headers, signal: AbortSignal.timeout(45000) });
const html = await (await get("/admin")).text();
const entry = html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/)?.[1]; assert.ok(entry);
const bootstrap = await (await get(entry)).text();
const spaFile = bootstrap.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1]; assert.ok(spaFile);
const spa = await (await get("/assets/" + spaFile)).text();
const adminFile = spa.match(/(?:\.\/|\/assets\/|")(admin-[A-Za-z0-9_-]+\.js)/)?.[1]; assert.ok(adminFile);
const admin = await (await get("/assets/" + adminFile)).text();
for (const marker of ["Signup follow-ups", "Days 1, 7 and 14 after signup", "signup_unpaid", "signupReminderSchedule"]) assert.ok(admin.includes(marker), marker);
const status = await get("/api/admin/campaigns/worker-status"); assert.ok([401,403].includes(status.status)); await status.body?.cancel();
console.log(JSON.stringify({ origin, checkedAt: new Date().toISOString(), adminFile, signupSequenceAssets: true, adminStatusProtected: true }));
