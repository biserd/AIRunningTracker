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
import { comparisonList, publicComparison, shoePayload, type ShoeStore } from "../shoeCatalogPresentation";
import { shoeSeriesHistory } from "../shoeSeries";

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
test("reviewed guidance is explicit and does not override upcoming warnings or name a winner", () => {
  const review = {
    ...c,
    verdict: "Check how the lower drop feels at goal pace.",
    verdictReason: "Source-checked catalogue editorial; not a wear test.",
    keyDifferences: '["A revised perimeter reinforcement replaces the old rods."]',
  };
  const checked = publicComparison(review, a, { ...b, availability: "available" });
  assert.match(checked.verdict, /lower drop/);
  assert.match(checked.editorial.sections[0].text, /perimeter/);
  assert.equal(checked.verdictWinner, null);
  assert.match(publicComparison(review, a, b).verdict, /upcoming/i);
});

test("a predecessor page does not drop reciprocal comparison links after the eighth entry", async () => {
  const links = Array.from({ length: 9 }, (_, i) => ({ ...c, slug: `example-pair-${i}` }));
  const data = await shoePayload({ ...store, getShoeComparisonsByShoeId: async () => links }, a.slug!);
  assert.equal(data?.comparisons.length, 9);
  assert.equal(data?.comparisons.at(-1)?.slug, "example-pair-8");
});

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

test("mixed numbered and unnumbered runs use year order; case variants share a chart", async () => {
  const original = { ...a, model: "Sonicblast", slug: "sonicblast", seriesName: "Sonicblast", versionNumber: null, releaseYear: 2025, lastVerified: null };
  const second = { ...b, model: "Sonicblast 2", slug: "sonicblast-2", seriesName: "Sonicblast", releaseYear: 2026 };
  const arahi = [
    { ...a, id: 7, brand: "Hoka", model: "Arahi 7", slug: "hoka-arahi-7", seriesName: "Arahi", versionNumber: 7 },
    { ...b, id: 9, brand: "HOKA", model: "Arahi 9", slug: "hoka-arahi-9", seriesName: "Arahi", versionNumber: 9 },
  ];
  const models = [second, original, ...arahi];
  const fixture = {
    ...store,
    getShoes: async () => models,
    getShoeBySlug: async (slug: string) => models.find(s => s.slug === slug),
  };
  for (const slug of ["sonicblast", "sonicblast-2"]) {
    const data = await shoePayload(fixture, slug);
    assert.deepEqual(data?.seriesShoes.map(s => s.slug), ["sonicblast", "sonicblast-2"]);
  }
  for (const shoe of arahi) {
    const data = await shoePayload(fixture, shoe.slug);
    assert.deepEqual(data?.seriesShoes.map(s => s.slug), ["hoka-arahi-7", "hoka-arahi-9"]);
  }
  const { renderShoeDocument } = await import("./shoePages");
  const html = (await renderShoeDocument("/tools/shoes/sonicblast-2", fixture, template)).html!;
  assert.match(html, /data-testid="series-comparison-chart"/);
  assert.match(html, /data-series-model="sonicblast"[^]*?data-metric="weight" data-value="7" data-evidence="historical"/);
  const weightChart = html.match(/<figure[^>]*>[\s\S]*?<\/figure>/)?.[0] ?? "";
  assert.equal((weightChart.match(/data-metric="weight"/g) ?? []).length, 1);
  assert.match(weightChart, /Sonicblast 2[\s\S]*?Not published/);
});

test("reviewed family aliases share the same chronology without mixing racing or trail variants", async () => {
  const row = (id: number, slug: string, brand: string, seriesName: string, versionNumber: number | null, releaseYear: number) =>
    ({ ...a, id, slug, model: slug, brand, seriesName, versionNumber, releaseYear });
  const families = [
    [row(21, "adidas-adizero-boston-12", "Adidas", "Adizero Boston", 12, 2024), row(22, "adidas-boston-13", "Adidas", "Boston", 13, 2025)],
    [row(23, "adidas-ultraboost-light", "Adidas", "Ultraboost Light", null, 2025), row(24, "adidas-ultraboost-5", "Adidas", "Ultraboost", 5, 2024)],
    [
      { ...row(25, "new-balance-fresh-foam-x-1080v13", "New Balance", "Fresh Foam X 1080v", 13, 2023), model: "Fresh Foam X 1080v13" },
      { ...row(27, "new-balance-fresh-foam-x-1080v14", "New Balance", "Fresh Foam X 1080v", 14, 2024), model: "Fresh Foam X 1080v14" },
      { ...row(28, "new-balance-1080v15", "New Balance", "1080", 15, 2026), model: "1080v15" },
    ],
    [row(29, "new-balance-fuelcell-rebel-v4", "New Balance", "FuelCell Rebel v", 4, 2024), row(30, "new-balance-rebel-v5", "New Balance", "Rebel v", 5, 2025)],
    [row(31, "puma-fast-r-2-nitro-elite", "Puma", "Fast-R 2 Nitro Elite", null, 2024), row(32, "puma-fast-r-nitro-elite-3", "Puma", "Fast-R Nitro Elite", 3, 2025)],
    [row(33, "on-cloudsurfer-7", "On", "Cloudsurfer", 7, 2024), row(34, "on-cloudsurfer-2", "On", "Cloudsurfer", 2, 2025)],
    [row(35, "adidas-supernova-rise", "Adidas", "Supernova Rise", null, 2025), row(36, "adidas-supernova-rise-2", "Adidas", "Supernova Rise", 2, 2024)],
  ];
  const legacyAlias = {
    ...row(26, "new-balance-fresh-foam-1080-v14", "New Balance", "Fresh Foam 1080 v", 14, 2025),
    model: "Fresh Foam 1080 v14",
  };
  const singles = [
    row(37, "puma-fast-rb-nitro-elite-2", "Puma", "Fast-RB Nitro Elite", 2, 2026),
    row(38, "on-cloudsurfer-trail", "On", "Cloudsurfer Trail", null, 2024),
    row(39, "adidas-adizero-adios-pro-evo-2", "Adidas", "Adizero Adios Pro Evo", 2, 2025),
  ];
  const catalog = [...families.flat(), legacyAlias, ...singles].reverse();
  const fixture = { ...store, getShoes: async () => catalog, getShoeBySlug: async (slug: string) => catalog.find(s => s.slug === slug) };
  for (const family of families) {
    const expected = family.map(s => s.slug);
    for (const model of family) assert.deepEqual(shoeSeriesHistory(model, catalog).map(s => s.slug), expected);
  }
  for (const model of singles) assert.deepEqual(shoeSeriesHistory(model, catalog).map(s => s.slug), [model.slug]);
  assert.deepEqual(shoeSeriesHistory(legacyAlias, catalog).map(s => s.slug), families[2].map(s => s.slug));
  const { renderShoeDocument } = await import("./shoePages");
  for (const { slug } of catalog) {
    const result = await renderShoeDocument("/tools/shoes/" + slug, fixture, template);
    assert.equal(result.status, 200, slug);
    assert.equal(result.html?.includes('data-testid="series-comparison-chart"'), !singles.some(s => s.slug === slug), slug);
  }
});

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

test("shoe explorer shows sourced Boston geometry and comparable generation deltas in the first HTML", async () => {
  const boston12 = { ...a, brand:"Adidas", model:"Adizero Boston 12", slug:"adidas-adizero-boston-12", seriesName:"Adizero Boston", versionNumber:12 };
  const boston13 = { ...legacy, brand:"Adidas", model:"Boston 13", slug:"adidas-boston-13", seriesName:"Boston", versionNumber:13 };
  const data = await shoePayload({
    ...store, getShoes:async()=>[boston12,boston13], getShoeBySlug:async()=>boston13,
  }, boston13.slug);
  assert.equal(data?.shoe.weight, 9);
  assert.equal(data?.shoe.price, null, "measurement review does not revalidate a price");
  assert.equal(data?.shoe.heelStackHeight, 37);
  assert.match(buildComparisonGuide(boston13,boston12).differences[1].text, /Boston 13: 37 mm; Adizero Boston 12: 37\.5 mm\. The recorded difference is 0\.5 mm/);
  const { renderShoeDocument } = await import("./shoePages");
  const html = (await renderShoeDocument("/tools/shoes/"+boston13.slug,{
    ...store, getShoes:async()=>[boston12,boston13], getShoeBySlug:async()=>boston13,
  },template)).html!;
  assert.match(html, /id="shoe-profile"/);
  assert.match(html, /Stack-height schematic/);
  assert.match(html, /Glass-fiber ENERGYRODS/);
  assert.match(html.replaceAll("<!-- -->", ""), /Boston 13 vs\. <a[^>]+>Adizero Boston 12/);
  assert.match(html, /37 mm.*37\.5 mm/);
  assert.match(html, />-0\.1 oz</);
  assert.match(html, /id="shoe-specs"/);
  assert.doesNotMatch(html, /Check the evidence before the numbers/);
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

test("head-to-head renders same-scale diagrams, exact deltas, and graceful missing values before JavaScript", async () => {
  const { renderShoeDocument } = await import("./shoePages");
  const pairPage = "/tools/shoes/compare/" + c.slug;
  const rival = { ...b, weight: 8.2, heelStackHeight: 68, forefootStackHeight: 32, heelToToeDrop: 36 };
  const fixture = (second: RunningShoe): ShoeStore => ({
    ...store,
    getShoes: async () => [a, second],
    getShoeById: async id => [a, second].find(s => s.id === id),
  });
  const html = (await renderShoeDocument(pairPage, fixture(rival), template)).html!.replaceAll("<!-- -->", "");
  assert.match(html, /data-testid="shoe-head-to-head-explorer"/);
  assert.equal((html.match(/data-stack-scale="70"/g) ?? []).length, 2);
  assert.match(html, /Runner 2: 28 mm higher/);
  assert.match(html, /Runner 1: 1\.2 oz lighter/);
  assert.match(html, /Same listed measurement/);
  assert.equal((html.match(/data-spec-group=/g) ?? []).length, 11);
  assert.match(html, /Sources, checks and editorial standards/);
  const missingHtml = (await renderShoeDocument(pairPage, fixture({
    ...rival, forefootStackHeight: null, dataSource: "legacy", lastVerified: null,
  }), template)).html!;
  assert.equal((missingHtml.match(/data-stack-scale=/g) ?? []).length, 1);
  assert.match(missingHtml, /Full stack profile unavailable/);
  assert.match(missingHtml, /Missing measurement/);
  assert.match(missingHtml, /No verified difference/);
  assert.doesNotMatch(missingHtml, /mm higher|oz lighter/);
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
    assert.doesNotMatch(html, /Check the evidence before the numbers/);
    if (path === "/tools/shoes/" + a.slug || path === "/tools/shoes/compare/" + c.slug) {
      assert.match(html, /Sources, checks and editorial standards/);
    }
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
