import React,{useEffect,useRef,useState} from 'react';
export type WhatsAppStatus={configured:boolean;authorized:boolean;connected:boolean;destination:string|null;templateReady:boolean};
export async function whatsappCall<T>(path='',body?:unknown):Promise<T> {
 const r=await fetch('/api/whatsapp'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const data=await r.json(); if(!r.ok) throw new Error(data && typeof data==='object' && 'error' in data ? String(data.error) : 'WhatsApp unavailable.'); return data as T;
}
export function WhatsAppCallback(){
 const started=useRef(false),[message,setMessage]=useState('Connecting your running data…');
 useEffect(()=>{if(started.current)return;started.current=true;
  const params=new URLSearchParams(location.search);history.replaceState(null,'','/whatsapp/callback');
  if(params.get('error')){setMessage('Access was not approved. Return to Settings to try again.');return;}
  void whatsappCall('/finish',{code:params.get('code'),state:params.get('state')}).then(()=>setMessage('Running data authorized. Return to Settings and connect your WhatsApp number.')).catch(e=>setMessage(e.message));
 },[]);
 return <main className="reminder-review"><h1>WhatsApp coach</h1><p>{message}</p><a href="/preview">Return to your coach</a></main>;
}
export function WhatsAppPanel({onStatus}:{verified:boolean;onStatus:(s:WhatsAppStatus)=>void}) {
 const [data,setData]=useState<WhatsAppStatus>(),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{async function refresh(){try{const s=await whatsappCall<WhatsAppStatus>();setData(s);onStatus(s);if(s.connected)setLink('');}catch{}}
 void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[onStatus]);
 async function act(path:string){setBusy(true);setError('');try{const result=await whatsappCall<{url?:string;authorizationUrl?:string}>(path,{confirm:true});if(result.authorizationUrl){location.assign(result.authorizationUrl);return;}setLink(result.url||'');const s=await whatsappCall<WhatsAppStatus>();setData(s);onStatus(s);}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 return <div className="reminder-review"><h4>Your coach on WhatsApp</h4><p>Ask about your runs, recovery and training plan.</p><details><summary>Privacy & consent</summary><p>Approve read-only access to your AITracker data, then link your number. Twilio, Meta and our AI provider process messages. Access lasts up to 30 days and requires an active trial or subscription. Plan changes need confirmation on the website. Send STOP to disconnect.</p></details>
 {!data?<p>Checking connection…</p>:!data.configured?<p>WhatsApp setup is not ready yet.</p>:<>
 <button disabled={busy} onClick={()=>void act('/authorize')}>{data.authorized?'Renew coaching access':'Allow read-only coaching access'}</button>
 {data.connected?<><p>Connected: {data.destination}{!data.authorized?' · Reconnect access above':''}</p><button disabled={busy} onClick={()=>void act('/disconnect')}>Disconnect WhatsApp</button></>:data.authorized&&<><button disabled={busy} onClick={()=>void act('/connect')}>Connect my WhatsApp</button>{link&&<p><a href={link} rel="noreferrer" target="_blank">Open WhatsApp & send link</a><br/>Private link. Expires in 10 minutes.</p>}</>}
 </>}
 {data?.connected&&!data.templateReady&&<p>Without an approved template, reminders can only be sent within 23 hours of your latest WhatsApp message. Send a message before testing.</p>}
 {error&&<p role="alert">{error}</p>}</div>;
}
