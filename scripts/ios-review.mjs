// Existing App Store Connect credentials stay on the trusted runner; output is allowlisted.
import assert from 'node:assert/strict';
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appleAPI,appIdentifier} from '../apps/ios/scripts/prepare-testflight-signing.mjs';

export const appID='6813680941';
export const submissionID='fa4f3261-bd67-46cf-bcf0-55b6e45041a2';
export const buildID='76111388-62c9-4b47-9fc7-9ddd47ee5c60';
const eula='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export async function auditReview(api) {
 const app=(await api('GET','/v1/apps/'+appID)).data;
 assert.equal(app.attributes.bundleId,appIdentifier,'Unexpected app identifier');
 const submission=(await api('GET','/v1/reviewSubmissions/'+submissionID)).data;
 assert.equal(submission.relationships.app.data.id,appID,'Submission belongs to another app');
 const items=(await api('GET','/v1/reviewSubmissions/'+submissionID+'/items?limit=200')).data;
 assert.equal(items.length,4,'Unexpected review items; inspect before submitting');
 const appItems=items.filter(item=>item.relationships.appStoreVersion?.data);
 assert.equal(appItems.length,1,'Expected exactly one app version');
 assert.equal(items.filter(item=>item.relationships.subscriptionVersion?.data).length,2,'Expected both subscription versions');
 assert.equal(items.filter(item=>item.relationships.subscriptionGroupVersion?.data).length,1,'Expected the Premium subscription group');
 const versionID=appItems[0].relationships.appStoreVersion.data.id;
 const versions=(await api('GET',`/v1/apps/${appID}/appStoreVersions?filter%5Bplatform%5D=IOS&filter%5BversionString%5D=1.0&limit=200`)).data;
 assert.ok(versions.some(version=>version.id===versionID),'App version is not part of the expected app');
 const build=(await api('GET',`/v1/appStoreVersions/${versionID}/build`)).data;
 assert.equal(build.id,buildID,'Selected binary is not the verified build 41');
 assert.equal(build.attributes.version,'41','Wrong build number');
 assert.equal(build.attributes.processingState,'VALID','Apple has not validated build 41');
 const details=(await api('GET',`/v1/appStoreVersions/${versionID}/appStoreReviewDetail`)).data.attributes;
 assert.equal(details.demoAccountRequired,true,'Review sign-in must remain enabled');
 assert.equal(details.demoAccountName,'app-review-purchase@review.aitracker.invalid','Purchase demo must be the primary reviewer account');
 assert.ok(typeof details.demoAccountPassword==='string'&&details.demoAccountPassword.length>=30,'Review credential is missing');
 const localizations=(await api('GET',`/v1/appStoreVersions/${versionID}/appStoreVersionLocalizations?limit=200`)).data;
 const english=localizations.find(value=>value.attributes.locale==='en-US')?.attributes;
 assert.ok(english?.description?.includes(eula),'EULA link is missing from the English description');
 assert.equal(english.supportUrl,'https://aitracker.run/contact','Unexpected support URL');
 const report={appID,submissionID,versionID,build:'41',buildProcessingState:build.attributes.processingState,
   submissionState:submission.attributes.state,itemStates:items.map(item=>item.attributes.state),
   itemCount:items.length,reviewCredentialsPresent:true,eulaPresent:true,checkedAt:new Date().toISOString()};
 return report;
}

export async function submitReview(api,evidence) {
 for(const key of ['iphoneSignup','ipadSignup','sandboxPurchase','restore','expiry']) {
  assert.equal(evidence?.[key],true,'Device verification still pending: '+key);
 }
 const before=await auditReview(api);
 assert.ok(['READY_FOR_REVIEW','UNRESOLVED_ISSUES'].includes(before.submissionState),'Submission is not ready for resubmission');
 assert.ok(before.itemStates.every(state=>state==='READY_FOR_REVIEW'),'Every review item must be ready');
 // One mutation only. Never automatically retry an ambiguous submission outcome.
 await api('PATCH','/v1/reviewSubmissions/'+submissionID,{data:{type:'reviewSubmissions',id:submissionID,attributes:{submitted:true}}});
 const after=(await api('GET','/v1/reviewSubmissions/'+submissionID)).data;
 assert.ok(['WAITING_FOR_REVIEW','IN_REVIEW','COMPLETE'].includes(after.attributes.state),'Submission outcome needs inspection; do not retry automatically');
 return {...before,submissionState:after.attributes.state,submitted:true};
}

async function main() {
 const mode=process.env.REVIEW_ACTION||'audit';
 assert.ok(['audit','submit'].includes(mode),'Invalid review action');
 const api=appleAPI(process.env);
 const report=mode==='submit'?await submitReview(api,{
  iphoneSignup:process.env.IPHONE_SIGNUP==='true',ipadSignup:process.env.IPAD_SIGNUP==='true',
  sandboxPurchase:process.env.SANDBOX_PURCHASE==='true',restore:process.env.RESTORE==='true',expiry:process.env.EXPIRY==='true',
 }):await auditReview(api);
 const output=JSON.stringify(report,null,2);console.log(output);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'```json\n'+output+'\n```\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{
 // Assertion diagnostics can include actual attribute values. Emit only our fixed first-line reason.
 console.error((error instanceof assert.AssertionError?error.message:'Review request failed; inspect status before retrying. '+error.message).split('\n')[0]);
 process.exitCode=1;
});
