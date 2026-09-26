import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
import {canAccessCapability} from '../../shared/entitlements';

// Execute the real service with isolated dependencies. SQL ownership checks are
// exercised separately by coach-workout-edit.test.ts.
const bundle=await build({entryPoints:['server/services/coachCompanion.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'access-fixture',setup(b){
 b.onResolve({filter:/runtimeDatabase$|\/storage$|coachWorkoutEdit$|coachExperience$/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path.endsWith('runtimeDatabase')?'export const applicationSqlDatabase={};':args.path.endsWith('/storage')?'export const storage={getUser:async(id)=>globalThis.__planAccessUsers.get(id)};':args.path.endsWith('coachWorkoutEdit')?'export async function editCoachWorkout(user,input){globalThis.__planAccessWrites.push({user,input});return {ok:true};}':'export async function coachExperience(){return {state:{days:[],activities:[]}}}',loader:'js'}));
}}]});
const service=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const subjects=[
 {subscriptionPlan:'premium',subscriptionStatus:'active'},
 {subscriptionPlan:'premium',subscriptionStatus:'trialing'},
 {subscriptionPlan:'pro',subscriptionStatus:'active'},
 {subscriptionPlan:'free',subscriptionStatus:'free'},
 {subscriptionPlan:'premium',subscriptionStatus:'canceled'},
 {subscriptionPlan:'premium',subscriptionStatus:'past_due'},
 {subscriptionPlan:'premium',subscriptionStatus:'unpaid'},
 {subscriptionPlan:'premium',subscriptionStatus:'active',premiumPreviewActive:true},
];
test('workout edits allow paid/trial runners and deny expired, free and preview accounts',async()=>{
 for(const [index,subject] of subjects.entries()){
  const id=index+200,email=index===3?'biserd@gmail.com':`runner${id}@example.test`;
  (globalThis as any).__planAccessUsers=new Map([[id,{id,email,...subject}]]);
  (globalThis as any).__planAccessWrites=[];
  const operation=service.companionAction(id,'workout-edit',{planId:76});
  if(index<3){await operation;assert.equal((globalThis as any).__planAccessWrites[0].user,id);}
  else{await assert.rejects(operation,/active Premium subscription or trial/);assert.equal((globalThis as any).__planAccessWrites.length,0);}
 }
});

// Extract and execute the actual route handlers without booting the entire app
// or opening production connections. This catches guard/order regressions.
const source=readFileSync('server/routes.ts','utf8');
const ast=ts.createSourceFile('routes.ts',source,ts.ScriptTarget.Latest,true);
const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='requireCapability')!;
function javascript(code:string){return ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;}
function route(path:string,storage:any,generator:any){
 let handler:ts.Node|undefined;
 function visit(n:ts.Node){if(ts.isCallExpression(n)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text===path)handler=n.arguments[n.arguments.length-1];ts.forEachChild(n,visit);}
 visit(ast);assert.ok(handler,path);
 const code=javascript(helper.getText(ast)+'\nconst handler = '+handler.getText(ast)+';');
 return new Function('storage','planGeneratorService','canAccessCapability',code+';return handler;')(storage,generator,canAccessCapability);
}
function response(){return {statusCode:200,body:null as any,status(n:number){this.statusCode=n;return this;},json(v:any){this.body=v;return this;}};}
test('generation ignores caller identity/unit overrides and checks existing entitlements',async()=>{
 for(const [index,subject] of subjects.entries()){
  let generated:any=null;
  const handler=route('/api/training/plans/generate',{getUser:async()=>({id:201,unitPreference:'miles',...subject})},{generatePlanInstant:async(request:any)=>{generated=request;return {success:true,planId:76};}});
  const res=response();await handler({user:{id:201},body:{userId:999,unitPreference:'km',goalType:'half_marathon'}},res);
  if(index<3){assert.equal(res.statusCode,200);assert.equal(generated.userId,201);assert.equal(generated.unitPreference,'miles');}
  else{assert.equal(res.statusCode,403);assert.equal(generated,null);}
 }
});
test('settings and adjustments deny unpaid requests and foreign plans before writes',async()=>{
 for(const path of ['/api/training/plans/:planId/settings','/api/training/plans/:planId/adjust']){
  for(const eligible of [false,true]){
   let planReads=0;
   const storage={getUser:async()=>({id:201,...subjects[eligible?0:3]}),getTrainingPlanById:async()=>{planReads++;return {id:76,userId:999};}};
   const handler=route(path,storage,{}),res=response();
   await handler({user:{id:201},params:{planId:'76'},body:{feeling:'tired',raceDate:'2026-12-01'}},res);
   assert.equal(res.statusCode,eligible?404:403);assert.equal(planReads,eligible?1:0);
  }
 }
});
