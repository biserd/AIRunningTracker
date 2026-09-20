import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AIError,openai,voiceProviderError} from '../worker/openai';
import {voiceDiagnostic} from '../worker/voice-diagnostics';

test('voice diagnostics emit only safe metadata, never error text or properties',t=>{
  const logs: string[]=[];
  t.mock.method(console,'error',(text:string)=>logs.push(text));
  t.mock.method(console,'info',(text:string)=>logs.push(text));
  const error=Object.assign(new AIError('private SDP token prompt',503,401),{body:'runner data'});
  assert.equal(voiceDiagnostic('provider_session',Date.now(),error).upstreamStatus,401);
  assert.equal(voiceDiagnostic('control_attach',Date.now(),new DOMException('private','TimeoutError')).reason,'timeout_or_abort');
  assert.equal(voiceDiagnostic('provider_session',Date.now(),new TypeError('private')).reason,'transport_or_type_error');
  assert.equal(voiceDiagnostic('provider_response',Date.now(),new SyntaxError('private')).reason,'invalid_json');
  assert.equal(voiceDiagnostic('ready',Date.now()).reason,'success');
  assert.equal(voiceDiagnostic('dispatch',Date.now(),new AIError('private',503,999)).upstreamStatus,undefined);
  assert.doesNotMatch(logs.join(''),/private|runner data|body|SDP|prompt/);
});

test('provider HTTP status is preserved without exposing error body',async t=>{
  t.mock.method(console,'error',()=>{});
  t.mock.method(globalThis,'fetch',async()=>new Response('secret provider details',{status:403}));
  await assert.rejects(openai('test','live/sessions',{},AbortSignal.timeout(1000)),e=>{
    assert.ok(e instanceof AIError);
    assert.equal(e.upstreamStatus,403);
    assert.equal(e.status,503);
    assert.doesNotMatch(e.message,/secret provider details/);
    return true;
  });
});

test('provider classification never retains private message or arbitrary metadata',()=>{
  assert.deepEqual(voiceProviderError({error:{code:'invalid_request_error',param:'session.instructions',message:'instructions too long: PRIVATE'}}),{code:'invalid_request_error',param:'session.instructions',category:'instructions_or_context'});
  assert.deepEqual(voiceProviderError({error:{code:'PRIVATE',param:'PRIVATE',message:'PRIVATE'}}),{code:'other',param:'other',category:'unclassified'});
  assert.equal(voiceProviderError(null).category,'unclassified');
  assert.equal(voiceProviderError({error:{code:'credit_balance_exhausted'}}).code,'credit_balance_exhausted');
  assert.equal(voiceProviderError({error:{code:'rate_limit_exceeded'}}).code,'rate_limit_exceeded');
});
