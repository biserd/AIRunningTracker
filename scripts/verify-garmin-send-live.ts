import assert from 'node:assert/strict';
// Anonymous auth/asset checks only. Does not send workouts or course coordinates.
const origin=process.argv[2]||'https://aitracker.run';
const get=(path:string,options:RequestInit={})=>fetch(new URL(path,origin),{...options,redirect:'manual',signal:AbortSignal.timeout(45000)});
for(const path of ['/api/garmin/send/status','/api/garmin/send/plans/1']){const r=await get(path);assert.equal(r.status,401,path);await r.body?.cancel();}
for(const path of ['/api/garmin/send/plans/1/days/1','/api/garmin/send/courses/preview','/api/garmin/send/courses']){const r=await get(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401,path);await r.body?.cancel();}
const page=await get('/garmin-send');assert.match(page.headers.get('x-robots-tag')||'',/noindex/);const html=await page.text(),entryPath=html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/)?.[1];assert.ok(entryPath);
const entry=await(await get(entryPath)).text(),spaPath=entry.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1];assert.ok(spaPath);
const spa=await(await get('/assets/'+spaPath)).text(),chunk=spa.match(/(?:\.\/|\/?assets\/|")(garmin-send-[A-Za-z0-9_-]+\.js)/)?.[1];assert.ok(chunk);
const body=await(await get('/assets/'+chunk)).text();for(const marker of ['Take your training to your watch','Send course to Garmin','/api/garmin/send/courses/preview','/api/garmin/send/status'])assert.ok(body.includes(marker),marker);
console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),outboundRoutesProtected:true,reviewUIAvailable:true,chunk,realProviderSendVerified:false,watchDeliveryVerified:false},null,2));
