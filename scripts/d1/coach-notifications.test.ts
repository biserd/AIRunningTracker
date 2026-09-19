import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {coachUnsubscribeToken,verifyCoachUnsubscribe} from '../../server/services/coachUnsubscribe';
import {privateCoachNotifications} from '../../apps/api-cloudflare/container/coach-notification-bridge';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2); CREATE TABLE apple_push_devices(user_id INTEGER,expires_at INTEGER,runs INTEGER,reminders INTEGER); CREATE TABLE coach_companion_preferences(user_id INTEGER PRIMARY KEY,settings TEXT);');
sqlite.exec(readFileSync('migrations/20260919_coach_automation.sql','utf8'));
const adapter={prepare(sql:string){let values:any[]=[];const s={bind(...v:any[]){values=v;return s},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){return {meta:sqlite.prepare(sql).run(...values)}}};return s}};
(globalThis as any).__notificationDB=adapter;
const bundle=await build({entryPoints:['server/services/coachNotifications.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolated',setup(b){
 b.onResolve({filter:/runtimeDatabase$|\/storage$|coachCompanion$|\/email$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('runtimeDatabase')?'export const applicationSqlDatabase=globalThis.__notificationDB':a.path.endsWith('/storage')?'export const storage={getUser:async id=>({id,email:`${id}@example.test`,notifyPostRun:true})}':a.path.endsWith('/email')?'export const emailService={sendEmailDetailed:async()=>({success:true})}':'export const companionAllowed=async()=>true;export const buildCompanionBriefings=async()=>{}',loader:'js'}));
}}]});
const service=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const preference=(user:number,delivery:string)=>sqlite.prepare('INSERT OR REPLACE INTO coach_companion_preferences VALUES (?,?)').run(user,JSON.stringify({delivery}));
test('auto routing prefers an enabled app and does not silently opt in WhatsApp',()=>{
 assert.equal(service.preferredChannel('auto',{push:true,email:true,whatsapp:true}),'push');
 assert.equal(service.preferredChannel('auto',{push:false,email:false,whatsapp:true}),'none');
 assert.equal(service.preferredChannel('whatsapp',{push:true,email:true,whatsapp:false}),'none');
});
test('event channel is pinned across preference changes and accounts stay isolated',async()=>{
 preference(1,'push');sqlite.exec(`INSERT INTO apple_push_devices VALUES(1,${Math.floor(Date.now()/1000)+600},1,1)`);
 assert.equal(await service.permitCoachNotification(1,'run:10','push'),true);
 preference(1,'email');assert.equal(await service.permitCoachNotification(1,'run:10','email'),false);
 preference(2,'email');assert.equal(await service.permitCoachNotification(2,'run:10','email'),true);
 assert.equal(await service.permitCoachNotification(2,'run:10','email'),false);
});
test('WhatsApp sends once even when competing channels process the same event',async(t)=>{
 preference(1,'whatsapp');let sent=0;const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async(url,init)=>{assert.equal(url,'http://aitracker.coach.internal/notifications');const input=JSON.parse(String(init?.body));if(input.action==='available')return Response.json({available:true});sent++;return Response.json({status:'unknown'});};
 await Promise.all([service.permitCoachNotification(1,'run:11','push'),service.permitCoachNotification(1,'run:11','email')]);
 await service.permitCoachNotification(1,'run:11','email');assert.equal(sent,1);
 assert.equal(sqlite.prepare("SELECT state FROM coach_notification_deliveries WHERE event_key='run:11'").get()?.state,'unknown');
});
test('an ineligible email does not consume its delivery claim',async()=>{
 preference(2,'email');
 assert.equal(await service.permitCoachNotification(2,'run:12','email',undefined,false),false);
 assert.equal(sqlite.prepare("SELECT state FROM coach_notification_deliveries WHERE user_id=2 AND event_key='run:12'").get()?.state,'pending');
 assert.equal(await service.permitCoachNotification(2,'run:12','email'),true);
 assert.equal(await service.hasUnifiedCoachDelivery(2),true);
 assert.equal(await service.hasUnifiedCoachDelivery(999),false);
});
test('unsubscribe is purpose-bound, tamper resistant and account-specific',()=>{
 const secret='a'.repeat(48),token=coachUnsubscribeToken(1,secret);
 assert.equal(verifyCoachUnsubscribe(token,secret),1);
 assert.equal(verifyCoachUnsubscribe(token.replace(/^1/,'2'),secret),null);
 assert.equal(verifyCoachUnsubscribe(token,'b'.repeat(48)),null);
 assert.equal(verifyCoachUnsubscribe(['invalid'],secret),null);
});
test('private bridge rejects missing credentials and arbitrary fields',async()=>{
 let calls=0;const secret='a'.repeat(48),handler=privateCoachNotifications(secret,{available:async()=>{calls++;return true},deliver:async()=>({status:'sent'})});
 assert.equal((await handler(new Request('http://internal',{method:'POST',body:'{}'}))).status,401);
 assert.equal((await handler(new Request('http://internal',{method:'POST',headers:{authorization:secret},body:JSON.stringify({action:'available',user:1,address:'foreign'})}))).status,400);
 assert.equal(calls,0);
 assert.equal((await handler(new Request('http://internal',{method:'POST',headers:{authorization:secret},body:JSON.stringify({action:'available',user:1})}))).status,200);
});
