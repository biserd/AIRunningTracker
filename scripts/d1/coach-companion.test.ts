import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2); CREATE TABLE activities(id INTEGER,user_id INTEGER); INSERT INTO activities VALUES(100,1),(200,2);');
sqlite.exec(readFileSync('migrations/20260919_coach_companion.sql','utf8'));
const adapter={prepare(sql:string){let params:any[]=[];const s={bind(...values:any[]){params=values;return s;},async first(){return sqlite.prepare(sql).get(...params)??null;},async all(){return {results:sqlite.prepare(sql).all(...params)};},async run(){return sqlite.prepare(sql).run(...params);}};return s;}};
(globalThis as any).__companionDB=adapter;
(globalThis as any).__companionStorage={getUser:async(id:number)=>({id,coachTimezone:'UTC',subscriptionPlan:'premium',subscriptionStatus:'active'}),getAIInsightsByUserId:async(id:number)=>[{id,title:'Owned '+id,content:'Saved insight',createdAt:'2026-09-19'}]};
const bundle=await build({entryPoints:['server/services/coachCompanion.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolate-test-storage',setup(b){
 b.onResolve({filter:/runtimeDatabase$/},()=>({path:'db',namespace:'mock'}));
 b.onResolve({filter:/\/storage$/},()=>({path:'storage',namespace:'mock'}));
 b.onResolve({filter:/coachExperience$/},()=>({path:'experience',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='db'?'export const applicationSqlDatabase=globalThis.__companionDB':args.path==='storage'?'export const storage=globalThis.__companionStorage':'export async function coachExperience(){return {state:{days:[],activities:[]}}}',loader:'js'}));
}}]});
const service=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('preferences validate and stay private to each runner',async()=>{
 assert.throws(()=>service.validateCompanionPreferences({...service.defaultCompanionPreferences,hour:25}));
 assert.throws(()=>service.validateCompanionPreferences({...service.defaultCompanionPreferences,notes:'x'.repeat(1501)}));
 await service.companionAction(1,'preferences',{...service.defaultCompanionPreferences,notes:'Prefer Sunday long runs'});
 assert.equal((await service.companionContext(1,'2026-09-19')).preferences.notes,'Prefer Sunday long runs');
 assert.equal((await service.companionContext(2,'2026-09-19')).preferences.notes,'');
});
test('check-ins reject another runners activity and upsert without duplicate',async()=>{
 await assert.rejects(service.companionAction(1,'checkin',{feeling:'good',activityId:200}));
 await service.companionAction(1,'checkin',{feeling:'good',activityId:100});
 await service.companionAction(1,'checkin',{feeling:'tired',activityId:100});
 assert.equal((sqlite.prepare('SELECT count(*) AS n FROM coach_companion_checkins').get() as any).n,1);
 assert.equal((sqlite.prepare('SELECT feeling FROM coach_companion_checkins').get() as any).feeling,'tired');
});
test('quiet hours span midnight and local day respects timezone',()=>{
 const p=service.defaultCompanionPreferences;
 assert.equal(service.quiet(p,23),true);assert.equal(service.quiet(p,5),true);assert.equal(service.quiet(p,12),false);
 assert.equal(service.companionLocal(new Date('2026-09-20T01:00:00Z'),'America/New_York').date,'2026-09-19');
});
test('weekly summary uses complete local days and correct distance units',()=>{
 const result=service.weeklyStory([{date:'2026-09-18',km:10},{date:'2026-09-10',km:5},{date:'2026-09-19',km:100}],'2026-09-19','miles');
 assert.match(result,/1 runs and 6.2 mi/);assert.match(result,/3.1 mi more/);assert.doesNotMatch(result,/100/);
});
test('weekly story connects the actual goal and next workout without inventing adherence',()=>{
 const result=service.weeklyStory([{date:'2026-09-18',km:10}],'2026-09-19','km',{goal:'half_marathon',raceDate:'2026-10-19',days:[{date:'2026-09-21',title:'Easy 30 minutes',kind:'easy',completed:false}]});
 assert.match(result,/half marathon, 30 days from race day/);
 assert.match(result,/Easy 30 minutes on 2026-09-21/);
 assert.doesNotMatch(result,/missed workout|completed your plan/);
});
test('follow-up is bounded to yesterday and respects a new check-in',()=>{
 assert.match(service.followupStory([{date:'2026-09-18',feeling:'tired'}],'2026-09-19'),/nothing in your plan has changed/);
 assert.equal(service.followupStory([{date:'2026-09-18',feeling:'sore'},{date:'2026-09-19',feeling:'good'}],'2026-09-19'),null);
 assert.equal(service.followupStory([{date:'2026-09-17',feeling:'sore'}],'2026-09-19'),null);
 assert.equal(service.followupStory([{date:'2026-09-18',feeling:'good'}],'2026-09-19'),null);
 assert.equal(service.validateCompanionPreferences({notes:'',evening:false,weekly:false,hour:18,quietStart:21,quietEnd:7}).followup,false);
 assert.throws(()=>service.validateCompanionPreferences({...service.defaultCompanionPreferences,followup:'yes'}));
});
test('briefings are tenant isolated and deduplicated by date',async()=>{
 await service.companionAction(1,'preferences',{...service.defaultCompanionPreferences,weekly:true});
 await service.buildCompanionBriefings(1,new Date('2026-09-20T18:00:00Z'));
 await service.buildCompanionBriefings(1,new Date('2026-09-20T18:00:00Z'));
 assert.equal((sqlite.prepare('SELECT count(*) AS n FROM coach_companion_briefings WHERE user_id=1').get() as any).n,1);
 assert.equal((await service.companionContext(2,'2026-09-20')).briefings.length,0);
});
