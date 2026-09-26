import React from "react";
import { renderToString } from "react-dom/server";
import { Helmet } from "react-helmet";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Express } from "express";
import {
  PublicToolApp,
  loadPublicToolComponent,
} from "../../client/src/publicToolApp";
import {
  comparisonList,
  comparisonPayload,
  shoePayload,
  type ShoeStore,
} from "../shoeCatalogPresentation";
import { publicShoe, safeJson } from "../../shared/shoeEditorial";

export async function renderShoeDocument(
  path: string,
  store: ShoeStore,
  template: string,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (path === "/tools/shoes") {
    const shoes = (await store.getShoes({})).map(publicShoe);
    client.setQueryData(["/api/shoes"], shoes);
    client.setQueryData(
      ["/api/shoes/brands"],
      Array.from(new Set(shoes.map((s) => s.brand))).sort(),
    );
  } else if (path === "/tools/shoes/compare")
    client.setQueryData(
      ["/api/shoes/comparisons"],
      await comparisonList(store),
    );
  else if (path.startsWith("/tools/shoes/compare/")) {
    const slug = path.split("/").at(-1)!;
    const data = await comparisonPayload(store, slug);
    if (!data) return { status: 404 };
    client.setQueryData(["/api/shoes/comparisons/by-slug", slug], data);
  } else {
    const slug = path.split("/").at(-1)!;
    const data = await shoePayload(store, slug);
    if (!data) return { status: 404 };
    if (data.canonicalSlug !== slug)
      return { status: 301, location: `/tools/shoes/${data.canonicalSlug}` };
    client.setQueryData([`/api/shoes/by-slug/${slug}`], data);
  }
  const Component = await loadPublicToolComponent(path);
  if (!Component) return { status: 404 };
  // Render and collect Helmet synchronously; do not interleave another request.
  const markup = renderToString(
    React.createElement(PublicToolApp, {
      Component,
      queryClient: client,
      ssrPath: path,
    }),
  );
  const head = Helmet.renderStatic();
  const html = template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,
      "",
    )
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
    .replace(
      "</head>",
      `${head.title.toString()}${head.meta.toString()}${head.link.toString()}</head>`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-ssr-tool="true">${markup}</div><script id="public-shoe-state" type="application/json">${safeJson(dehydrate(client))}</script>`,
    );
  client.clear();
  return { status: 200, html };
}
export function registerShoePages(app: Express, store: ShoeStore) {
  app.get(
    [
      "/tools/shoes",
      "/tools/shoes/compare",
      "/tools/shoes/compare/:slug",
      "/tools/shoes/:slug",
    ],
    async (req, res) => {
      const pathname = req.path.replace(/\/$/, "");
      try {
        const template = await readFile(
          resolve("dist/public/index.html"),
          "utf8",
        );
        const result = await renderShoeDocument(pathname, store, template);
        if (result.status === 301 && result.location)
          return res.redirect(301, result.location);
        if (result.status === 404)
          return res
            .status(404)
            .set({
              "X-Robots-Tag": "noindex, follow",
              "Cache-Control": "no-store",
            })
            .type("html")
            .send(
              '<!doctype html><html lang="en"><head><title>Shoe page not found | RunAnalytics</title><meta name="robots" content="noindex, follow"></head><body><h1>Shoe page not found</h1><a href="/tools/shoes">Browse running shoes</a></body></html>',
            );
        return res
          .status(200)
          .set({
            "X-Robots-Tag": "index, follow",
            "Cache-Control": "public, max-age=0, s-maxage=300",
            "Content-Type": "text/html; charset=utf-8",
          })
          .send(result.html);
      } catch (error) {
        console.error(
          "[shoe-pages] render failed",
          error instanceof Error ? error.message : "unknown",
        );
        return res
          .status(503)
          .set({ "Retry-After": "30", "Cache-Control": "no-store" })
          .send("Shoe data temporarily unavailable. Please retry.");
      }
    },
  );
}
