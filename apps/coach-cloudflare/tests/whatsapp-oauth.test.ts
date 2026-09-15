import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {processWhatsApp,disconnectWhatsApp} from '../worker/whatsapp';
import {fixture} from './reminder-fixture';
import {crypt,startAuthorization,finishAuthorization,hasGrant,validateGrant,whatsappContext,revokeGrant} from '../worker/whatsapp-oauth';
function setup(){
 const f=fixture();f.env.WHATSAPP_GRANT_KEY='ab'.repeat(32);
 let email='a@example.test',denied=false,refreshes=0,revocations=0;
 const calls:string[]=[],toolCalls:string[]=[];
 f.env.BACKEND={async fetch(url:string,init:RequestInit){
  assert.ok(url.startsWith('https://aitracker.run/'));assert.equal(init.redirect,'manual');calls.push(new URL(url).pathname);
  if(url.endsWith('/api/user'))return Response.json({email:'a@example.test'});
  if(url.endsWith('/register'))return Response.json({client_id:'client-a'});
  if(url.endsWith('/revoke')){revocations++;return new Response('');}
  if(url.endsWith('/token')){
   const body=new URLSearchParams(String(init.body));assert.equal(body.get('resource'),'https://aitracker.run/mcp');
   if(body.get('grant_type')==='refresh_token')refreshes++;
   else assert.match(body.get('code_verifier')||'',/^[a-f0-9]{64}$/);
   return Response.json({access_token:'private-access',refresh_token:'private-refresh',token_type:'Bearer',expires_in:900,resource:'https://aitracker.run/mcp',scope:'mcp:profile.read mcp:activities.read mcp:analytics.read mcp:goals.read mcp:plans.read'});
  }
  assert.equal(url,'https://aitracker.run/mcp');if(denied)return new Response('',{status:401});
  const input=JSON.parse(String(init.body));toolCalls.push(input.params.name);let data:unknown;
  if(input.params.name==='get_runner_profile')data={profile:{email,displayName:'Runner'}};
  else if(input.params.name==='get_runner_coach_snapshot')data={profile:{profile:{email,displayName:'Runner'}},activePlan:{planId:76},recentActivities:[{distanceMeters:10000}],activeGoals:[]};
  else {assert.equal(input.params.name,'get_training_plan');assert.equal(input.params.arguments.planId,76);data={planId:76,weeks:[{weekNumber:18,days:[{title:'Race day'}]}]};}
  return Response.json({jsonrpc:'2.0',id:input.id,result:{structuredContent:data}});
 }} as unknown as Fetcher;
 return {...f,calls,toolCalls,setEmail:(v:string)=>email=v,deny:()=>denied=true,refreshes:()=>refreshes,revocations:()=>revocations};
}
async function authorize(f:ReturnType<typeof setup>){const start=await startAuthorization(f.env,'a','web-session-not-stored');const state=new URL(start.authorizationUrl).searchParams.get('state');await finishAuthorization(f.env,'a',{state,code:'code'});return state;}
test('Encrypted grants cannot be decrypted for another runner or after tampering',async()=>{
 const f=setup();try{const encrypted=await crypt(f.env,'a','sensitive');assert.ok(!encrypted.includes('sensitive'));assert.equal(await crypt(f.env,'a',encrypted,true),'sensitive');await assert.rejects(crypt(f.env,'b',encrypted,true));await assert.rejects(crypt(f.env,'a',encrypted.slice(0,-4)+'AAAA',true));}finally{f.db.close();}
});
test('OAuth uses PKCE and single-use account-bound state; full plan is loaded without secrets',async()=>{
 const f=setup();try{
  const start=await startAuthorization(f.env,'a','web-session-not-stored'),url=new URL(start.authorizationUrl),state=url.searchParams.get('state');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('redirect_uri'),'https://new.aitracker.run/whatsapp/callback');
  await assert.rejects(finishAuthorization(f.env,'b',{state,code:'code'}));
  await finishAuthorization(f.env,'a',{state,code:'code'});await assert.rejects(finishAuthorization(f.env,'a',{state,code:'code'}));
  const saved=JSON.stringify(f.db.prepare('SELECT * FROM whatsapp_oauth_grants').get());assert.ok(!saved.includes('private-access'));assert.ok(!saved.includes('web-session'));
  const context=await whatsappContext(f.env,'a');assert.ok(JSON.stringify(context).includes('Race day'));assert.ok(!JSON.stringify(context).includes('a@example.test'));assert.equal(context.trainingContext?.canWritePlans,false);
  await assert.rejects(whatsappContext(f.env,'b'));assert.equal(await hasGrant(f.env,'b'),false);
 }finally{f.db.close();}
});
test('Wrong-account consent is rejected and issued credentials revoked',async()=>{
 const f=setup();try{f.setEmail('another@example.test');await assert.rejects(authorize(f));assert.equal(await hasGrant(f.env,'a'),false);assert.equal(f.revocations(),1);}finally{f.db.close();}
});
test('Context cache avoids repeated snapshot/plan reads, expires, refreshes and remains grant-bound',async(t)=>{
 const f=setup();t.after(()=>f.db.close());await authorize(f);f.toolCalls.length=0;
 const first=await whatsappContext(f.env,'a');
 assert.deepEqual(f.toolCalls,['get_runner_profile','get_runner_coach_snapshot','get_training_plan']);
 f.toolCalls.length=0;assert.deepEqual(await whatsappContext(f.env,'a'),first);
 assert.deepEqual(f.toolCalls,['get_runner_profile']);
 const cache=f.db.prepare('SELECT payload FROM whatsapp_context_cache WHERE session_id=?').get('a')!;
 assert.ok(!String(cache.payload).includes('Race day'));
 f.toolCalls.length=0;await whatsappContext(f.env,'a',true);assert.equal(f.toolCalls.length,3);
 f.db.prepare('UPDATE whatsapp_context_cache SET expires_at=0').run();
 f.toolCalls.length=0;await whatsappContext(f.env,'a');assert.equal(f.toolCalls.length,3);
 f.db.prepare("UPDATE whatsapp_oauth_grants SET generation='new-grant'").run();
 f.toolCalls.length=0;await whatsappContext(f.env,'a');assert.equal(f.toolCalls.length,3);
 await assert.rejects(whatsappContext(f.env,'b'));
 f.deny();await assert.rejects(whatsappContext(f.env,'a'));
 await revokeGrant(f.env,'a');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM whatsapp_context_cache').get()!.n,0);
});
test('Preloading takes the runner lease, sends no message and warms the next context read',async(t)=>{
 const f=setup();t.after(()=>f.db.close());await authorize(f);
 Object.assign(f.env,{OPENAI_API_KEY:'test',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'test',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550100'});
 f.db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify({source:'production_account'}),'a');
 f.db.prepare('INSERT INTO whatsapp_links(session_id,generation,token_expires,address,last_inbound,consent_at) VALUES (?,?,?,?,?,?)').run('a','g',0,'whatsapp:+14155550111',1,1);
 f.db.prepare('INSERT INTO whatsapp_conversation_leases VALUES (?,?,?)').run('a','other',Math.floor(Date.now()/1000)+300);
 assert.equal(await processWhatsApp(f.env,'a','g'),'busy');
 f.db.prepare('DELETE FROM whatsapp_conversation_leases').run();
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 assert.equal(await processWhatsApp(f.env,'a','wrong-generation'),'done');
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM whatsapp_context_cache').get()!.n,0);
 assert.equal(await processWhatsApp(f.env,'a','g'),'done');
 f.toolCalls.length=0;await whatsappContext(f.env,'a');assert.deepEqual(f.toolCalls,['get_runner_profile']);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM coach_messages').get()!.n,0);
});
test('Refresh is claimed once; revocation and expired grants fail closed',async()=>{
 const f=setup();try{await authorize(f);f.db.prepare('UPDATE whatsapp_oauth_grants SET access_expires=0').run();
  await Promise.allSettled([validateGrant(f.env,'a'),validateGrant(f.env,'a')]);assert.equal(f.refreshes(),1);await validateGrant(f.env,'a');
  f.deny();await assert.rejects(whatsappContext(f.env,'a'));
  await revokeGrant(f.env,'a');assert.equal(await hasGrant(f.env,'a'),false);await assert.rejects(validateGrant(f.env,'a'));
 }finally{f.db.close();}
});
test('Live-account reply reads the full plan, stays read-only, and rechecks authorization before sending',async(t)=>{
 const f=setup();t.after(()=>f.db.close());await authorize(f);
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 const time=Math.floor(Date.now()/1000);
 f.db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify({source:'production_account',private:'stale-do-not-use'}),'a');
 f.db.prepare('INSERT INTO whatsapp_links(session_id,generation,token_expires,address,last_inbound,consent_at) VALUES (?,?,?,?,?,?)').run('a','g',0,'whatsapp:+14155550111',time,time);
 const enqueue=(sid:string)=>f.db.prepare('INSERT INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').run(sid,'a','g','What is my plan?',time);
 Object.assign(f.env,{OPENAI_API_KEY:'test',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'test',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550100'});
 let aiCalls=0,sends=0;const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/Indicators/Typing.json'))return Response.json({success:true});
  if(String(url).startsWith('https://api.openai.com/')){
   const body=JSON.parse(String(init?.body));assert.ok(!JSON.stringify(body).includes('stale-do-not-use'));assert.ok(!JSON.stringify(body).includes('private-access'));
   assert.deepEqual(body.tools.map((x:{name:string})=>x.name),['prepare_whatsapp_reminder','list_whatsapp_reminders','prepare_whatsapp_reminder_cancellation']);assert.equal(body.tool_choice,'auto');aiCalls++;
   assert.ok(JSON.stringify(body).includes('Race day'));
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Your plan includes race day in week 18.'}]}]});
  }
  sends++;return Response.json({sid:'SM'+'a'.repeat(32)});
 };
 enqueue('first');await processWhatsApp(f.env,'a');assert.equal(sends,1);assert.equal(aiCalls,1);
 globalThis.fetch=async(url)=>{if(String(url).includes('/Indicators/Typing.json'))return Response.json({success:true});assert.ok(String(url).includes('openai.com'));f.deny();return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Must not be delivered after revocation'}]}]});};
 enqueue('second');await processWhatsApp(f.env,'a');assert.equal(f.db.prepare('SELECT status FROM whatsapp_inbox WHERE sid=?').get('second')!.status,'failed');
 await disconnectWhatsApp(f.env,'a');assert.equal(await hasGrant(f.env,'a'),false);
});
