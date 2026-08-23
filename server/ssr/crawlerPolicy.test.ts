import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_CRAWLER_PATHS,
  buildRobotsTxt,
  isCrawler,
  isPrivateCrawlerPath,
} from "./crawlerPolicy";

test("recognizes every official OpenAI crawler used for ads, search, user fetches, and training", () => {
  for (const userAgent of [
    "OAI-AdsBot/1.0",
    "OAI-SearchBot/1.0",
    "ChatGPT-User/1.0",
    "GPTBot/1.2",
  ]) {
    assert.equal(isCrawler(userAgent), true, `${userAgent} receives server-rendered content`);
  }
  assert.equal(isCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);
});

test("robots.txt explicitly allows OpenAI crawlers while repeating private path exclusions", () => {
  const robots = buildRobotsTxt();
  for (const userAgent of ["OAI-AdsBot", "OAI-SearchBot", "ChatGPT-User", "GPTBot"]) {
    const start = robots.indexOf(`User-agent: ${userAgent}`);
    assert.ok(start >= 0, `${userAgent} has an explicit group`);
    const end = robots.indexOf("\n\n", start);
    const group = robots.slice(start, end === -1 ? undefined : end);
    assert.match(group, /Allow: \//);
    for (const path of PRIVATE_CRAWLER_PATHS) {
      assert.match(group, new RegExp(`Disallow: ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  }
  assert.match(robots, /Sitemap: https:\/\/aitracker\.run\/sitemap\.xml/);
});

test("private route matching covers account data without blocking public marketing content", () => {
  for (const path of [
    "/api/dashboard/17",
    "/activity/123",
    "/coach/settings",
    "/training-plans/42",
    "/runner-score/17",
    "/mcp/oauth/authorize",
  ]) {
    assert.equal(isPrivateCrawlerPath(path), true, `${path} is private`);
  }
  for (const path of [
    "/",
    "/pricing",
    "/proactive-running-coach",
    "/blog/ai-agent-coach-proactive-coaching",
    "/tools/race-predictor",
    "/mcp",
  ]) {
    assert.equal(isPrivateCrawlerPath(path), false, `${path} remains crawlable`);
  }
});

