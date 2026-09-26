import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoachKnowledge } from '../worker/coach-knowledge';
import { knowledgeInstructions } from '../worker/knowledge-tools';
import { seed } from '../shared/coach';

test('named shoe lookup retains evidence, nulls and actual API spec names',async()=>{
  const state=seed();
  const tools=createCoachKnowledge({} as Env,state,{message:'Compare ASICS SUPERBLAST 3',signal:AbortSignal.timeout(1000),shoes:async params=>{
    assert.equal(params.get('q'),'asics superblast 3'); assert.equal(params.get('sort'),'verified');
    return [{brand:'ASICS',model:'SUPERBLAST 2'}, {brand:'ASICS',model:'SUPERBLAST 3',weight:8.1,heelToToeDrop:8,heelStackHeight:46,forefootStackHeight:38,comfortRating:null,dataSource:'running_warehouse',sourceUrl:'https://www.runningwarehouse.com/ASICS_SUPERBLAST_3/descpage-AS3SB2.html',lastVerified:'2026-09-26T00:00:00.000Z',privateField:'must not reach model'}];
  }});
  const result=await tools.run('search_running_shoes',{query:'ASICS SUPERBLAST 3'}) as any;
  assert.equal(result.count,1); assert.equal(result.shoes[0].comfortRating,null);
  assert.equal(result.shoes[0].heelToToeDrop,8); assert.equal(result.units.weight,'oz');
  assert.equal(result.units.price,'USD'); assert.equal(result.shoes[0].privateField,undefined);
  assert.equal(result.sources[0].url,result.shoes[0].sourceUrl);
  assert.match(knowledgeInstructions,/Running Warehouse/);
});

test('upcoming catalog lookup tells every shared channel not to infer stock or missing specs',async()=>{
  const tools=createCoachKnowledge({} as Env,seed(),{message:'Nike Alphafly 4',signal:AbortSignal.timeout(1000),shoes:async()=>[
    {brand:'Nike',model:'Alphafly 4',weight:null,availability:'upcoming',availableFrom:'2026-10-29'}
  ]});
  const result=await tools.run('search_running_shoes',{query:'Nike Alphafly 4'}) as any;
  assert.equal(result.shoes[0].weight,null);
  assert.equal(result.shoes[0].availability,'upcoming');
  assert.equal(result.shoes[0].availableFrom,'2026-10-29');
  assert.match(result.source,/Upcoming shoes are not available purchase recommendations/);
});
