import assert from 'node:assert/strict';
// Read-only anonymous checks. No grants, real data writes, file downloads or send-to-watch actions.
const origin=process.argv[2]||'https://aitracker.run';
const get=(path:string,options:RequestInit={})=>fetch(new URL(path,origin),{...options,redirect:'manual',signal:AbortSignal.timeout(45000)});
for(const path of ['/api/garmin/details/status','/api/garmin/details/run/release-check','/api/garmin/details/wellness','/api/garmin/details/export']){const r=await get(path);assert.equal(r.status,401,path);await r.body?.cancel();}
for(const method of ['POST','DELETE']){const r=await get('/api/garmin/details/consent',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({category:'activity',consent:true,version:'garmin-details-v1'})});assert.equal(r.status,401,'detailed-data consent requires auth');await r.body?.cancel();}
assert.equal((await get('/api/garmin/details-webhook',{method:'POST',headers:{'Content-Type':'application/json','garmin-client-id':'not-real','X-Forwarded-For':'204.77.163.1'},body:'{}'})).status,403,'source IP cannot be spoofed');
assert.equal((await get('/internal/garmin/ingest',{method:'POST'})).status,404,'ingest is private');
const html=await(await get('/recovery')).text(),entryPath=html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/)?.[1];assert.ok(entryPath);
const entry=await(await get(entryPath)).text(),spaPath=entry.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1];assert.ok(spaPath);
const spa=await(await get('/assets/'+spaPath)).text(),chunks:Record<string,string>={};
for(const [name,markers] of Object.entries({'garmin-run':['Recorded route','Recorded sensor data','Laps and splits','/api/garmin/details/run/'],recovery:['Sleep-stage timeline','Sleep breathing variations','Logged nutrition','/api/garmin/details/wellness'],GarminDetailControls:['Detailed Garmin runs','/api/garmin/details/consent','More Garmin health readings']})){
 const path=spa.match(new RegExp('(?:\\./|/?assets/|\")('+name+'-[A-Za-z0-9_-]+\\.js)'))?.[1];assert.ok(path,name+' chunk');chunks[name]=path;const body=await(await get('/assets/'+path)).text();for(const marker of markers)assert.ok(body.includes(marker),name+': '+marker);
}
console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),detailEndpointsProtected:true,consentProtected:true,webhookSpoofRejected:true,internalIngestPrivate:true,runAndRecoveryAssetsPublished:true,chunks,realDetailDeliveryVerified:false},null,2));
