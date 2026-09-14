// Cosmetic work only. Never holds up context loading or survives a finished reply.
export async function typing(env:Env,sid:string,signal?:AbortSignal) {
 try {
  const response=await fetch('https://messaging.twilio.com/v3/Indicators/Typing.json',{
   method:'POST',headers:{Authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'Content-Type':'application/json'},
   body:JSON.stringify({messageId:sid,channel:'whatsapp'}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000),
  });
  await response.body?.cancel();
  if(!response.ok)console.warn(JSON.stringify({event:'whatsapp_typing_unavailable',status:response.status}));
 } catch { /* Never log provider payloads or fail coaching for an indicator. */ }
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
