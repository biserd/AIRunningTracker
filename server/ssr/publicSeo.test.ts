import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { sitemapDate } from './sitemapDates';
import { renderPublicDocument } from './reactToolRenderer';
(globalThis as any).React = React;
const template = '<!doctype html><html><head><title>Generic</title><meta name="description" content="Generic"></head><body><div id="root"></div></body></html>';
test('sitemap dates use source dates and omit missing, invalid or future dates', () => {
  assert.equal(sitemapDate('2026-01-04'),'2026-01-04');
  for (const input of [null,undefined,'invalid','2999-01-01']) assert.equal(sitemapDate(input),undefined);
});
test('homepage and priority tools have useful content and untruncated metadata in the first response', async () => {
  for (const path of ['/','/tools/race-predictor','/tools/marathon-fueling','/tools/rotation-planner']) {
    const html = await renderPublicDocument(path,template);
    assert.ok(html);
    assert.equal([...html.matchAll(/<title\b/g)].length,1);
    assert.equal([...html.matchAll(/<h1\b/g)].length,1);
    assert.match(html, /data-ssr-tool="true"/);
    assert.ok(html.includes(`href="https://aitracker.run${path}"`));
    assert.doesNotMatch(html.match(/<title[^>]*>(.*?)<\/title>/)![1], /\.\.\.|…/);
    assert.doesNotMatch(html, /<svg[^>]*role="img"(?![^>]*aria-hidden="true")[^>]*>/);
    if (path === '/') assert.match(html, /<main>/);
    if (path === '/tools/race-predictor') { assert.match(html, /Frequently Asked Questions/); assert.match(html, /application\/ld\+json/); }
  }
  assert.equal(await renderPublicDocument('/dashboard',template),null);
});
