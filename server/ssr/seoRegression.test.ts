import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAboutPage,
  renderBlogIndex,
  renderBlogPost,
  renderDevelopersApiPage,
  renderDevelopersPage,
  renderFeaturesPage,
  renderFaqPage,
  renderPricingPage,
  renderToolPage,
  renderToolsHubPage,
  getAllToolSlugs,
} from "./renderer";
import { getAllBlogPosts } from "./blogContent";

function assertSeoDocument(html: string, expectedPath: string) {
  const titles = [...html.matchAll(/<title>(.*?)<\/title>/g)].map((match) => match[1]);
  const descriptions = [...html.matchAll(/<meta name="description" content="(.*?)"/g)];
  const canonicals = [...html.matchAll(/<link rel="canonical" href="(.*?)"/g)].map((match) => match[1]);
  const h1s = [...html.matchAll(/<h1(?:\s[^>]*)?>/g)];
  assert.equal(titles.length, 1, `${expectedPath}: one title`);
  assert.ok(titles[0].replace(/&amp;/g, "&").length <= 60, `${expectedPath}: title <= 60 chars`);
  assert.equal(descriptions.length, 1, `${expectedPath}: one description`);
  assert.equal(canonicals.length, 1, `${expectedPath}: one canonical`);
  assert.equal(canonicals[0], `https://aitracker.run${expectedPath}`, `${expectedPath}: self-canonical`);
  assert.equal(h1s.length, 1, `${expectedPath}: one H1`);
}

test("static public SSR pages have one self-canonical and one H1", () => {
  const pages: Array<[string, string]> = [
    ["/pricing", renderPricingPage()],
    ["/features", renderFeaturesPage()],
    ["/about", renderAboutPage()],
    ["/faq", renderFaqPage()],
    ["/blog", renderBlogIndex()],
    ["/tools", renderToolsHubPage()],
    ["/developers", renderDevelopersPage()],
    ["/developers/api", renderDevelopersApiPage()],
  ];
  pages.forEach(([path, html]) => assertSeoDocument(html, path));
});

test("every SSR tool has correct metadata", () => {
  for (const slug of getAllToolSlugs()) {
    const html = renderToolPage(slug);
    assert.ok(html);
    assertSeoDocument(html!, `/tools/${slug}`);
  }
});

test("every SSR blog has correct metadata and visible editorial information", () => {
  for (const post of getAllBlogPosts()) {
    const html = renderBlogPost(post.slug);
    assert.ok(html);
    assertSeoDocument(html!, `/blog/${post.slug}`);
    assert.match(html!, /By the RunAnalytics Editorial Team/);
  }
});
