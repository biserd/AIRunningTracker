import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationWeatherCity,type ConversationTurn} from '../worker/weather-conversation';
import {whatsappText} from '../worker/whatsapp-text';
import {createCoachKnowledge} from '../worker/coach-knowledge';
import {whatsappCoach} from '../worker/whatsapp-coach';
import {seed,type State} from '../shared/coach';

const seconds=()=>Math.floor(Date.now()/1000);
const turn=(role:string,content:string,age=0):ConversationTurn=>({role,content,created_at:seconds()-age});
const conversation=()=>[turn('user','What’s the weather in NYc'),turn('assistant','For NYC today, rain is forecast.')];
const env={OPENAI_API_KEY:'synthetic'} as Env;
const state:State={...seed(),source:'production_account',timezone:'UTC'};
const date=(offset=0)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const provider=(url='https://forecast.weather.gov/',text='Rain is forecast tomorrow.')=>Response.json({status:'completed',output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text,annotations:[{type:'url_citation',url,title:'Forecast'}]}]}]});
const lookup=(message:string,history=conversation())=>createCoachKnowledge(env,state,{message,history,signal:AbortSignal.timeout(5000),weatherProfile:async()=>{throw new Error('must not read saved location');}});

test('weather conversation resolves follow-ups and a newer explicit city',()=>{
  for(const question of ['Will it rain tomorrow?','And tomorrow?','What about 7am?','What about the wind?'])
    assert.equal(conversationWeatherCity(question,conversation()),'NYc');
  assert.equal(conversationWeatherCity('Weather in Boston tomorrow?',conversation()),'Boston');
  assert.equal(conversationWeatherCity('Will it rain tomorrow?',[...conversation(),turn('user','Actually Boston'),turn('assistant','For Boston today…')]),'Boston');
  assert.equal(conversationWeatherCity('Will it rain tomorrow?',[turn('assistant','Which city should I check?'),turn('user','London'),turn('assistant','For London today…')]),'London');
});

test('weather memory is recent, caller-scoped user evidence, not assistant guesses or unrelated history',()=>{
  const question='Will it rain tomorrow?';
  for(const history of [[],[turn('assistant','Weather in NYC')],[turn('user','My last run was in NYC')],[turn('user','Weather in NYC',7201)], [{role:'user',content:'Weather in NYC'}], [...conversation(),turn('user','Compare my running shoes')]])
    assert.equal(conversationWeatherCity(question,history),undefined);
  assert.equal(conversationWeatherCity('Weather in Boston or NYC?',conversation()),undefined);
  assert.equal(conversationWeatherCity('Compare my shoes',conversation()),undefined);
  assert.equal(conversationWeatherCity(question,[turn('user','Weather in NYC',-120)]),undefined);
});

test('weather lookup accepts recent city with explicit or null arguments, not a stale or different city',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    calls++;const body=JSON.parse(String(init.body));
    assert.match(body.input,new RegExp(`New York City ${date(1)}`));
    assert.doesNotMatch(body.input,/user|last run|assistant/);
    return provider();
  });
  for(const location of ['New York City',null]) {
    const result=await lookup('Will it rain tomorrow?').run('get_running_weather',{date:date(1),location}) as {available:boolean;location:string};
    assert.equal(result.available,true);assert.equal(result.location,'New York City');
  }
  for(const tool of [lookup('Weather in Boston tomorrow?'),lookup('Will it rain tomorrow?',[turn('user','Weather in NYC',7201)]),lookup('Will it rain tomorrow?',[turn('assistant','Weather in NYC')])]) {
    assert.equal((await tool.run('get_running_weather',{date:date(1),location:'New York City'}) as {available:boolean}).available,false);
  }
  assert.equal(calls,2);
});

test('weather rejects unofficial citations, unsupported alerts and general-search bypasses',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return provider('https://www.reddit.com/r/RunNYC/');});
  const args={date:date(),location:'NYC'};
  assert.equal((await lookup('Weather in NYC').run('get_running_weather',args) as {available:boolean}).available,false);
  t.mock.method(globalThis,'fetch',async()=>{calls++;return provider('https://forecast.weather.gov/','Coastal flooding warning until 5pm.');});
  assert.equal((await lookup('Weather in NYC').run('get_running_weather',args) as {available:boolean}).available,false);
  assert.equal((await lookup('Weather in NYC').run('research_running_web',{query:'NYC weather forecast'}) as {available:boolean}).available,false);
  assert.equal(calls,2);
});

test('WhatsApp presentation removes malformed Markdown and citation blocks, but preserves ordinary action links',()=>{
  const ugly='For *NYC tomorrow*, **rain** is likely at **7am*.\n\nSources: Weather Underground\n\nSources:\nhttps://example.com/forecast';
  assert.equal(whatsappText(ugly,true),'For NYC tomorrow, rain is likely at 7am.');
  assert.equal(whatsappText('Rain [1].\nhttps://weather.gov/',true),'Rain.');
  assert.equal(whatsappText('Open Settings: https://new.aitracker.run/preview'), 'Open Settings: https://new.aitracker.run/preview');
  assert.ok(whatsappText('a'.repeat(2000)).length<=1400);
});

test('WhatsApp follow-up calls the new date with recent city and gives a clean coaching reply',async t=>{
  let step=0;
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    const body=JSON.parse(String(init.body));step++;
    if(step===1){
      assert.match(body.input[0].content,/conversationWeatherCity/);
      assert.ok(body.input.every((item:Record<string,unknown>)=>!('created_at' in item)));
      return Response.json({status:'completed',output:[{type:'function_call',name:'get_running_weather',arguments:JSON.stringify({date:date(1),location:null}),call_id:'weather'}]});
    }
    if(step===2){assert.match(body.input,new RegExp(`New York City ${date(1)}`));return provider();}
    const facts=JSON.parse(body.input.find((item:{type?:string})=>item.type==='function_call_output').output);
    assert.equal(facts.available,true);assert.equal(facts.alertsChecked,false);
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'For **NYC tomorrow**, rain is likely. Keep your easy run relaxed.\n\nSources:\nhttps://weather.gov/'}]}]});
  });
  const question='Will it rain tomorrow?';
  const reply=await whatsappCoach('synthetic',state,conversation(),question,AbortSignal.timeout(5000),undefined,undefined,lookup(question));
  assert.equal(step,3);assert.equal(reply,'For NYC tomorrow, rain is likely. Keep your easy run relaxed.');
});
