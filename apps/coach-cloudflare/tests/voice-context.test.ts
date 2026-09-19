import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../shared/coach';
import {voiceBriefing,voiceInstructions} from '../worker/coach-instructions';

test('voice startup stays bounded with full plans, long notes and unicode; full context is unchanged',()=>{
  const state={...seed(),source:'production_account' as const,trainingContext:{
    loadedAt:'2026-09-18T20:00:00Z',canWritePlans:true,coverage:'full',unavailable:[],
    profile:{firstName:'Runner',unitPreference:'miles',coachGoal:'跑'.repeat(10000)},
    plans:Array.from({length:30},(_,id)=>({id,name:'Marathon',status:'active',weeks:Array.from({length:52},()=>({notes:'private long workout details'.repeat(200)}))})),
    goals:[],metrics:{fitness:{notes:'跑'.repeat(10000)}}}};
  const original=JSON.stringify(state);
  const prompt=voiceInstructions(state);
  assert.ok(new TextEncoder().encode(prompt).byteLength<10000);
  assert.ok(new TextEncoder().encode(JSON.stringify(voiceBriefing(state))).byteLength<=6000);
  assert.match(prompt,/Runner/);assert.match(prompt,/Marathon/);assert.match(prompt,/Delegate detailed training/);
  assert.doesNotMatch(prompt,/private long workout details/);
  assert.equal(JSON.stringify(state),original);
});

test('small voice briefing retains current week and recent runs without raw full-plan duplication',()=>{
  const state=seed();const briefing=voiceBriefing(state);
  assert.equal((briefing.currentWeek as unknown[]).length,7);
  assert.equal((briefing.recentRuns as unknown[]).length,10);
});
test('voice receives saved preferences and recent shared conversation within its budget',()=>{
 const state={...seed(),companion:{preferences:{notes:'Long runs on Sundays'},checkins:[{feeling:'tired'}]},recentConversation:[{role:'user',content:'Friday is busy'}]};
 const briefing=voiceBriefing(state);
 assert.equal(briefing.runnerNotes,'Long runs on Sundays');
 assert.match(JSON.stringify(briefing.recentConversation),/Friday is busy/);
 assert.ok(new TextEncoder().encode(JSON.stringify(briefing)).byteLength<=6000);
});
