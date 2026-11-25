import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { launchAnnouncement } from './launchAnnouncement';
import { hasLaunchBanner, launchCutoff, launchOpen } from '../../shared/blackFridayLaunch';
import { APP_STORE_URL } from '../../shared/iosAppContent';

test('Eastern cutoff is exclusive; offer only on marketing routes', () => {
  assert.equal(new Date(launchCutoff).toISOString(),'2026-12-01T05:00:00.000Z');
  assert.equal(launchOpen(launchCutoff-1),true); assert.equal(launchOpen(launchCutoff),false);
  for (const path of ['/','/ios-app','/pricing/','/tools/shoes/compare/a-vs-b','/garmin/setup','/blog/my-run','/features']) assert.ok(hasLaunchBanner(path),path);
  for (const path of ['/auth','/dashboard','/settings','/billing','/admin','/activity/1','/ios-app/privacy','/terms','/api/stripe/web-intro-offer','/tools/foo.png']) assert.equal(hasLaunchBanner(path),false,path);
});
test('public HTML includes one strip and distinct destinations, never cached beyond the deadline',async t=>{
  let time=launchCutoff-800, reads=0;
  const app=express().use(launchAnnouncement(async()=>{
    reads++;
    return { firstMonth:'$3.99', firstYear:'$39.99', renewalMonth:'$7.99', renewalYear:'$79.99', deadline:'November 30' };
  },()=>time));
  app.get('*',(req,res)=>res.status(req.path.endsWith('missing')?404:200).type('html').send('<html><body class="site"><main>Original</main></body></html>'));
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  t.after(()=>new Promise<void>(r=>server.close(()=>r())));
  const read=(path:string)=>fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port+path);
  assert.doesNotMatch(await (await read('/dashboard')).text(),/Black Friday/); assert.equal(reads,0);
  const response=await read('/'); const html=await response.text();
  assert.match(response.headers.get('cache-control')!,/s-maxage=0, must-revalidate/);
  assert.ok(html.includes(APP_STORE_URL)); assert.ok(html.includes('/pricing#web-offer')); assert.ok(html.includes('$39.99')); assert.ok(html.includes('<main>Original'));
  assert.equal(html.split('data-launch-first-year').length,2);
  assert.doesNotMatch(await (await read('/tools/missing')).text(),/Black Friday/); assert.equal(reads,1);
  time=launchCutoff; assert.doesNotMatch(await (await read('/pricing')).text(),/Black Friday/);
  // A missing offer must not decorate the document.
  let decorated=false, next=false;
  const res={send(){decorated=true;}}; const original=res.send;
  await launchAnnouncement(async()=>{throw Error('billing offline');},()=>launchCutoff-1)({method:'GET',path:'/pricing'} as any,res as any,()=>{next=true;});
  assert.ok(next); assert.equal(res.send,original); assert.equal(decorated,false);
});

test('a tab left open at the cutoff or restored from browser history removes the strip',()=>{
  let time=launchCutoff-5000, removed=false;
  const callbacks = new Map<string,()=>void>();
  const listen=(name:string,fn:()=>void)=>callbacks.set(name,fn);
  runInNewContext(readFileSync('client/public/launch-expiry-2026.js','utf8'),{
    Date:{now:()=>time}, document:{currentScript:{dataset:{ends:String(launchCutoff)}},
      querySelector:()=>({remove:()=>{removed=true;}}), addEventListener:listen},
    window:{setTimeout:(fn:()=>void,delay:number)=>{assert.equal(delay,5000);listen('timer',fn);},addEventListener:listen}
  });
  assert.equal(removed,false); time=launchCutoff;
  for(const event of ['timer','pageshow','visibilitychange']){removed=false; callbacks.get(event)!(); assert.ok(removed,event);}
});
