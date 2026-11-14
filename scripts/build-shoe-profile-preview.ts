/**
 * Build an isolated, read-only preview using only anonymous public catalog data.
 * Does not contact any account, admin, or production write endpoint.
 */
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import { renderShoeDocument } from "../server/ssr/shoePages";
import type { RunningShoe, ShoeComparison } from "../shared/schema";
import type { ShoeStore } from "../server/shoeCatalogPresentation";

Object.assign(globalThis, { React });
const root = resolve(".tmp/shoe-profile-stage");
const out = resolve(root, "public");
const url = "https://aitracker.run";
async function publicJson<T>(path: string): Promise<T> {
  const response = await fetch(url + path, { redirect: "error", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  return response.json();
}
const [shoes, comparisons, directory] = await Promise.all([
  publicJson<RunningShoe[]>("/api/shoes"),
  publicJson<ShoeComparison[]>("/api/shoes/comparisons?limit=500"),
  publicJson<{ models: {slug: string}[]; links: {slug: string}[] }>("/api/shoes/comparison-directory"),
]);
const bySlug = new Map(shoes.map(s=>[s.slug,s]));
const byId = new Map(shoes.map(s=>[s.id,s]));
for (const c of comparisons) {
  if (byId.has(c.shoe1Id) && byId.has(c.shoe2Id)) continue;
  const detail = await publicJson<{ shoe1: RunningShoe; shoe2: RunningShoe }>("/api/shoes/comparisons/by-slug/" + c.slug);
  for (const s of [detail.shoe1, detail.shoe2]) if (!byId.has(s.id)) byId.set(s.id, s);
}
const store: ShoeStore = {
  getShoes: async () => shoes,
  getShoeBySlug: async (slug: string) => bySlug.get(slug),
  getShoeById: async (id: number) => byId.get(id),
  getShoeComparisons: async () => comparisons.filter(x=>byId.get(x.shoe1Id)?.slug && byId.get(x.shoe2Id)?.slug &&
    bySlug.has(byId.get(x.shoe1Id)?.slug ?? "") && bySlug.has(byId.get(x.shoe2Id)?.slug ?? "")),
  getShoeComparisonBySlug: async (slug: string) => comparisons.find(x=>x.slug===slug),
  getShoeComparisonsByShoeId: async (id: number) => comparisons.filter(x=>x.shoe1Id===id||x.shoe2Id===id),
};
const template = (await readFile("dist/public/index.html", "utf8"))
  .replace(/<!-- Queue analytics immediately[^]*?<\/script>/, "")
  .replace('<head>', '<head><meta name="app-environment" content="staging">')
  .replace("<body>", '<body><div style="padding:6px 12px;background:#172033;color:#fff;text-align:center;font:600 12px system-ui">Staging preview · read-only</div>');
await mkdir(out, { recursive:true });
await cp("dist/public/assets", resolve(out,"assets"), { recursive:true });
await cp("dist/public/icons", resolve(out,"icons"), { recursive:true });
await cp("dist/public/manifest.webmanifest", resolve(out,"manifest.webmanifest"));
await writeFile(resolve(out,"sw.js"), "self.addEventListener('install', () => self.skipWaiting());");
const paths = [
  "/tools/shoes",
  "/tools/shoes/compare",
  ...directory.models.map(s=>"/tools/shoes/"+s.slug),
  ...directory.links.map(c=>"/tools/shoes/compare/"+c.slug),
];
for (const path of paths) {
  assert.match(path, /^\/tools\/shoes(?:\/[a-z0-9-]+){0,2}$/);
  const {status,html} = await renderShoeDocument(path,store,template);
  assert.equal(status,200,path);
  assert.ok(html,path);
  const dir=resolve(out,"."+path);
  await mkdir(dir,{recursive:true});
  await writeFile(resolve(dir,"index.html"), html.replace("</head>", '<meta name="robots" content="noindex, nofollow"></head>'));
}
console.log(JSON.stringify({ models:directory.models.length, comparisons:directory.links.length, output:out }));
