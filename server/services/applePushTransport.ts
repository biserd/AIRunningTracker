import {connect} from 'node:http2';
import {createPrivateKey, sign} from 'node:crypto';

export type ApplePushConfig = {keyId:string; teamId:string; privateKey:string};
export type ApplePushMessage = {id:string; token:string; environment:'production'|'sandbox'; expires:number; kind:'run'|'reminder'|'test'; generation:string};
export type ApplePushResult = {status:number; reason:string};
// This cache contains only provider authentication, never runner data or tokens.
let cached:{identity:string; issued:number; jwt:string}|undefined;
export function providerToken(config:ApplePushConfig, now=Math.floor(Date.now()/1000)) {
  const identity=config.teamId+config.keyId+config.privateKey;
  if(cached?.identity===identity && now-cached.issued<3000 && now>=cached.issued)return cached.jwt;
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload=encode({alg:'ES256',kid:config.keyId})+'.'+encode({iss:config.teamId,iat:now});
  const signature=sign('sha256',Buffer.from(payload),{key:createPrivateKey(config.privateKey.replace(/\\n/g,'\n')),dsaEncoding:'ieee-p1363'}).toString('base64url');
  cached={identity,issued:now,jwt:payload+'.'+signature};return cached.jwt;
}
export function applePayload(message:ApplePushMessage) {
  return {aps:{alert:{title:'Run Analytics',body:message.kind==='run'?'Your new run has synced. Open your coach to review it.':message.kind==='reminder'?'Your running reminder is ready. Open your schedule.':'Notifications are connected.'},sound:'default'},
    destination:message.kind==='reminder'?'schedule':'coach',generation:message.generation};
}
export function sendApplePush(config:ApplePushConfig,message:ApplePushMessage):Promise<ApplePushResult> {
  const authorization=providerToken(config);
  return new Promise((resolve,reject)=>{
    const client=connect(message.environment==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com');
    let settled=false;
    const finish=(error?:Error,result?:ApplePushResult)=>{if(settled)return;settled=true;clearTimeout(timer);client.destroy();error?reject(error):resolve(result!);};
    const timer=setTimeout(()=>finish(new Error('APNS_OUTCOME_UNKNOWN')),10000);
    client.on('error',()=>finish(new Error('APNS_OUTCOME_UNKNOWN')));
    const stream=client.request({':method':'POST',':path':'/3/device/'+message.token,
      authorization:'bearer '+authorization,'apns-topic':'run.aitracker.coach','apns-push-type':'alert',
      'apns-priority':'10','apns-expiration':String(message.expires),'apns-id':message.id,'apns-collapse-id':message.id});
    let status=0,body='';
    stream.setEncoding('utf8');
    stream.on('response',headers=>{status=Number(headers[':status']);});
    stream.on('data',(part:string)=>{body+=part;if(body.length>4096)finish(new Error('APNS_OUTCOME_UNKNOWN'));});
    stream.on('error',()=>finish(new Error('APNS_OUTCOME_UNKNOWN')));
    stream.on('end',()=>{let reason='';try{reason=JSON.parse(body).reason||'';}catch{}finish(undefined,{status,reason});});
    stream.end(JSON.stringify(applePayload(message)));
  });
}
