import assert from 'node:assert/strict';
const origin = process.argv[2] || 'https://aitracker.run';
const get = (path:string, headers: Record<string,string> = {}) => fetch(new URL(path,origin), {headers, signal:AbortSignal.timeout(45000)});
for (const path of ['/integrations','/garmin','/strava']) {
  for (const userAgent of ['RunAnalytics-Public-Release-Check','Googlebot']) {
    const response = await get(path, {'User-Agent':userAgent});
    assert.equal(response.status,200,path);
    const html = await response.text();
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.equal([...html.matchAll(/<h1\b/g)].length,1);
    assert.equal([...html.matchAll(/<title\b/g)].length,1);
    assert.ok(html.includes(`href="https://aitracker.run${path}"`));
    assert.match(html,/Garmin/);assert.match(html,/Strava/);
    if (path === '/garmin') { assert.match(html,/No historical import/);assert.match(html,/separate from Strava totals, Runner Score, AI coaching and messaging/); }
    if (path === '/strava') assert.match(html,/FAQPage/);
  }
  const markdown = await get(path,{Accept:'text/markdown'});
  assert.match(markdown.headers.get('content-type') || '',/text\/markdown/);
  assert.match(await markdown.text(),/Garmin/);
}
const home = await (await get('/')).text();
for (const path of ['/integrations','/garmin','/strava']) assert.ok(home.includes(`href="${path}"`));
assert.match(home,/Garmin and Strava connections|Garmin and Strava\. One/);
assert.match(home,/Initial release: new run summaries and a separate opt-in/);
const sitemap = await (await get('/sitemap.xml')).text();
for (const path of ['/integrations','/garmin','/strava']) assert.ok(sitemap.includes(`<loc>https://aitracker.run${path}</loc>`));
console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),publicSourcePages:true,humanAndCrawlerContent:true,markdown:true,sitemap:true,homepageSourceLinks:true}));
