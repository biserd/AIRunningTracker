import assert from 'node:assert/strict';
// Read-only public checks. No Garmin OAuth grant, user lookup or sample-data write.
const origin=process.argv[2]||'https://aitracker.run';
const get=(path:string,options:RequestInit={})=>fetch(new URL(path,origin),{...options,redirect:'manual',signal:AbortSignal.timeout(45000)});
const health=await get('/health');assert.equal(health.status,200,'application health');await health.body?.cancel();
for(const path of ['/api/garmin/status','/api/garmin/activities','/api/garmin/export']){
  const response=await get(path);assert.equal(response.status,401,path+' requires authentication');await response.body?.cancel();
}
const authorize=await get('/api/garmin/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({activityConsent:true})});
assert.equal(authorize.status,401,'authorization requires signed-in runner');await authorize.body?.cancel();
const invalid=await get('/api/garmin/callback?state=invalid&code=invalid');assert.equal(invalid.status,302);assert.equal(invalid.headers.get('location'),'/settings?garmin=invalid_state');await invalid.body?.cancel();
const webhook=await get('/api/garmin/webhook',{method:'POST',headers:{'Content-Type':'application/json','garmin-client-id':'not-a-real-client','X-Forwarded-For':'204.77.163.1'},body:'{}'});
assert.equal(webhook.status,403,'public caller cannot spoof Garmin source');await webhook.body?.cancel();
const internal=await get('/internal/garmin/maintenance',{method:'POST'});assert.equal(internal.status,404,'internal maintenance is not public');await internal.body?.cancel();
const htmlResponse=await get('/settings');assert.equal(htmlResponse.status,200);const html=await htmlResponse.text();
const entryPath=html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/)?.[1];assert.ok(entryPath);
const entry=await (await get(entryPath)).text(),spaPath=entry.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1];assert.ok(spaPath);
const spa=await (await get('/assets/'+spaPath)).text();
const chunk=(name:string)=>{const path=spa.match(new RegExp('(?:\\./|/assets/|\")('+name+'-[A-Za-z0-9_-]+\\.js)'))?.[1];assert.ok(path,name+' chunk');return path;};
const settingsPath=chunk('settings'),privacyPath=chunk('privacy');
const settings=await (await get('/assets/'+settingsPath)).text();
for(const marker of ['/api/garmin/status','/api/garmin/authorize','/api/garmin/activities','Agree to Garmin activity sharing','Garmin Connect','Recent Garmin runs'])assert.ok(settings.includes(marker),'published settings: '+marker);
const privacy=await (await get('/assets/'+privacyPath)).text();
for(const marker of ['Garmin Connect activity sync','Cloudflare','AI transparency','Transient delivery records expire within seven days'])assert.ok(privacy.includes(marker),'published privacy: '+marker);
console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),health:true,garminEndpointsRequireAuthentication:true,invalidStateRejected:true,spoofedWebhookRejected:true,internalRoutePrivate:true,settingsPath,privacyPath,realGarminConnectionVerified:false},null,2));
