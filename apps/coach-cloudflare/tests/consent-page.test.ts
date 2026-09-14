import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {consentPage} from '../../../shared/mcpConsentPage';
test('Consent authorizes its exact script with a hash and no inline event handlers',()=>{
 const {html,policy}=consentPage('ra_mcp_req_'+'a'.repeat(44));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)![1];
 assert.ok(policy.includes("'sha256-"+createHash('sha256').update(script).digest('base64')+"'"));
 assert.ok(!html.includes('onclick='));assert.ok(!policy.split(';')[1].includes('unsafe-inline'));
 const location={href:'',pathname:'/mcp/consent',search:'?request=test'};
 runInNewContext(script,{localStorage:{getItem:()=>null},location});
 assert.equal(location.href,'/auth?redirect='+encodeURIComponent('/mcp/consent?request=test'));
});
test('Consent registers explicit approval and denial handlers without automatically approving',async()=>{
 const {html}=consentPage('test');const script=html.match(/<script>([\s\S]*?)<\/script>/)![1];
 const handlers:Record<string,()=>void>={};const content={innerHTML:''};let calls=0;
 runInNewContext(script,{localStorage:{getItem:()=> 'test-token'},location:{},AbortSignal,
  document:{getElementById:(id:string)=>id==='content'?content:{addEventListener:(_:string,f:()=>void)=>handlers[id]=f}},
  fetch:async()=>{calls++;return {ok:true,status:200,json:async()=>({clientName:'WhatsApp',scopes:[],eligible:true})};}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(content.innerHTML,/Allow read-only access/);assert.equal(typeof handlers.approve,'function');assert.equal(typeof handlers.deny,'function');assert.equal(calls,1);
});
