import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";

const publicToolPaths = [
  "/tools",
  "/tools/aerobic-decoupling-calculator",
  "/tools/training-split-analyzer",
  "/tools/marathon-fueling",
  "/tools/race-predictor",
  "/tools/cadence-analyzer",
  "/tools/training-pace-calculator",
  "/tools/race-split-calculator",
  "/tools/heatmap",
  "/tools/shoes",
  "/tools/shoes/compare",
  "/tools/shoe-compare",
  "/tools/shoe-finder",
  "/tools/rotation-planner",
  "/tools/shoes/example-shoe",
  "/tools/shoes/compare/example-vs-example",
];

test("public tool routes produce server-rendered app markup", async () => {
  // The app's Vite build uses the automatic JSX runtime. tsx's test transform
  // follows the repository's legacy JSX setting, so expose React for this
  // server-only smoke test as well.
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const { renderReactToolPage } = await import("./reactToolRenderer");

  for (const path of publicToolPaths) {
    const html = await renderReactToolPage(path);
    assert.ok(html && html.length > 2_000, `${path} should have a substantive SSR shell`);
  }

  assert.equal(await renderReactToolPage("/dashboard"), null);
});

test("public shoe and comparison entries provide their URL slug to the component", async () => {
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const { PublicToolApp } = await import("../../client/src/publicToolApp");
  const Probe = () => React.createElement("output", null, useParams<{slug:string}>().slug);
  for (const [path, slug] of [
    ["/tools/shoes/nike-alphafly-4", "nike-alphafly-4"],
    ["/tools/shoes/compare/nike-alphafly-3-vs-nike-alphafly-4", "nike-alphafly-3-vs-nike-alphafly-4"],
  ]) {
    const html = renderToString(React.createElement(PublicToolApp, {
      Component: Probe, queryClient: new QueryClient(), ssrPath: path,
    }));
    assert.ok(html.includes(`<output>${slug}</output>`), path);
  }
});

test("the Tools hub exposes StrideReplay in the main content as an external video-analysis link", async () => {
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const { renderReactToolPage } = await import("./reactToolRenderer");
  const { renderToolsHubPage } = await import("./renderer");
  const html = await renderReactToolPage("/tools");
  assert.ok(html);
  const card = html.match(/data-testid="card-tool-stridereplay"[\s\S]*?(?=data-testid="card-tool-training-pace-calculator")/)?.[0];
  assert.ok(card, "StrideReplay belongs next to the cadence tool, not just in the footer");
  assert.match(card, /Analyze your running form from a short video/);
  assert.match(card, /<a [^>]*href="https:\/\/stridereplay\.com\/"[^>]*rel="nofollow noopener noreferrer"[^>]*>Visit StrideReplay/);
  assert.doesNotMatch(card, /Login Required|<button/);
  const fallback = renderToolsHubPage();
  assert.match(fallback, /<a href="https:\/\/stridereplay\.com\/" rel="nofollow noopener noreferrer"><strong>StrideReplay<\/strong><\/a>: Analyze your running form from a short video/);
});
