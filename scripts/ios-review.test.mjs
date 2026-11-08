import test from 'node:test';
import assert from 'node:assert/strict';
import {auditReview,submitReview,appID,submissionID,buildID} from './ios-review.mjs';

function fixture({selectedBuild=buildID,state='UNRESOLVED_ISSUES'}={}) {
 const calls=[];let submitted=false;
 const api=async(method,path,body)=>{
  calls.push({method,path,body});
  if(method==='PATCH'){submitted=true;return {data:{}};}
  if(path==='/v1/apps/'+appID)return {data:{attributes:{bundleId:'run.aitracker.coach'}}};
  if(path==='/v1/reviewSubmissions/'+submissionID+'?include=app')return {data:{attributes:{state},relationships:{app:{data:{id:appID}}}}};
  if(path==='/v1/reviewSubmissions/'+submissionID)return {data:{attributes:{state:submitted?'WAITING_FOR_REVIEW':state}}};
  if(path==='/v1/reviewSubmissions/'+submissionID+'/items?limit=200&include=appStoreVersion,subscriptionVersion,subscriptionGroupVersion')return {data:['appStoreVersion','subscriptionVersion','subscriptionVersion','subscriptionGroupVersion'].map((type,index)=>({attributes:{state:'READY_FOR_REVIEW'},relationships:{[type]:{data:{id:index===0?'version':'item'+index}}}}))};
  if(path.includes('/appStoreVersions?'))return {data:[{id:'version'}]};
  if(path.endsWith('/build'))return {data:{id:selectedBuild,attributes:{version:'41',processingState:'VALID'}}};
  if(path.endsWith('/appStoreReviewDetail'))return {data:{attributes:{demoAccountRequired:true,demoAccountName:'app-review-purchase@review.aitracker.invalid',demoAccountPassword:'private-fixture-password-never-log',notes:'private fixture notes'}}};
  if(path.includes('/appStoreVersionLocalizations?'))return {data:[{attributes:{locale:'en-US',description:'Terms: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',supportUrl:'https://aitracker.run/contact'}}]};
  throw Error('Unexpected path '+path);
 };
 return {api,calls};
}
const evidence={iphoneSignup:true,ipadSignup:true,sandboxPurchase:true,restore:true,expiry:true};

test('audit is read-only and never returns private reviewer credentials or notes',async()=>{
 const {api,calls}=fixture();const report=await auditReview(api);
 assert.equal(report.build,'41');assert.ok(calls.every(call=>call.method==='GET'));
 assert.doesNotMatch(JSON.stringify(report),/private-fixture|demoAccountPassword|private fixture notes/);
});
test('submission fails before accessing Apple until every physical-device check is confirmed',async()=>{
 for(const missing of Object.keys(evidence)) {
  const {api,calls}=fixture();await assert.rejects(submitReview(api,{...evidence,[missing]:false}),/Device verification still pending/);assert.equal(calls.length,0);
 }
});
test('submission rejects a replaced binary without modifying Apple',async()=>{
 const {api,calls}=fixture({selectedBuild:'other-build'});await assert.rejects(submitReview(api,evidence),/Selected binary/);assert.ok(calls.every(call=>call.method==='GET'));
});
test('submission uses the existing review exactly once after all checks pass',async()=>{
 const {api,calls}=fixture();const result=await submitReview(api,evidence);
 assert.equal(result.submissionState,'WAITING_FOR_REVIEW');const writes=calls.filter(call=>call.method==='PATCH');assert.equal(writes.length,1);
 assert.deepEqual(writes[0].body,{data:{type:'reviewSubmissions',id:submissionID,attributes:{submitted:true}}});
});
test('submission never retries a mutation with an uncertain outcome',async()=>{
 const {api,calls}=fixture();let writes=0;
 await assert.rejects(submitReview(async(...args)=>{if(args[0]==='PATCH'){writes++;throw Error('timeout');}return api(...args);},evidence),/timeout/);
 assert.equal(writes,1);assert.ok(calls.every(call=>call.method==='GET'));
});
