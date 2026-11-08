import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderPublicDocument } from './reactToolRenderer';
import { publicMarkdown } from './publicMarkdown';
import { garminPublicPages } from '../../shared/garminPublicContent';
import { sanitizeReturnTo } from '../../shared/upgradeIntent';
(globalThis as any).React = React;
const template = '<!doctype html><html><head><title>Old</title><meta name="description" content="Old"></head><body><div id="root"></div></body></html>';

test('Garmin guides are public SSR documents with unique metadata and matching structured data', async () => {
  for (const page of Object.values(garminPublicPages)) {
    const html = (await renderPublicDocument(page.path, template))!;
    assert.ok(html);
    for (const re of [/<h1\b/g, /<title\b/g, /rel="canonical"/g, /name="description"/g]) assert.equal([...html.matchAll(re)].length, 1, page.path + re);
    assert.ok(html.includes('href="https://aitracker.run' + page.path + '"'));
    assert.ok(page.title.length <= 60);
    assert.ok(page.description.length <= 160);
    assert.doesNotMatch(html, /noindex|\u2014|&mdash;/);
    assert.match(html, /<main>/);
    const schema = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
    assert.ok(schema.some(s => s['@graph']?.some((n: any) => n['@type'] === 'BreadcrumbList')));
    const faq = schema.flatMap(s => s['@graph'] || []).find(n => n['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, page.faqs.length);
    for (const f of page.faqs) assert.ok(publicMarkdown(page.path)!.includes(f.answer));
    for (const section of page.sections) {
      assert.ok(html.includes('id="' + section.id + '"'));
      for (const item of section.items) assert.ok(publicMarkdown(page.path)!.includes(item.text));
    }
    assert.match(html, /href="\/auth\?redirect=/);
    assert.match(html, /href="\/privacy#garmin-health"/);
    assert.match(html, /href="\/garmin"/);
    assert.match(html, /href="\/integrations"/);
    assert.match(html, /href="\/pricing"/);
    assert.match(html, /not.*medical advice/);
    assert.ok(readFileSync('server/routes.ts', 'utf8').includes(`url: "${page.path}"`));
    assert.ok(readFileSync('client/src/App.tsx', 'utf8').includes(`path="${page.path}"`));
  }
});
test('Garmin guides are discovered from the homepage, source page and connections hub', async () => {
  for (const path of ['/', '/garmin', '/integrations']) {
    const html = (await renderPublicDocument(path, template))!;
    for (const page of Object.values(garminPublicPages)) assert.ok(html.includes(`href="${page.path}"`), path + ' links ' + page.path);
  }
  const recovery = (await renderPublicDocument('/garmin/recovery', template))!;
  assert.match(recovery, /seven valid dates/);
  assert.match(recovery, /up to 90 days/);
  assert.match(recovery, /outside AI coaching/);
  assert.match(recovery, /Automatic historical backfill is not included/);
  const setup = (await renderPublicDocument('/garmin/setup', template))!;
  assert.match(setup, /not a RunAnalytics signup or login method/);
  assert.match(setup, /Activity Export/);
  assert.match(setup, /href="\/contact"/);
  assert.match(setup, /not merged into Strava totals/);
});
test('private Garmin recovery does not become public Markdown', () => {
  for (const path of ['/recovery', '/settings', '/api/garmin/health/recovery']) assert.equal(publicMarkdown(path), null);
  assert.equal(sanitizeReturnTo('/recovery'), '/recovery');
  for (const path of ['//example.com/recovery', '/recovery/other', '/recovery-malicious']) assert.equal(sanitizeReturnTo(path), null);
});
