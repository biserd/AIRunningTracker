import assert from 'node:assert/strict';
// Anonymous release checks never create a run, source connection or preference.
const origin=process.argv[2]||'https://aitracker.run';
const get=(path:string,options:RequestInit={})=>fetch(new URL(path,origin),{...options,redirect:'manual',signal:AbortSignal.timeout(45000)});
for(const path of ['/api/runs','/api/runs/overview','/api/runs/calendar','/api/runs/garmin/release-check']){
  const response=await get(path);assert.equal(response.status,401,path+' requires authentication');await response.body?.cancel();
}
for(const method of ['POST','DELETE']){const response=await get('/api/runs/keep-separate',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({stravaRecordId:1,garminActivityId:'release-check'})});assert.equal(response.status,401,'matching preference requires authentication');await response.body?.cancel();}
const html=await(await get('/dashboard')).text();
const entryPath=html.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/)?.[1];assert.ok(entryPath);
const entry=await(await get(entryPath)).text(),spaPath=entry.match(/(?:\.\/|\/assets\/)(spa-entry-[A-Za-z0-9_-]+\.js)/)?.[1];assert.ok(spaPath);
const spa=await(await get('/assets/'+spaPath)).text();
const chunks:Record<string,string>={};
for(const [name,markers] of Object.entries({dashboard:['/api/runs/overview','/api/runs/calendar'],activities:['/api/runs?','Other copies remain.'],RunningFeed:['Keep as two runs','Check for duplicate again','counted once'],'garmin-run':['/api/runs/','private Garmin activity summary','Recorded with RunAnalytics on your phone.']})){
  const path=spa.match(new RegExp('(?:\\./|/?assets/|\")('+name+'-[A-Za-z0-9_-]+\\.js)'))?.[1];assert.ok(path,name+' published chunk');chunks[name]=path;
  const body=await(await get('/assets/'+path)).text();for(const marker of markers)assert.ok(body.includes(marker),name+': '+marker);
}
console.log(JSON.stringify({origin,checkedAt:new Date().toISOString(),combinedEndpointsProtected:true,matchingPreferencesProtected:true,publishedDashboardAndActivities:true,publishedGarminDetails:true,chunks},null,2));
