import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from '../../api-cloudflare/node_modules/miniflare/dist/src/index.js';

test('actual account adapter signs in through a Workers service binding and rejects redirects',async()=>{
  const bundle=await build({bundle:true,write:false,format:'esm',platform:'browser',stdin:{
    resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'ts',contents:`
      import {accountAction} from './worker/account';
      export default {async fetch(request,env){try {
        return await accountAction(env,'/api/account/login',await request.json());
      } catch(e){return Response.json({error:e.message},{status:e.status||500});}}};`
  }});
  const mf=new Miniflare(convertV4MiniflareOptions({workers:[
    {name:'account',compatibilityDate:'2026-09-14',modules:true,script:bundle.outputFiles[0].text,serviceBindings:{BACKEND:'backend'}},
    {name:'backend',compatibilityDate:'2026-09-14',modules:true,script:`export default {async fetch(request){
      if(new URL(request.url).pathname==='/api/auth/login'){
        const body=await request.json();
        if(body.email==='redirect@example.test')return Response.redirect('https://untrusted.example.test',307);
        return Response.json({token:'synthetic.signed.jwt'});
      }
      if(request.headers.get('Authorization')!=='Bearer synthetic.signed.jwt')return new Response('',{status:401});
      return Response.json({runner:{id:42},canUseAI:true,state:{source:'production_account',days:[],activities:[]}});
    }}`}
  ]}));
  try {
    const login=email=>mf.dispatchFetch('https://new.aitracker.run/api/account/login',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'synthetic'})});
    const response=await login('runner@example.test');
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
    assert.match(response.headers.get('set-cookie'),/HttpOnly/);
    const redirected=await login('redirect@example.test');
    assert.equal(redirected.status,503);assert.equal(redirected.headers.has('set-cookie'),false);
  } finally {await mf.dispose();}
});
