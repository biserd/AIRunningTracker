import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAboutPage,
  renderEbookLandingPage,
  renderBlogIndex,
  renderBlogPost,
  renderDevelopersApiPage,
  renderDevelopersPage,
  renderFeaturesPage,
  renderFaqPage,
  renderHomepage,
  renderPricingPage,
  renderProactiveRunningCoachPage,
  renderToolPage,
  renderToolsHubPage,
  getAllToolSlugs,
} from "./renderer";
import { getAllBlogPosts } from "./blogContent";
import { editorialPosts } from "../../shared/editorialPosts";

function assertExternalLinksAreProtected(html: string, expectedPath: string) {
  const externalAnchors = [...html.matchAll(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi)].map((match) => match[0]);
  for (const anchor of externalAnchors) {
    const rel = anchor.match(/\brel=["']([^"']+)["']/i)?.[1].toLowerCase().split(/\s+/) ?? [];
    for (const token of ["nofollow", "noopener", "noreferrer"]) {
      assert.ok(rel.includes(token), `${expectedPath}: external link must include ${token}: ${anchor}`);
    }
  }
}

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
    ["/proactive-running-coach", renderProactiveRunningCoachPage()],
    ["/features", renderFeaturesPage()],
    ["/about", renderAboutPage()],
    ["/ai-running-coaching-guide", renderEbookLandingPage()],
    ["/faq", renderFaqPage()],
    ["/blog", renderBlogIndex()],
    ["/tools", renderToolsHubPage()],
    ["/developers", renderDevelopersPage()],
    ["/developers/api", renderDevelopersApiPage()],
  ];
  pages.forEach(([path, html]) => assertSeoDocument(html, path));
  pages.forEach(([path, html]) => assertExternalLinksAreProtected(html, path));
});

test("proactive coach landing page states channel availability honestly", () => {
  const html = renderProactiveRunningCoachPage();
  assert.match(html, /Telegram is available to Premium and trial runners/);
  assert.match(html, /WhatsApp is the next planned messaging channel/);
  assert.match(html, /read-only/);
  assert.match(html, /explicit runner-owned opt-in/);
});

test("homepage prominently cross-links the proactive messaging coach", () => {
  const html = renderHomepage();
  assert.match(html, /href="\/proactive-running-coach"/);
  assert.match(html, /Telegram available now/);
  assert.match(html, /WhatsApp coming next/);
  assert.match(html, /Read-only access is scoped to the connected runner/);
});

test("proactive coaching article cross-links the messaging coach", () => {
  const html = renderBlogPost("ai-agent-coach-proactive-coaching");
  assert.ok(html);
  assert.match(html!, /href="\/proactive-running-coach"/);
});

test("every SSR tool has correct metadata", () => {
  for (const slug of getAllToolSlugs()) {
    const html = renderToolPage(slug);
    assert.ok(html);
    assertSeoDocument(html!, `/tools/${slug}`);
    assertExternalLinksAreProtected(html!, `/tools/${slug}`);
  }
});

test("every SSR blog has correct metadata and visible editorial information", () => {
  for (const post of getAllBlogPosts()) {
    const html = renderBlogPost(post.slug);
    assert.ok(html);
    assertSeoDocument(html!, `/blog/${post.slug}`);
    assertExternalLinksAreProtected(html!, `/blog/${post.slug}`);
    assert.match(html!, /By the RunAnalytics Editorial Team/);
  }
});

test("new editorial guides remain substantive, sourced, and internally connected", () => {
  for (const post of editorialPosts) {
    const text = post.sections.map((section) => section.html)
      .join(" ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z0-9#]+;/gi, " ");
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const externalSources = post.sources.filter((source) => /^https?:\/\//.test(source.href));
    const internalArticleLinks = [...post.sections.map((section) => section.html).join(" ").matchAll(/href="\/blog\/[^"#]+/g)];

    assert.ok(wordCount >= 900, `${post.slug}: at least 900 words, found ${wordCount}`);
    assert.ok(externalSources.length >= 3, `${post.slug}: at least three primary or authoritative sources`);
    assert.ok(internalArticleLinks.length >= 2, `${post.slug}: at least two contextual blog links`);
  }
});

test("new calculators and editorial guides are discoverable", () => {
  const toolSlugs = new Set(getAllToolSlugs());
  assert.ok(toolSlugs.has("training-pace-calculator"));
  assert.ok(toolSlugs.has("race-split-calculator"));

  const blogSlugs = new Set(getAllBlogPosts().map((post) => post.slug));
  for (const slug of [
    "heart-rate-drift-aerobic-decoupling",
    "running-cadence-by-pace",
    "80-20-running-training-split",
    "marathon-fueling-calculator-guide",
    "ai-running-coach-vs-training-plan",
  ]) {
    assert.ok(blogSlugs.has(slug), `${slug}: included in SSR blog catalog`);
  }
});
