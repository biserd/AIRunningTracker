import {createHash,timingSafeEqual} from 'node:crypto';
import type {DatabaseCommand,DatabaseResult,DatabaseTransport} from './database';

const requestLimit=4_000_000,responseLimit=8_000_000;
async function boundedJson(body:ReadableStream<Uint8Array>|null,max:number):Promise<unknown>{
  if(!body)throw new Error('DATABASE_BODY_MISSING');
  const reader=body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;
    size+=chunk.value.byteLength;if(size>max){await reader.cancel();throw new Error('DATABASE_BODY_LIMIT');}chunks.push(chunk.value);
  }}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
function parseCommand(value:unknown):DatabaseCommand{
  if(!value||typeof value!=='object')throw new Error('DATABASE_COMMAND_INVALID');
  const c=value as Record<string,unknown>;
  if(typeof c.sql!=='string'||c.sql.length>64_000||!Array.isArray(c.params)||c.params.length>100||
    !['run','all','values','get'].includes(String(c.method)))throw new Error('DATABASE_COMMAND_INVALID');
  const params=c.params.map(p=>{if(p===null||typeof p==='string'||(typeof p==='number'&&Number.isFinite(p)))return p;throw new Error('DATABASE_PARAMETER_INVALID');});
  return {sql:c.sql,params,method:c.method as DatabaseCommand['method']};
}

/** Only mount on the Container's private outbound handler, NEVER the site's fetch router. */
export function privateDatabaseHandler(transport:DatabaseTransport,secret:string){
  if(secret.length<32)throw new Error('DATABASE_TRANSPORT_SECRET_REQUIRED');
  const expected=createHash('sha256').update(secret).digest();
  return async(request:Request):Promise<Response>=>{
    const received=createHash('sha256').update(request.headers.get('authorization')??'').digest();
    if(!timingSafeEqual(expected,received))return new Response(null,{status:401});
    if(request.method!=='POST')return new Response(null,{status:405});
    try{
      const payload=await boundedJson(request.body,requestLimit);
      if(!Array.isArray(payload)||!payload.length||payload.length>32)throw new Error('DATABASE_BATCH_LIMIT');
      const commands=payload.map(parseCommand);
      const results=commands.length===1?[await transport.execute(commands[0])]:await transport.batch(commands);
      const body=JSON.stringify(results);
      if(new TextEncoder().encode(body).byteLength>responseLimit)throw new Error('DATABASE_RESPONSE_LIMIT');
      return new Response(body,{headers:{'content-type':'application/json','cache-control':'no-store'}});
    }catch{
      // SQL, bindings and underlying exception text can contain runner data. Do not log them.
      return Response.json({error:'DATABASE_OPERATION_FAILED'},{status:503,headers:{'cache-control':'no-store'}});
    }
  };
}

export function privateDatabaseTransport(secret:string,send:typeof fetch=fetch):DatabaseTransport{
  if(secret.length<32)throw new Error('DATABASE_TRANSPORT_SECRET_REQUIRED');
  const request=async(commands:DatabaseCommand[]):Promise<DatabaseResult[]>=>{
    const body=JSON.stringify(commands);
    if(new TextEncoder().encode(body).byteLength>requestLimit)throw new Error('DATABASE_BODY_LIMIT');
    // Fixed virtual hostname is intercepted within the container's Worker. No public fallback.
    const response=await send('http://aitracker.database.internal/query',{method:'POST',redirect:'error',
      headers:{authorization:secret,'content-type':'application/json'},body,signal:AbortSignal.timeout(25_000)});
    if(!response.ok){await response.body?.cancel();throw new Error('DATABASE_OPERATION_FAILED');}
    const data=await boundedJson(response.body,responseLimit);
    if(!Array.isArray(data)||data.length!==commands.length||data.some(r=>!r||typeof r!=='object'||!Array.isArray(r.rows)))throw new Error('DATABASE_RESPONSE_INVALID');
    return data;
  };
  // Never automatically retry a write whose result is uncertain.
  return {async execute(command){return (await request([command]))[0];},batch:request};
}
