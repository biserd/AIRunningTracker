/**
 * Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver — and Google reads
 * Bing's index too). Free protocol, no rate limit beyond ~10k URLs/request.
 *
 * Usage:
 *   npx tsx scripts/ping-indexnow.ts                # all comparison + blog
 *   npx tsx scripts/ping-indexnow.ts comparisons    # comparisons only
 *   npx tsx scripts/ping-indexnow.ts blog           # blog only
 *
 * Set INDEXNOW_KEY env var to override the default key. The same key must
 * be served at https://aitracker.run/<KEY>.txt (handled in server/routes.ts).
 */
import { db } from "../server/db";
import { shoeComparisons } from "../shared/schema";

const HOST = "aitracker.run";
const BASE = `https://${HOST}`;
const KEY = process.env.INDEXNOW_KEY || "ae4e97b2aac152e8b1c19837d99227fd";
const KEY_LOCATION = `${BASE}/${KEY}.txt`;

const BLOG_SLUGS = [
  "ai-running-coach-complete-guide-2026",
  "best-strava-analytics-tools-2026",
  "how-to-improve-running-pace",
  "ai-agent-coach-proactive-coaching",
  "how-to-pick-a-training-plan",
];

async function getComparisonUrls(): Promise<string[]> {
  const rows = await db.select({ slug: shoeComparisons.slug }).from(shoeComparisons);
  return rows.map((r) => `${BASE}/tools/shoes/compare/${r.slug}`);
}

function getBlogUrls(): string[] {
  return BLOG_SLUGS.map((s) => `${BASE}/blog/${s}`);
}

async function submitBatch(urls: string[]): Promise<void> {
  // IndexNow accepts up to 10,000 URLs per request — chunk to be safe.
  const CHUNK = 1000;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const chunk = urls.slice(i, i + CHUNK);
    const body = {
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: chunk,
    };
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`[indexnow] chunk ${i / CHUNK + 1}: ${chunk.length} URLs → ${res.status} ${res.statusText}${text ? " — " + text.slice(0, 200) : ""}`);
    if (res.status >= 400) {
      throw new Error(`IndexNow rejected the submission (HTTP ${res.status})`);
    }
  }
}

async function main() {
  const arg = (process.argv[2] || "all").toLowerCase();
  const urls: string[] = [];

  if (arg === "all" || arg === "comparisons") {
    const cmp = await getComparisonUrls();
    console.log(`[indexnow] found ${cmp.length} comparison pages`);
    urls.push(...cmp);
  }
  if (arg === "all" || arg === "blog") {
    const blog = getBlogUrls();
    console.log(`[indexnow] queueing ${blog.length} blog posts`);
    urls.push(...blog);
  }

  if (urls.length === 0) {
    console.log("[indexnow] nothing to submit");
    process.exit(0);
  }

  // Verify the key file is reachable before submitting — IndexNow rejects
  // the whole batch if it can't fetch the key.
  const keyCheck = await fetch(KEY_LOCATION);
  const keyBody = (await keyCheck.text()).trim();
  if (!keyCheck.ok || keyBody !== KEY) {
    console.error(`[indexnow] key file check FAILED at ${KEY_LOCATION} (got status ${keyCheck.status}, body "${keyBody.slice(0, 40)}")`);
    console.error("[indexnow] make sure the latest code is deployed and INDEXNOW_KEY matches the served file");
    process.exit(1);
  }
  console.log(`[indexnow] key file OK at ${KEY_LOCATION}`);
  console.log(`[indexnow] submitting ${urls.length} total URLs to api.indexnow.org`);

  await submitBatch(urls);
  console.log("[indexnow] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[indexnow] failed:", err);
  process.exit(1);
});
