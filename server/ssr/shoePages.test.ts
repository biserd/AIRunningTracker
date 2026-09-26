import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import type { RunningShoe, ShoeComparison } from "../../shared/schema";
import {
  buildShoeGuide,
  buildComparisonGuide,
  publicShoe,
  shoeEvidence,
  safeJson,
  evidenceDate,
} from "../../shared/shoeEditorial";
import { sanitizeShoeRecord } from "../mcp/shoePresentation";
import { comparisonList, type ShoeStore } from "../shoeCatalogPresentation";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const a = {
  id: 1,
  brand: "Example",
  model: "Runner 1",
  slug: "example-runner-1",
  seriesName: "Runner",
  versionNumber: 1,
  category: "racing",
  stability: "neutral",
  cushioningLevel: "soft",
  weight: 7,
  heelStackHeight: 40,
  forefootStackHeight: 32,
  heelToToeDrop: 8,
  price: 199.88,
  hasCarbonPlate: true,
  hasSuperFoam: true,
  availability: "available",
  sourceUrl: "https://www.runningwarehouse.com/example.html",
  lastVerified: new Date("2026-09-26T00:00:00Z"),
  dataSource: "running_warehouse",
  description: "Source-backed construction overview.",
  comfortRating: 10,
  aiMileageEstimate: 999,
  aiNarrative: "Invented certainty",
} as RunningShoe;
const b = {
  ...a,
  id: 2,
  model: "Runner 2",
  slug: "example-runner-2",
  versionNumber: 2,
  weight: null,
  price: 279.95,
  availability: "upcoming",
  availableFrom: "2026-10-29",
};
const legacy = {
  ...a,
  id: 3,
  model: "Historical",
  slug: "example-historical",
  dataSource: "legacy",
  sourceUrl: null,
  lastVerified: null,
  description: "This shoe guarantees a personal best.",
};
const c = {
  id: 1,
  slug: "example-runner-1-vs-example-runner-2",
  shoe1Id: 1,
  shoe2Id: 2,
  comparisonType: "version_upgrade",
  title: "Old generic title",
  verdictWinner: "shoe2",
  verdict: "Guaranteed faster",
} as ShoeComparison;
const shoes = [a, b, legacy];
const store = {
  getShoes: async () => shoes,
  getShoeBySlug: async (slug: string) => shoes.find((s) => s.slug === slug),
  getShoeById: async (id: number) => shoes.find((s) => s.id === id),
  getShoeComparisons: async () => [c],
  getShoeComparisonBySlug: async (slug: string) =>
    slug === c.slug ? c : undefined,
  getShoeComparisonsByShoeId: async () => [c],
} as unknown as ShoeStore;
const template =
  '<!doctype html><html lang="en"><head><title>Generic</title><meta name="description" content="Generic"><meta property="og:title" content="Generic"><link rel="canonical" href="https://aitracker.run/"></head><body><div id="root"></div></body></html>';

test("source status, UTC dates, missing measurements and unknown performance stay honest", () => {
  assert.equal(evidenceDate(a.lastVerified), "2026-09-26");
  assert.equal(shoeEvidence(a).status, "source_checked");
  assert.equal(
    shoeEvidence({
      ...a,
      sourceUrl: "https://www.runningwarehouse.com.evil.test/",
    }).status,
    "historical_unverified",
  );
  assert.equal(
    shoeEvidence({ ...a, sourceUrl: "javascript:alert(1)" }).sourceUrl,
    null,
  );
  assert.equal(shoeEvidence(legacy).status, "historical_unverified");
  const safe = publicShoe(legacy);
  assert.equal(safe.aiNarrative, null);
  assert.equal(safe.aiMileageEstimate, null);
  assert.equal(safe.comfortRating, null);
  assert.equal(safe.description, null);
  const guide = buildComparisonGuide(a, b);
  assert.match(guide.differences[0].text, /unpublished/);
  assert.match(guide.verdict, /upcoming/);
  assert.doesNotMatch(guide.verdict, /Guaranteed faster/);
  assert.match(
    buildComparisonGuide(a, legacy).differences[0].text,
    /historical/,
  );
  assert.match(buildShoeGuide(legacy).summary, /not been reverified/);
  assert.equal(a.comfortRating, 10, "does not rewrite database objects");
});

test("MCP uses a bounded public allowlist, matching page evidence", () => {
  const record = sanitizeShoeRecord({
    ...a,
    password: "secret",
    userId: 105,
  } as RunningShoe);
  assert.equal("password" in record, false);
  assert.equal("userId" in record, false);
  assert.deepEqual(record.evidence, buildShoeGuide(a).evidence);
  assert.equal(record.weightOunces, 7);
  assert.equal(record.mileageEstimate, null);
  assert.equal(record.comfortRating, null);
  assert.equal(record.sourceUrl, a.sourceUrl);
});

test("comparison index uses two reads and suppresses stored synthetic winners", async () => {
  let reads = 0;
  const rows = await comparisonList({
    ...store,
    getShoes: async () => {
      reads++;
      return shoes;
    },
    getShoeComparisons: async () => {
      reads++;
      return [c];
    },
  });
  assert.equal(reads, 2);
  assert.equal(rows[0].verdictWinner, null);
  assert.doesNotMatch(rows[0].verdict, /Guaranteed faster/);
});

test("all public shoe route types render data, one canonical, one title and one H1 before JavaScript", async () => {
  const { renderShoeDocument } = await import("./shoePages");
  for (const path of [
    "/tools/shoes",
    "/tools/shoes/compare",
    "/tools/shoes/" + a.slug,
    "/tools/shoes/compare/" + c.slug,
  ]) {
    const result = await renderShoeDocument(path, store, template);
    assert.equal(result.status, 200, path);
    const html = result.html!;
    assert.equal((html.match(/<title\b/g) || []).length, 1, path);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, path);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
    assert.ok(html.includes("https://aitracker.run" + path), path);
    assert.ok(html.includes("Runner 1"), path);
    assert.ok(html.includes('data-ssr-tool="true"'));
    const state = JSON.parse(
      html.match(
        /<script id="public-shoe-state" type="application\/json">([\s\S]*?)<\/script>/,
      )![1],
    );
    assert.ok(state.queries.length > 0);
    assert.ok(
      state.queries.every((q: any) => q.queryKey[0].startsWith("/api/shoes")),
    );
    if (path.includes("example-")) {
      assert.ok(html.includes("Sources, checks and editorial standards"));
      assert.ok(html.includes("2026-09-26"));
      assert.ok(html.includes("https://www.runningwarehouse.com/example.html"));
      const graph = JSON.parse(
        html.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
        )![1],
      );
      assert.ok(
        graph["@graph"].some((n: any) => n["@type"] === "BreadcrumbList"),
      );
      assert.ok(!JSON.stringify(graph).includes("aggregateRating"));
    }
  }
  assert.equal(
    (await renderShoeDocument("/tools/shoes/missing", store, template)).status,
    404,
  );
  assert.equal(
    (await renderShoeDocument("/tools/shoes/compare/missing", store, template))
      .status,
    404,
  );
});

test("inline hydration/structured data cannot terminate a script", () => {
  const value = { text: "</script><script>alert(1)</script>\u2028" };
  assert.ok(!safeJson(value).includes("</script>"));
  assert.deepEqual(JSON.parse(safeJson(value)), value);
});
