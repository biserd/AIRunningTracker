import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleTrust } from "../../client/src/components/ArticleTrust";
import { renderBlogPost } from "./renderer";
(globalThis as any).React = React;

test("buying guide crawler document and visitor editorial notice contain only internal links", () => {
  const html = renderBlogPost("how-to-compare-running-shoes")!;
  assert.ok(html.includes("RunAnalytics: build a running-shoe shortlist"));
  assert.doesNotMatch(html, /<a\b[^>]*href=["']https?:\/\/(?!aitracker\.run[\/"'])/i);
  const notice = renderToStaticMarkup(React.createElement(ArticleTrust, { topic: "tools", internalOnly: true, updated: "November 7, 2026" }));
  assert.doesNotMatch(notice, /href="https?:/);
  assert.match(notice, /Updated November 7, 2026/);
  assert.match(notice, /href="\/faq"/);
});
