import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout} from 'node:timers/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from '../../api-cloudflare/node_modules/miniflare/dist/src/index.js';

for(const direct of [false,true])test('Workers runtime signed webhook uses '+(direct?'immediate per-runner alarm with Queue recovery':'Queue fallback')+' without cron', {timeout:30000}, async()=>{
 const bundle=await build({bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers'],stdin:{
  resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'ts',contents:`
   import {whatsappWebhook,consumeWhatsApp} from './worker/whatsapp';
   export {WhatsAppDispatch} from './worker/whatsapp-dispatch';
   export default {async fetch(request,env,ctx){
    if(new URL(request.url).pathname==='/test/wrong-runner'){
     try{await env.WHATSAPP_DISPATCH.getByName('runner').wake('someone-else');return new Response('',{status:500});}catch{return new Response('',{status:403});}
    }
    return whatsappWebhook(request,env,ctx);
   },queue:consumeWhatsApp};`
 }});
 const account='AC'+'a'.repeat(32),secret='synthetic-test',sender='whatsapp:+14155550100';
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'coach',compatibilityDate:'2026-09-14',modules:true,script:bundle.outputFiles[0].text,
   ...(direct?{durableObjects:{WHATSAPP_DISPATCH:{className:'WhatsAppDispatch',useSQLite:true}}}:{}),
   d1Databases:{DB:'test-db'},queueProducers:{WHATSAPP_QUEUE:'test-whatsapp'},queueConsumers:{'test-whatsapp':{maxBatchSize:1,maxBatchTimeout:0,maxRetries:1}},
   bindings:{TWILIO_ACCOUNT_SID:account,TWILIO_AUTH_TOKEN:secret,TWILIO_WHATSAPP_FROM:sender,OPENAI_API_KEY:'synthetic',PUBLIC_ORIGIN:'https://new.aitracker.run'},outboundService:'provider'},
  {name:'provider',compatibilityDate:'2026-09-14',modules:true,d1Databases:{DB:'test-db'},script:`export default {async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname.includes('/Indicators/Typing.json')){
    const body=await request.json();
    return body.channel==='WHATSAPP'&&/^SM[a-f0-9]{32}$/i.test(body.messageId)
     ?Response.json({success:true}):Response.json({code:400},{status:400});
   }
   if(url.hostname==='api.openai.com'){
    const body=await request.json();
    if(body.model!=='gpt-5.6-luna' || body.reasoning.effort!=='low' || body.tools.length || body.tool_choice!=='none' || !body.input[0].content.includes('activityEvidence'))return new Response('',{status:400});
    await env.DB.prepare("INSERT INTO test_calls(kind) VALUES ('ai')").run();
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Keep your next run easy.'}]}]});
   }
   if(url.hostname==='api.twilio.com'){
    await env.DB.prepare("INSERT INTO test_calls(kind) VALUES ('send')").run();
    return Response.json({sid:'SM'+'e'.repeat(32)});
   }
   return new Response('',{status:403});
  }}`},
 ]}));
 try {
  const db=await mf.getD1Database('DB','coach');
  for(const name of ['0001_preview.sql','0002_ai.sql','0003_reminders.sql','0005_whatsapp.sql','0006_whatsapp_oauth.sql','0007_whatsapp_realtime.sql','0008_whatsapp_context.sql','0009_whatsapp_immediate.sql']){
   const sql=readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8').replace(/^--.*$/gm,'');
   for(const statement of sql.split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(statement).run();
  }
  await db.prepare('CREATE TABLE test_calls(kind TEXT)').run();
  const now=Math.floor(Date.now()/1000);
  await db.prepare('INSERT INTO sessions(id,state,expires_at) VALUES (?,?,?)').bind('runner',JSON.stringify({today:'2026-09-14',timezone:'UTC',days:[],activities:[],goal:'Run consistently'}),now+3600).run();
  await db.prepare('INSERT INTO whatsapp_links(session_id,generation,token_expires,address,last_inbound,consent_at) VALUES (?,?,?,?,?,?)').bind('runner','g',0,'whatsapp:+14155550111',now,now).run();
  const sid='SM'+'1'.repeat(32),url='https://new.aitracker.run/api/whatsapp/inbound';
  const form=new URLSearchParams({AccountSid:account,MessageSid:sid,From:'whatsapp:+14155550111',To:sender,Body:'What should I do today?',NumMedia:'0'});
  const signature=createHmac('sha1',secret).update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64');
  const send=()=>mf.dispatchFetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:form.toString()});
  const started=Date.now();assert.equal((await send()).status,200);
  let row;
  while(Date.now()-started<10000){
   row=await db.prepare('SELECT status,body,queue_ms,processing_path,typing_accepted FROM whatsapp_inbox WHERE sid=?').bind(sid).first();
   if(row?.status==='done')break;
   await setTimeout(50);
  }
  assert.equal(row?.status,'done');assert.equal(row.body,'');assert.ok(row.queue_ms<10000);
  assert.equal(row.processing_path,direct?'direct':'queue');assert.ok(row.typing_accepted>=1);
  assert.equal((await send()).status,200);
  if(direct){
   assert.equal((await mf.dispatchFetch('https://new.aitracker.run/test/wrong-runner')).status,403);
   // Let the real delayed recovery message arrive. It must not call AI or send again.
   await setTimeout(16000);
  }
  assert.deepEqual((await db.prepare('SELECT kind,COUNT(*) AS n FROM test_calls GROUP BY kind ORDER BY kind').all()).results,[{kind:'ai',n:1},{kind:'send',n:1}]);
 } finally {await mf.dispose();}
});
