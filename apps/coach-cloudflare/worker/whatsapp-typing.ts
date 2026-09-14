import {boundedJSON} from './openai';
// Cosmetic work only. Never holds up context loading or survives a finished reply.
export async function typing(env:Env,sid:string,signal?:AbortSignal) {
 const started=Date.now();
 let status:number|null=null,code:number|null=null,accepted=false,outcome='network_error';
 try {
  const response=await fetch('https://messaging.twilio.com/v3/Indicators/Typing.json',{
   method:'POST',headers:{Authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'Content-Type':'application/json'},
   // v3 JSON uses the uppercase enum in Twilio's request example, unlike v2 forms.
   body:JSON.stringify({messageId:sid,channel:'WHATSAPP'}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000),
  });
  status=response.status;
  let data:unknown;
  try{data=await boundedJSON(response,4096);}catch{outcome='invalid_response';}
  if(data&&typeof data==='object'){
   if('code' in data&&typeof data.code==='number'&&Number.isSafeInteger(data.code)&&data.code>=0&&data.code<=999999)code=data.code;
   accepted=response.ok&&'success' in data&&data.success===true;
   outcome=accepted?'accepted':response.ok?'not_accepted':'rejected';
  }else if(!response.ok)outcome='rejected';
 } catch(error) {
  outcome=signal?.aborted?'cancelled':error instanceof Error&&error.name==='TimeoutError'?'timeout':'network_error';
 }
 const elapsed=Date.now()-started;
 // Only allowlisted operational fields. No SID, phone, error text or provider body.
 console.log(JSON.stringify({event:'whatsapp_typing',outcome,status,code,accepted,duration_ms:elapsed}));
 try{
  await env.DB.prepare('UPDATE whatsapp_inbox SET typing_attempts=typing_attempts+1,typing_accepted=typing_accepted+?,typing_last_status=?,typing_last_code=?,typing_last_outcome=?,typing_last_ms=? WHERE sid=?').bind(accepted?1:0,status,code,outcome,elapsed,sid).run();
 }catch{console.warn(JSON.stringify({event:'whatsapp_typing_metrics_unavailable'}));}
}

export function maintainTyping(pulse:(signal:AbortSignal)=>Promise<void>,intervalMs=18000) {
 const controller=new AbortController();
 const task=(async()=>{
  while(!controller.signal.aborted){
   try{await pulse(controller.signal);}catch{/* Cosmetic only. */}
   if(controller.signal.aborted)break;
   await new Promise<void>(resolve=>{
    const finish=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',finish);resolve();};
    const timer=setTimeout(finish,intervalMs);
    controller.signal.addEventListener('abort',finish,{once:true});
   });
  }
 })();
 return async()=>{controller.abort();await task;};
}
