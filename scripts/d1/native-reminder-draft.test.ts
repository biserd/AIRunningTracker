import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
process.env.OPENAI_API_KEY='test-only';
const result=await build({entryPoints:['server/services/nativeReminderDraft.ts'],bundle:true,platform:'node',format:'esm',write:false,packages:'external',plugins:[{name:'isolated-reminder',setup(b){
 b.onResolve({filter:/\/(storage|applePush|coachExperience)$/},args=>({path:args.path.split('/').pop()!,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='storage'?`export const storage={getUser:async id=>({id,subscriptionPlan:'premium',subscriptionStatus:'active'})}`:args.path==='applePush'?`export async function applePushService(){return {reminders:async user=>[{id:'owned-'+user,title:'Easy run',due_at:Math.floor(Date.now()/1000)+3600}]}}`:`export async function coachExperience(){return {runner:{timezone:'America/New_York'},state:{days:[]}}}`,loader:'js'}));
}}]});
// Node crypto remains an explicit builtin; all network is replaced below.
const service=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
let draft:any;
globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
const expiry=()=>Math.floor(Date.now()/1000)+86400;
test('creates a proposal only, with server-derived timezone and bounded date',async()=>{
 draft={kind:'create',title:'Easy run',dueUTC:new Date(Date.now()+3600000).toISOString(),reminderId:'',message:''};
 const value=await service.nativeReminderDraft(1,{message:'Remind me in one hour'},expiry());
 assert.equal(value.reminderProposal.appleOnly,true);assert.equal(value.reminderProposal.timezone,'America/New_York');assert.match(value.message,/Nothing changes/);
 draft.dueUTC=new Date(Date.now()+10*86400000).toISOString();
 await assert.rejects(service.nativeReminderDraft(1,{message:'Remind me later'},expiry()),/seven days/);
});
test('cancellation cannot select another runners reminder',async()=>{
 draft={kind:'cancel',title:'',dueUTC:'',reminderId:'owned-2',message:''};
 await assert.rejects(service.nativeReminderDraft(1,{message:'Cancel my reminder'},expiry()),/no longer/);
 draft.reminderId='owned-1';const value=await service.nativeReminderDraft(1,{message:'Cancel my reminder'},expiry());
 assert.equal(value.reminderProposal.id,'owned-1');assert.equal(value.reminderProposal.kind,'cancel');
});
test('unrelated follow-up returns to normal coach, ambiguity produces no proposal',async()=>{
 draft={kind:'unrelated',title:'',dueUTC:'',reminderId:'',message:''};
 assert.equal((await service.nativeReminderDraft(2,{message:'How was my run?'},expiry())).handled,false);
 draft.kind='clarify';draft.message='What time tomorrow?';
 const value=await service.nativeReminderDraft(2,{message:'Remind me tomorrow'},expiry());
 assert.equal(value.reminderProposal,null);assert.equal(value.message,'What time tomorrow?');
});
