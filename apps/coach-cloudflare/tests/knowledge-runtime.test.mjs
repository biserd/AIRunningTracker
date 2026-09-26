import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from '../../api-cloudflare/node_modules/miniflare/dist/src/index.js';

test('Workers runtime caches public forecasts without caching consent or mixing cities',async()=>{
 const bundle=await build({bundle:true,write:false,format:'esm',platform:'browser',stdin:{
  resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'ts',contents:`
   import {createCoachKnowledge} from './worker/coach-knowledge';
   export default {async fetch(request,env){
    const args=await request.json();
    const state={source:'production_account',timezone:'UTC',today:'2000-01-01',days:[],activities:[],goal:'Private training target'};
    const tools=createCoachKnowledge(env,state,{message:args.message||'Weather in '+(args.city||'Brooklyn'),history:args.history,signal:AbortSignal.timeout(5000),weatherProfile:async()=>({coachWeatherEnabled:args.consent,coachWeatherLocation:{label:args.city||'Brooklyn'}})});
    return Response.json(await tools.run('get_running_weather',{date:args.date||new Date().toISOString().slice(0,10),location:args.named?args.city:null}));
   }};`
 }});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'coach',compatibilityDate:'2026-09-12',modules:true,script:bundle.outputFiles[0].text,bindings:{OPENAI_API_KEY:'synthetic'},outboundService:'provider'},
  {name:'provider',compatibilityDate:'2026-09-12',modules:true,d1Databases:{DB:'calls'},script:`export default {async fetch(request,env){
   if(new URL(request.url).hostname!=='api.openai.com')return new Response('',{status:403});
   const body=await request.json();
   if(typeof body.input!=='string'||JSON.stringify(body).includes('Private training target'))return new Response('',{status:403});
   await env.DB.prepare('INSERT INTO calls(query) VALUES (?)').bind(body.input).run();
   return Response.json({status:'completed',output:[{type:'web_search_call'}, {type:'message',content:[{type:'output_text',text:body.input+' is the checked area.',annotations:[{type:'url_citation',url:'https://weather.gov/',title:'Weather'}]}]}]});
  }}`},
 ]}));
 try{
  const db=await mf.getD1Database('DB','provider');await db.prepare('CREATE TABLE calls(query TEXT)').run();
  const ask=async args=>await(await mf.dispatchFetch('https://new.aitracker.run/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(args)})).json();
  const first=await ask({city:'Brooklyn',named:true});assert.equal(first.available,true);
  const second=await ask({city:'Brooklyn',named:true});assert.equal(second.checkedAt,first.checkedAt);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,1);
  const denied=await ask({city:'Brooklyn',consent:false,message:'What is the weather?'});assert.equal(denied.available,false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,1);
  const other=await ask({city:'London',named:true});assert.equal(other.available,true);assert.match(other.summary,/London/);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,2);
  const saved=await ask({city:'Brooklyn',consent:true,message:'What is the weather?'});assert.equal(saved.available,true);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,2);
  const nyc=await ask({city:'New York City',named:true,message:'What’s the weather in NYc'});
  assert.equal(nyc.available,true);assert.equal(nyc.location,'New York City');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,3);
  const alias=await ask({city:'NYC',named:true,message:'Weather in New York City'});
  assert.equal(alias.checkedAt,nyc.checkedAt);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,3);
  // A cached city must not bypass explicit-location validation on a later request.
  const inferred=await ask({city:'NYC',named:true,message:'Weather at my last run?'});
  assert.equal(inferred.available,false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,3);
  const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const followup=await ask({message:'Will it rain tomorrow?',date:tomorrow,history:[{role:'user',content:'Weather in NYC',created_at:Math.floor(Date.now()/1000)}]});
  assert.equal(followup.available,true);assert.equal(followup.location,'New York City');assert.equal(followup.date,tomorrow);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,4);
  const otherRunner=await ask({message:'Will it rain tomorrow?',date:tomorrow,history:[]});
  assert.equal(otherRunner.available,false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM calls').first()).n,4);
 }finally{await mf.dispose();}
});
