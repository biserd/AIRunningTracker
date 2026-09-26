// Read-only local catalog audit. Usage: node --import tsx scripts/verify-shoe-pages.mjs <catalog.sql>
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import React from "react";
import { renderShoeDocument } from "../server/ssr/shoePages.ts";
import { shoeEvidence, publicShoe } from "../shared/shoeEditorial.ts";
import { sanitizeShoeRecord } from "../server/mcp/shoePresentation.ts";
globalThis.React = React;
if (!process.argv[2])
  throw new Error(
    "Pass a local public catalog SQL snapshot; no production writes are performed.",
  );
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=OFF;");
db.exec(readFileSync(process.argv[2], "utf8"));
const convert = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const name = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (["hasCarbonPlate", "hasSuperFoam"].includes(name) && value != null)
        value = !!value;
      if (name === "bestFor" && typeof value === "string")
        try {
          value = JSON.parse(value);
        } catch {}
      return [name, value];
    }),
  );
const shoes = db.prepare("SELECT * FROM running_shoes").all().map(convert);
const comparisons = db
  .prepare("SELECT * FROM shoe_comparisons")
  .all()
  .map(convert);
const store = {
  getShoes: async () => shoes,
  getShoeBySlug: async (slug) => shoes.find((s) => s.slug === slug),
  getShoeById: async (id) => shoes.find((s) => s.id === id),
  getShoeComparisons: async () => comparisons,
  getShoeComparisonBySlug: async (slug) =>
    comparisons.find((s) => s.slug === slug),
  getShoeComparisonsByShoeId: async (id) =>
    comparisons.filter((c) => c.shoe1Id === id || c.shoe2Id === id),
};
const template =
  '<!doctype html><html lang="en"><head><title>Default</title><meta name="description" content="Default"></head><body><div id="root"></div></body></html>';
let rendered = 0,
  aliases = 0;
const descriptions = new Set();
for (const path of [
  ...shoes.map((s) => "/tools/shoes/" + s.slug),
  ...comparisons.map((c) => "/tools/shoes/compare/" + c.slug),
]) {
  const result = await renderShoeDocument(path, store, template);
  if (result.status === 301) {
    aliases++;
    continue;
  }
  assert.equal(result.status, 200, path);
  const html = result.html;
  assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
  assert.equal((html.match(/<title\b/g) || []).length, 1, path);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, path);
  assert.ok(html.includes("Sources, checks and editorial standards"), path);
  assert.ok(!html.includes("Guaranteed faster"), path);
  const description = html.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(description, path);
  assert.ok(!descriptions.has(description), "Duplicate description: " + path);
  descriptions.add(description);
  const state = JSON.parse(
    html.match(
      /<script id="public-shoe-state" type="application\/json">([\s\S]*?)<\/script>/,
    )[1],
  );
  assert.ok(state.queries.every((q) => q.queryKey[0].startsWith("/api/shoes")));
  rendered++;
}
for (const s of shoes) {
  assert.equal(publicShoe(s).comfortRating, null, s.slug);
  assert.equal(sanitizeShoeRecord(s).mileageEstimate, null, s.slug);
}
console.log(
  JSON.stringify({
    shoes: shoes.length,
    comparisons: comparisons.length,
    rendered,
    aliases,
    uniqueDescriptions: descriptions.size,
    sourceChecked: shoes.filter(
      (s) => shoeEvidence(s).status === "source_checked",
    ).length,
    historical: shoes.filter((s) => shoeEvidence(s).status !== "source_checked")
      .length,
  }),
);
db.close();
