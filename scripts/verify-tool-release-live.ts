import assert from "node:assert/strict";

// Public GETs and a stateless calculator POST only: no accounts, sync, purchases
// or synthetic funnel events are created by this release smoke check.
const origin = process.argv[2] || "https://aitracker.run";
const pages = [
  ["/tools/race-predictor", "Strava or Manual Entry"],
  ["/tools/shoes/compare", "Compare your two shoes now"],
  ["/tools/shoe-compare", "shoe-chooser-1"],
  ["/tools/marathon-fueling", "Worked example: 4 hours"],
  ["/tools/shoe-finder", "Build a Shortlist in 3 Questions"],
  ["/tools/rotation-planner", "Build Your Shoe Setup"],
  ["/blog/how-to-compare-running-shoes", "Worked decision"],
];
const report: Record<string, unknown> = { origin, checkedAt: new Date().toISOString(), pages: [] };
async function get(path: string, options?: RequestInit) {
  return fetch(new URL(path, origin), { signal: AbortSignal.timeout(45000), ...options });
}
for (const [path, marker] of pages) {
  // Existing blog framework serves crawlable HTML to crawlers and the rich SPA
  // to visitors. The separate browser check covers the visitor article.
  const response = await get(path, path.startsWith("/blog/") ? { headers: { "User-Agent": "Googlebot" } } : undefined);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(marker), `${path}: missing release marker ${marker}`);
  assert.equal((html.match(/<title[ >]/g) || []).length, 1, `${path}: title count`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path}: H1 count`);
  assert.ok(html.includes(`href="https://aitracker.run${path}"`), `${path}: canonical`);
  assert.doesNotMatch(html, /name="robots"[^>]+noindex/, `${path}: indexability`);
  if (path === "/blog/how-to-compare-running-shoes") {
    const external = [...html.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"']+)/gi)]
      .map(match => match[1]).filter(href => !["aitracker.run", "www.aitracker.run"].includes(new URL(href).hostname));
    assert.deepEqual(external, [], "buying guide must link only to AITracker");
    assert.ok(html.includes("RunAnalytics: build a running-shoe shortlist"));
  }
  (report.pages as unknown[]).push({ path, status: response.status, rendering: path.startsWith("/blog/") ? "existing crawler HTML" : "shared visitor/crawler HTML", title: html.match(/<title[^>]*>(.*?)<\/title>/)?.[1] });
}
const redirect = await get("/tools/shoes/compare?shoes=nike-vaporfly-4,saucony-endorphin-pro-4", { redirect: "manual" });
assert.equal(redirect.status, 301);
assert.ok(redirect.headers.get("location")?.includes("/tools/shoe-compare?shoes="));
const prediction = await get("/api/race-predictor/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseEffort: { distance: 10000, time: 2700 }, targetDistance: 42195, weeklyMileage: 50, trainingConsistency: 0.7 }) });
assert.equal(prediction.status, 200);
assert.ok(Number.isFinite((await prediction.json()).predictedTime));
assert.equal((await get("/api/race-predictor/suitable-activities")).status, 401);
const recommendations = await get("/api/shoes/recommend?weight=165&goal=daily&footType=neutral");
assert.equal(recommendations.status, 200);
assert.ok((await recommendations.json()).some((s: any) => s.matchReasons?.length));
assert.equal((await get("/api/shoes/recommend?weight=0&goal=daily&footType=neutral")).status, 400);
const shoes = await (await get("/api/shoes")).json();
assert.ok(shoes.length >= 251); // Canonical public models; D1 retains 253 physical rows.
for (const [slug, weight, heel, forefoot] of [["nike-vaporfly-4", 5.9, 36, 30], ["saucony-endorphin-pro-4", 7.7, 40, 32]] as const) {
  const shoe = shoes.find((s: any) => s.slug === slug);
  assert.equal(Number(shoe?.weight), weight, `${slug} weight`);
  assert.equal(Number(shoe?.heelStackHeight), heel, `${slug} heel`);
  assert.equal(Number(shoe?.forefootStackHeight), forefoot, `${slug} forefoot`);
  assert.ok(String(shoe?.lastVerified).startsWith("2026-11-07"), `${slug} source date`);
}
const sitemap = await get("/sitemap.xml");
assert.equal(sitemap.status, 200);
assert.ok((await sitemap.text()).includes("/blog/how-to-compare-running-shoes"));
const anonymousReconnect = await get("/api/strava/authorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
assert.equal(anonymousReconnect.status, 401, "reconnect must require sign-in");
const unsignedCallback = await get("/strava/callback?code=verification-not-a-token&state=unsigned-verification", { redirect: "manual" });
assert.equal(unsignedCallback.headers.get("location"), "/dashboard?error=strava_state_invalid");
const signIn = await get("/api/auth/strava-login", { redirect: "manual" });
assert.equal(signIn.status, 302);
const authorization = new URL(signIn.headers.get("location")!);
assert.equal(authorization.hostname, "www.strava.com");
assert.match(authorization.searchParams.get("client_id") || "", /^[1-9]\d*$/);
assert.equal(authorization.searchParams.get("redirect_uri"), "https://aitracker.run/auth/strava/login/callback");
report.canonicalCatalogueCount = shoes.length;
report.statelessPrediction = "passed";
report.legacyRedirect = "passed";
report.recommendations = "passed";
report.stravaRequiresAuthentication = true;
report.sitemapGuide = true;
report.guideInternalLinksOnly = true;
report.reconnectRequiresSignIn = true;
report.unsignedReconnectRejected = true;
report.publicStravaSignInConfigured = true;
console.log(JSON.stringify(report, null, 2));
