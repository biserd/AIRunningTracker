import type { ProviderCheck } from './provider-checks';

/** Fixed public-data probes through a private service binding, never a caller-chosen route. */
export async function productionChecks(send: (request: Request) => Promise<Response>, resendSecret?: string): Promise<ProviderCheck[]> {
  const checks: ProviderCheck[] = [];
  for (const [name, path] of [['Production application','/health'],['Production Stripe configuration','/api/stripe/config'],['Production OAuth metadata','/.well-known/oauth-authorization-server']] as const) {
    try {
      const response=await send(new Request('https://aitracker.run'+path,{signal:AbortSignal.timeout(30_000)}));
      if (!response.ok) { await response.body?.cancel(); checks.push({name,status:'fail',detail:`Runtime returned HTTP ${response.status}`}); continue; }
      const reader=response.body?.getReader();
      if (!reader) throw new Error('EMPTY');
      const decoder=new TextDecoder(); let text='',size=0;
      try { for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>16_384)throw new Error('LIMIT'); text+=decoder.decode(value,{stream:true}); } }
      finally { await reader.cancel(); }
      text+=decoder.decode();
      const data=JSON.parse(text);
      const valid=path==='/health' ? data.status==='ok' : path==='/api/stripe/config'
        ? typeof data.publishableKey==='string' && data.publishableKey.startsWith('pk_live_')
        : data.issuer==='https://aitracker.run';
      checks.push({name,status:valid?'pass':'fail',detail:valid?'Production runtime responded with the expected public configuration':'Unexpected public configuration'});
    } catch { checks.push({name,status:'unverified',detail:'Runtime probe failed or exceeded its bounded response limits'}); }
  }
  if (resendSecret) {
    try {
      // This event has no email ID. The production handler verifies it, then returns without any database write.
      const body=JSON.stringify({type:'migration.probe',data:{}});
      const timestamp=String(Math.floor(Date.now()/1000));
      const id='migration-'+crypto.randomUUID();
      const bytes=Uint8Array.from(atob(resendSecret.replace(/^whsec_/,'')),c=>c.charCodeAt(0));
      const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
      const signature='v1,'+btoa(String.fromCharCode(...digest));
      const headers={'Content-Type':'application/json','svix-id':id,'svix-timestamp':timestamp,'svix-signature':signature};
      const valid=await send(new Request('https://aitracker.run/api/webhooks/resend',{method:'POST',headers,body,signal:AbortSignal.timeout(15_000)}));
      await valid.body?.cancel();
      const invalid=await send(new Request('https://aitracker.run/api/webhooks/resend',{method:'POST',headers,body:body+' ',signal:AbortSignal.timeout(15_000)}));
      await invalid.body?.cancel();
      checks.push({name:'Production Resend signature',status:valid.status===200&&invalid.status===401?'pass':'fail',detail:`Signed no-op ${valid.status}; tampered body ${invalid.status}. No runner or email records changed`});
    } catch { checks.push({name:'Production Resend signature',status:'unverified',detail:'Controlled signature probe could not finish'}); }
  }
  return checks;
}
