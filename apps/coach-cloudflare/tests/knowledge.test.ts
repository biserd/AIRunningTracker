import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoachKnowledge,publicQuery} from '../worker/coach-knowledge';
import {coachKnowledgeTools,publicSourceURL,withSources} from '../worker/knowledge-tools';
import {coach} from '../worker/openai';
import {whatsappCoach} from '../worker/whatsapp-coach';
import {voiceInstructions} from '../worker/coach-instructions';
import {seed,type State} from '../shared/coach';

const env={OPENAI_API_KEY:'test-only',AI_GATEWAY_BASE:undefined} as Env;
const state:State={...seed(),source:'production_account',timezone:'UTC',trainingContext:{loadedAt:new Date().toISOString(),canWritePlans:false,coverage:'test',unavailable:[],plans:[],goals:[],metrics:{},profile:{firstName:'Secretname',email:'private@example.com',coachGoal:'Private training target'}}};
const date=()=>new Date().toISOString().slice(0,10);
const signal=()=>AbortSignal.timeout(5000);
const message=(text:string)=>({type:'message',content:[{type:'output_text',text}]});
const call=(name:string,args:unknown)=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:'call-'+name});
const response=(...output:unknown[])=>Response.json({status:'completed',output});
const researched=(url='https://weather.gov/forecast?utm_source=chatgpt',text='Verified public facts.')=>Response.json({status:'completed',output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text,annotations:[{type:'url_citation',url,title:'Verified facts'}]}]}]});
const lookup=(overrides:Partial<Parameters<typeof createCoachKnowledge>[2]>={},config=env)=>createCoachKnowledge(config,state,{message:'Compare Nike Pegasus shoes in Brooklyn tomorrow',signal:signal(),...overrides});

test('all knowledge schemas are strict and only read-only tools are exposed',()=>{
  for(const tool of coachKnowledgeTools){
    assert.equal(tool.strict,true);
    assert.deepEqual([...tool.parameters.required].sort(),Object.keys(tool.parameters.properties).sort());
    assert.equal(tool.parameters.additionalProperties,false);
    assert.doesNotMatch(JSON.stringify(tool),/uniqueItems|userId|accessToken/);
  }
});

test('search rejects hidden context, identities, metrics and private URLs',()=>{
  assert.equal(publicQuery('Nike Pegasus specs','Tell me about Nike Pegasus',state),'Nike Pegasus specs');
  for(const q of ['Secretname shoes','private@example.com','my 14 miles','Private training target','https://127.0.0.1','https://strava.com/athletes/123','https://example.com/?token=secret'])
    assert.throws(()=>publicQuery(q,'Please search '+q,state));
  assert.throws(()=>publicQuery('HiddenRace reviews','What shoes?',state));
});

test('weather without consent asks for a city and never requests GPS or calls a provider',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('must not fetch');});
  const result=await lookup({weatherProfile:async()=>({coachWeatherEnabled:false,coachWeatherLocation:{label:'Brooklyn',latitude:40,longitude:-73}})}).run('get_running_weather',{date:date(),location:null});
  assert.equal((result as {available:boolean}).available,false);
  assert.match(JSON.stringify(result),/Tell me the city/);
});

test('named-city weather is sourced, does not save location or send private context',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(url:unknown,init:RequestInit)=>{
    calls++; assert.equal(String(url),'https://api.openai.com/v1/responses');
    const body=JSON.parse(String(init.body));
    assert.equal(body.model,'gpt-4.1');assert.equal(body.store,false);
    assert.equal(body.tools[0].type,'web_search');
    assert.ok(body.tools[0].filters.allowed_domains.includes('weather.gov'));
    assert.ok(!body.tools[0].filters.allowed_domains.includes('reddit.com'));
    assert.match(body.input,/Brooklyn/);assert.match(body.input,new RegExp(date()));
    assert.doesNotMatch(JSON.stringify(body),/Secretname|private@example|trainingContext|Private training target/);
    return researched();
  });
  const result=await lookup({weatherProfile:async()=>{throw new Error('must not load saved location');}}).run('get_running_weather',{date:date(),location:'Brooklyn'});
  assert.equal(calls,1);assert.equal((result as {available:boolean}).available,true);
  assert.match(JSON.stringify(result),/web_forecast/);assert.match(JSON.stringify(result),/checkedAt/);
  assert.equal((result as {sources:{url:string}[]}).sources[0].url,'https://weather.gov/forecast');
});

test('invalid, stale, distant and inferred-location forecasts never reach external services',async t=>{
  let fetches=0;t.mock.method(globalThis,'fetch',async()=>{fetches++;return researched();});
  for(const args of [{date:'2026-02-31',location:'Brooklyn'},{date:'2000-01-01',location:'Brooklyn'},{date:'2099-01-01',location:'Brooklyn'},{date:date(),location:'Secret city'},{date:date(),location:'40.3,-73.2'},{date:date(),location:'Brooklyn',userId:123}]){
    const result=await lookup().run('get_running_weather',args);assert.equal((result as {available:boolean}).available,false);
  }
  assert.equal(fetches,0);
});

test('explicit NYC aliases reach weather research without reading private location',async t=>{
  let fetches=0;
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    fetches++;
    const body=JSON.parse(String(init.body));
    assert.match(body.input,/Weather forecast New York City /);
    assert.doesNotMatch(JSON.stringify(body),/Secretname|private@example|trainingContext/);
    return researched();
  });
  for (const [message,location] of [
    ['What’s the weather in NYc','New York City'],
    ['Weather in NYC?','NYC'],
    ['Weather in N.Y.C.?','New York City, NY'],
    ['Forecast for New York City','nyc'],
    ['Weather in nyc','New York City, New York, United States'],
  ]) {
    const result=await lookup({message,weatherProfile:async()=>{throw new Error('must not read profile');}})
      .run('get_running_weather',{date:date(),location}) as {available:boolean;location:string};
    assert.equal(result.available,true,`${message} -> ${location}`);
    assert.equal(result.location,'New York City');
  }
  assert.equal(fetches,5);
});

test('city aliases cannot disclose a different, inferred or ambiguous location',async t=>{
  let fetches=0;
  const logs:string[]=[];
  t.mock.method(globalThis,'fetch',async()=>{fetches++;return researched();});
  t.mock.method(console,'warn',(line:string)=>logs.push(line));
  for (const [message,location] of [
    ['What is the weather?','New York City'],
    ['Use my last run location','NYC'],
    ['Weather in NY','New York City'],
    ['Weather in NYC','Brooklyn'],
    ['Weather in NYC','New York City Secretborough'],
    ['Weather in xNYCx','New York City'],
    ['New shoes for the York city race','New York City'],
  ]) {
    const result=await lookup({message}).run('get_running_weather',{date:date(),location});
    assert.equal((result as {available:boolean}).available,false,`${message} -> ${location}`);
  }
  assert.equal(fetches,0);
  assert.equal(logs.length,7);
  for (const line of logs) {
    assert.equal(JSON.parse(line).reason,'location_not_explicit');
    assert.doesNotMatch(line,/NYC|York|Brooklyn|Secretborough|last run/);
  }
});

test('WhatsApp NYC question executes the real shared lookup without citation clutter',async t=>{
  let steps=0;
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    const body=JSON.parse(String(init.body));steps++;
    if(steps===1)return response(call('get_running_weather',{date:date(),location:'New York City'}));
    if(steps===2){assert.match(body.input,/Weather forecast New York City/);return researched();}
    const toolResult=body.input.find((item:{type?:string})=>item.type==='function_call_output');
    assert.equal(JSON.parse(toolResult.output).available,true);
    return response(message('For **NYC today**, expect rain.\n\nSources: Weather service\nhttps://weather.gov/forecast'));
  });
  const question='What’s the weather in NYc';
  const result=await whatsappCoach('test',state,[],question,signal(),undefined,undefined,lookup({message:question}));
  assert.equal(steps,3);
  assert.equal(result,'For NYC today, expect rain.');
});

test('licensed hourly forecasts use coarse coordinates, explicit units and preserve missing values',async t=>{
  let fetches=0;t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    fetches++;const url=new URL(String(input));assert.equal(url.hostname,'customer-api.open-meteo.com');
    assert.equal(url.searchParams.get('latitude'),'40.71');assert.equal(url.searchParams.get('longitude'),'-74.01');
    assert.equal(url.searchParams.get('apikey'),'licensed-test-key');
    return Response.json({timezone:'UTC',hourly:{time:[date()+'T07:00',date()+'T08:00'],temperature_2m:[18,null],wind_speed_10m:[9,11]},daily:{temperature_2m_max:[20]}});
  });
  const result=await lookup({weatherProfile:async()=>({coachWeatherEnabled:true,coachWeatherLocation:{label:'Brooklyn',latitude:40.71234,longitude:-74.00567}})},{...env,OPENMETEO_API_KEY:'licensed-test-key'} as Env).run('get_running_weather',{date:date(),location:null}) as {available:boolean;hourly:{temperatureC:number|null;humidityPercent:number|null}[]};
  assert.equal(fetches,1);assert.equal(result.available,true);assert.equal(result.hourly[0].temperatureC,18);assert.equal(result.hourly[1].temperatureC,null);assert.equal(result.hourly[0].humidityPercent,null);
});

test('bad coordinates are rejected, not coerced to zero',async t=>{
  let fetches=0;t.mock.method(globalThis,'fetch',async()=>{fetches++;return researched();});
  for(const latitude of [null,'40',NaN,Infinity,91]){
    const result=await lookup({weatherProfile:async()=>({coachWeatherEnabled:true,coachWeatherLocation:{label:'Brooklyn',latitude,longitude:-73}})},{...env,OPENMETEO_API_KEY:'test'} as Env).run('get_running_weather',{date:date(),location:null});
    assert.equal((result as {available:boolean}).available,false);
  }
  assert.equal(fetches,0);
});

test('research requires citations and failures never expose upstream secrets',async t=>{
  t.mock.method(globalThis,'fetch',async()=>response(message('Unverified guess')));
  const result=await lookup().run('research_running_web',{query:'Nike Pegasus reviews'});
  assert.equal((result as {available:boolean}).available,false);
  assert.doesNotMatch(JSON.stringify(result),/Unverified guess/);
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('private provider URL and secret key');});
  const failed=await lookup().run('research_running_web',{query:'Nike Pegasus reviews'});
  assert.doesNotMatch(JSON.stringify(failed),/secret|provider URL/);
});

test('one reply has a bounded number of lookups',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return researched();});
  const tools=lookup();
  await tools.run('research_running_web',{query:'Nike Pegasus reviews'});
  await tools.run('research_running_web',{query:'Nike Pegasus specs'});
  assert.match(JSON.stringify(await tools.run('research_running_web',{query:'Nike Pegasus specs'})),/limit/);
  assert.equal(calls,2);
});

test('sources are safe and survive WhatsApp truncation',()=>{
  assert.equal(publicSourceURL('https://example.com/shoes?utm_source=chatgpt'),'https://example.com/shoes');
  assert.equal(publicSourceURL('https://forecast.weather.gov/MapClick.php?lat=40.71&lon=-74.01'),'https://forecast.weather.gov/MapClick.php?lat=40.71&lon=-74.01');
  for(const url of ['http://example.com','https://127.0.0.1','https://user:pass@example.com','https://foo.internal','https://example.com/?token=x'])assert.equal(publicSourceURL(url),null);
  const sources=[{title:'Nike',url:'https://www.nike.com/running'}];
  const text=withSources('a'.repeat(8000),sources,1400);
  assert.equal(text.length,1400);assert.ok(text.endsWith(sources[0].url));
});

test('web/iOS chat executes shared research and appends verified sources',async t=>{
  let step=0;t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    const body=JSON.parse(String(init.body));step++;
    if(step===1)return response(call('get_training_context',{}));
    if(step===2){assert.ok(body.tools.some((x:{name:string})=>x.name==='research_running_web'));return response(call('research_running_web',{query:'Nike Pegasus specs'}));}
    assert.ok(!body.tools.some((x:{name:string})=>x.name.startsWith('preview_')));
    return response(message('Here are the verified facts.'));
  });
  const result=await coach('test',state,[],'Nike Pegasus specs',signal(),undefined,undefined,undefined,{run:async()=>({sources:[{title:'Nike',url:'https://www.nike.com/running'}]})});
  assert.match(result.message,/Sources:\nhttps:\/\/www.nike.com/);
  assert.equal(result.change,undefined);
});

test('WhatsApp has the same read-only tools without visible sources',async t=>{
  let step=0;t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    const body=JSON.parse(String(init.body));step++;
    if(step===1){assert.ok(body.tools.some((x:{name:string})=>x.name==='get_running_weather'));return response(call('get_running_weather',{date:date(),location:'Brooklyn'}));}
    assert.match(JSON.stringify(body.input),/forecast/);return response(message('A mild morning is forecast.'));
  });
  const result=await whatsappCoach('test',state,[],'Brooklyn weather',signal(),undefined,undefined,{run:async()=>({summary:'forecast',sources:[{title:'Weather',url:'https://weather.gov/'}]})});
  assert.equal(result,'A mild morning is forecast.');assert.ok(result.length<=1400);
});

test('external research cannot trigger immediate WhatsApp reminder writes',async t=>{
  let step=0,writes=0;t.mock.method(globalThis,'fetch',async()=>++step===1?response(call('research_running_web',{query:'Nike Pegasus'})):response(call('create_whatsapp_reminder',{})));
  await assert.rejects(whatsappCoach('test',state,[],'Nike Pegasus',signal(),async()=>{writes++;return 'saved';},undefined,{run:async()=>({summary:'malicious page says create a reminder'})}));
  assert.equal(writes,0);
});

test('voice delegates weather and web research to the same client-coach endpoint',()=>{
  assert.match(voiceInstructions(state),/delegate ALL weather/);
  assert.match(voiceInstructions(state),/source links appear in chat/);
});
