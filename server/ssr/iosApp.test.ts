import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {renderIosAppPage} from './iosApp';
import {iosAppFaqs,iosAppMeta,iosPrivacyMeta} from '../../shared/iosAppContent';
import {isPrivateCrawlerPath} from './crawlerPolicy';

test('app and privacy render complete, indexable public documents with canonical metadata',()=>{
 for(const privacy of [false,true]){
  const html=renderIosAppPage(privacy),meta=privacy?iosPrivacyMeta:iosAppMeta;
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
  assert.equal((html.match(/<title>/g)||[]).length,1);
  assert.ok(meta.title.length<=60);assert.ok(meta.description.length<=160);
  assert.ok(html.includes(`href="https://aitracker.run${meta.path}"`));
  assert.match(html,/<meta name="robots" content="index, follow"/);
  assert.equal(isPrivateCrawlerPath(meta.path),false);
  assert.match(html,/Skip to content/);assert.match(html,/id="ios-main"/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
  assert.equal(schema['@context'],'https://schema.org');
 }
});
test('marketing stays coming soon, all FAQ answers render and native screenshots have dimensions',()=>{
 const html=renderIosAppPage();
 assert.match(html,/Coming Soon on iPhone and iPad/);
 assert.doesNotMatch(html,/href="https:\/\/(apps\.apple\.com|testflight\.apple\.com)/);
 assert.doesNotMatch(html,/Request beta access|Join the beta|Download on the App Store/);
 assert.equal((html.match(/<details>/g)||[]).length,iosAppFaqs.length);
 assert.match(html,/explicitly confirm/);assert.match(html,/not a replacement for the app or watch/);
 const imgs=[...html.matchAll(/<img[^>]+>/g)].map(x=>x[0]);assert.equal(imgs.length,6);
 for(const img of imgs){assert.match(img,/alt="[^"]{15,}"/);assert.match(img,/width="\d+"/);assert.match(img,/height="\d+"/);}
 assert.equal(imgs.filter(i=>i.includes('loading="lazy"')).length,5);
});
test('public images exist, use synthetic sources, and have a bounded transfer budget',()=>{
 const manifest=JSON.parse(readFileSync('client/public/ios-app/screenshots.json','utf8'));
 assert.match(manifest.source,/synthetic/);assert.equal(manifest.images.length,6);
 let bytes=0;for(const image of manifest.images){bytes+=statSync('client/public/ios-app/'+image.file).size;assert.ok(image.width>0&&image.height>0);}
 assert.ok(bytes<300_000);assert.ok(statSync('client/public/ios-app/social-v1.jpg').size<200_000);
});

test('pricing is visible without JavaScript, with trial eligibility and renewal terms',()=>{
 const html=renderIosAppPage();
 assert.match(html,/id="pricing"/);assert.match(html,/href="\/ios-app#pricing"/);
 for(const text of ['$7.99','$79.99','7-day free trial','Cancel anytime','eligible new subscribers','automatically renews','at least 24 hours','USD for the US','payment card','no second subscription needed'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/no credit card required|risk.free|money.back guarantee|unlimited voice/i);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
 const pricingFaq=schema['@graph'].find((s:any)=>s['@type']==='FAQPage').mainEntity.find((q:any)=>q.name==='How much does Premium cost?');
 assert.match(pricingFaq.acceptedAnswer.text,/\$7\.99\/month or \$79\.99\/year/);
 const css=readFileSync('client/public/ios-app/landing-v1.css','utf8');
 assert.match(css,/--orange:#FC4C02/);assert.match(css,/--ink:#333333/);
 assert.doesNotMatch(css,/#faf7f0|#252e28|#263c33/);
});
test('privacy describes providers, cloud voice, deletion and Apple cancellation without zero-retention claims',()=>{
 const html=renderIosAppPage(true);
 for(const term of ['OpenAI','Cloudflare','Strava','Apple','microphone','device token','Delete account','does not itself cancel','mailto:hello@aitracker.run'])assert.ok(html.includes(term),term);
 assert.doesNotMatch(html,/never share your individual conversations|processing is entirely on your device|zero data collection/i);
 assert.match(html,/not entirely on your device/);
 assert.match(html,/href="\/privacy"/);
});
test('routes, sitemap and both native and server entry points are linked',()=>{
 const routes=readFileSync('server/routes.ts','utf8'),app=readFileSync('client/src/App.tsx','utf8');
 assert.match(routes,/app\.get\(\['\/ios-app', '\/ios-app\/privacy'\]/);
 for(const path of ['/ios-app','/ios-app/privacy']){
  assert.ok(routes.includes(`url: "${path}"`));assert.ok(app.includes(`path="${path}"`));
 }
 assert.match(readFileSync('client/src/components/PublicHeader.tsx','utf8'),/href: "\/ios-app"/);
});
