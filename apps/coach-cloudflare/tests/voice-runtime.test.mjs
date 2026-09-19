import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from '../../api-cloudflare/node_modules/miniflare/dist/src/index.js';

test('real voice Durable Object RPC starts with a synthetic provider and runner context',async()=>{
  const bundle=await build({bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers'],stdin:{
    resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'ts',contents:`
      export {VoiceLease} from './worker/voice';
      import {AIError} from './worker/openai';
      globalThis.fetch=async (url,options)=>{
        if(String(url).endsWith('/attach')){
          const pair=new WebSocketPair(); pair[1].accept();
          return new Response(null,{status:101,webSocket:pair[0]});
        }
        if(JSON.parse(options.body).transport.sdp.includes('reject'))return new Response('synthetic private provider error',{status:403});
        return Response.json({session:{id:'synthetic'},transport:{sdp:'v=0 synthetic answer'}});
      };
      export default {async fetch(request,env){try {
        const reject=new URL(request.url).pathname==='/reject';
        const result=await env.VOICE_LEASE.getByName(reject?'rejected-runner':'synthetic-runner').start(reject?'v=0 reject':'v=0 synthetic offer',{
          source:'production_account',today:'2026-09-18',goal:'Run consistently',days:[],activities:[],trainingContext:{canWritePlans:false,profile:{},plans:[],goals:[],metrics:{},unavailable:[],loadedAt:'2026-09-18T20:00:00Z',coverage:'synthetic'}
        });
        return Response.json(result);
      } catch(e){return Response.json({name:e.name,error:e.message,isAIError:e instanceof AIError,status:e.status ?? null},{status:500});}}};`
  }});
  const mf=new Miniflare(convertV4MiniflareOptions({workers:[{
    name:'voice-test',compatibilityDate:'2026-09-12',compatibilityFlags:['nodejs_compat'],modules:true,
    script:bundle.outputFiles[0].text,bindings:{OPENAI_API_KEY:'synthetic'},
    durableObjects:{VOICE_LEASE:{className:'VoiceLease',useSQLite:true}}
  }]}));
  try {
    const response=await mf.dispatchFetch('https://test.local/start');
    const result=await response.json();
    assert.equal(response.status,200,JSON.stringify(result));
    assert.equal(result.sdp,'v=0 synthetic answer');
    const rejected=await mf.dispatchFetch('https://test.local/reject');
    const failure=await rejected.json();
    assert.equal(rejected.status,200);
    assert.equal(failure.ok,false);
    assert.equal(failure.status,503);
    assert.equal(failure.upstreamStatus,403);
    assert.equal(failure.stage,'provider_session');
    assert.match(failure.message,/Voice could not connect/);
    assert.doesNotMatch(JSON.stringify(failure),/synthetic private provider error/);
  } finally {await mf.dispose();}
});
