import {createHash,timingSafeEqual} from 'node:crypto';
type Notifications={available:(user:number)=>Promise<boolean>;deliver:(user:number,event:string,text:string)=>Promise<{status:string}>};
export function privateCoachNotifications(secret:string,service:Notifications){
 return async(request:Request)=>{
  if(secret.length<32||!timingSafeEqual(createHash('sha256').update(secret).digest(),createHash('sha256').update(request.headers.get('authorization')||'').digest()))return new Response(null,{status:401});
  if(request.method!=='POST')return new Response(null,{status:405});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});let text='';let bytes=0;
  try{const decoder=new TextDecoder();while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>4096)return new Response(null,{status:413});text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();
   const input=JSON.parse(text);if(!Number.isSafeInteger(input.user)||input.user<1)return new Response(null,{status:400});
   if(input.action==='available'&&Object.keys(input).every(k=>['action','user'].includes(k)))return Response.json({available:await service.available(input.user)});
   if(input.action==='deliver'&&typeof input.event==='string'&&typeof input.text==='string'&&Object.keys(input).every(k=>['action','user','event','text'].includes(k)))return Response.json(await service.deliver(input.user,input.event,input.text));
   return new Response(null,{status:400});
  }catch{return new Response(null,{status:503});}finally{await reader.cancel();}
 };
}
