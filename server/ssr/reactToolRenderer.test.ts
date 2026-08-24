import assert from "node:assert/strict";
import test from "node:test";
import React from "react";

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
