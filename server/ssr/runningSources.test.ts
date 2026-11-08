import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderPublicDocument } from './reactToolRenderer';
import { publicMarkdown } from './publicMarkdown';
import { runningSources } from '../../shared/runningSources';
(globalThis as any).React = React;
const template = '<!doctype html><html><head><title>Old</title><meta name="description" content="Old"></head><body><div id="root"></div></body></html>';

test('homepage and product landing copy contains no em dashes', () => {
  for (const file of ['client/src/pages/landing.tsx','client/src/pages/integrations.tsx','client/src/components/RunningSources.tsx','shared/runningSources.ts','shared/iosAppView.tsx','shared/iosAppContent.ts','client/src/pages/proactive-running-coach.tsx','client/src/pages/ai-running-coach.tsx','client/src/pages/ai-agent-coach.tsx','client/src/pages/ai-coaching-guide.tsx','client/src/pages/chrome-extension.tsx','server/ssr/homepageContent.ts']) {
    assert.doesNotMatch(readFileSync(file,'utf8'), /\u2014|&mdash;|&#8212;|&#x2014;/i, file);
  }
});

test('connection pages deliver real, canonical, accessible content without an account', async () => {
  for (const path of ['/integrations', '/garmin', '/strava']) {
    const html = await renderPublicDocument(path, template);
    assert.ok(html);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    assert.equal([...html.matchAll(/<title\b/g)].length, 1);
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1);
    assert.ok(html.includes(`href="https://aitracker.run${path}"`));
    assert.match(html, /<main>/);
    assert.match(html, /Garmin/);
    assert.match(html, /Strava/);
    assert.match(html, /href="\/auth"/);
    assert.doesNotMatch(html, /<svg[^>]*role="img"(?![^>]*aria-hidden="true")[^>]*>/);
    assert.doesNotMatch(html.match(/<title[^>]*>(.*?)<\/title>/)![1], /…|\.\.\./);
    if (path !== '/integrations') {
      assert.match(html, /FAQPage/);
      assert.match(html, /BreadcrumbList/);
      assert.equal([...html.matchAll(/<details\b/g)].length, path === '/garmin' ? 7 : 6);
    }
  }
});
test('Garmin copy does not promise parity, historic import or automatic coaching', async () => {
  const html = (await renderPublicDocument('/garmin',template))!;
  assert.match(html, /No historical import/);
  assert.match(html, /Garmin data stays outside Runner Score, AI coaching and messaging/);
  assert.match(html, /clear matches count once/i);
  assert.match(html, /GPS routes, detailed activity streams, workout uploads and course uploads/);
  assert.match(html, /Separate health consent/);
  assert.match(html, /Health data stays outside AI coaching, messaging and Strava/);
  assert.match(html, /href="\/privacy#garmin-health"/);
  assert.match(html, /Activity Export/);
  assert.match(html, /href="\/strava"/);
  assert.match(html, /initial release/i);
});
test('homepage and machine-readable copy discover both sources with honest scope', async () => {
  const html = (await renderPublicDocument('/',template))!;
  for (const path of ['/integrations','/garmin','/strava']) {
    assert.ok(html.includes(`href="${path}"`));
    assert.ok(publicMarkdown(path));
    assert.ok(readFileSync('server/routes.ts','utf8').includes(`url: "${path}"`));
  }
  assert.match(html, /Garmin and Strava connections|Garmin and Strava\. One/);
  assert.match(html, /Initial release: new run summaries and a separate opt-in/);
  assert.match(publicMarkdown('/')!, /Garmin summaries remain outside AI coaching and Runner Score/);
  for (const source of Object.values(runningSources)) {
    assert.ok(source.title.length <= 60);
    assert.ok(source.description.length <= 160);
    for (const f of source.faqs) assert.ok(publicMarkdown(source.path)!.includes(f.answer));
  }
});
