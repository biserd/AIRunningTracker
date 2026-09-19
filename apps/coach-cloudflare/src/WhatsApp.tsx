import React,{useEffect,useRef,useState} from 'react';
export type WhatsAppStatus={configured:boolean;authorized:boolean;connected:boolean;destination:string|null;templateReady:boolean};
export async function whatsappCall<T>(path='',body?:unknown):Promise<T> {
 const r=await fetch('/api/whatsapp'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const data=await r.json(); if(!r.ok) throw new Error(data && typeof data==='object' && 'error' in data ? String(data.error) : 'WhatsApp unavailable.'); return data as T;
}
export function WhatsAppCallback(){
 const started=useRef(false),[message,setMessage]=useState('Finishing step 1 of 3…');
 useEffect(()=>{if(started.current)return;started.current=true;
  const params=new URLSearchParams(location.search);history.replaceState(null,'','/whatsapp/callback');
  if(params.get('error')){setMessage('Access was not approved. Try again when you’re ready.');return;}
  void whatsappCall('/finish',{code:params.get('code'),state:params.get('state')}).then(()=>location.replace('/preview#whatsapp')).catch(e=>setMessage(e.message));
 },[]);
 return <main className="reminder-review whatsapp-setup"><h1>Connect WhatsApp</h1><p role="status">{message}</p><a className="primary" href="/preview#whatsapp">Back to WhatsApp setup</a></main>;
}
export function WhatsAppPanel({onStatus}:{verified:boolean;onStatus:(s:WhatsAppStatus)=>void}) {
 const [data,setData]=useState<WhatsAppStatus>(),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const prepared=useRef(false);
 useEffect(()=>{let active=true;async function refresh(){try{const s=await whatsappCall<WhatsAppStatus>();if(!active)return;setData(s);onStatus(s);if(s.connected)setLink('');}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to check connection.');}}
 void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{active=false;clearInterval(timer);};},[onStatus]);
 async function act(path:string){
  setBusy(true);setError('');
  try{
   const result=await whatsappCall<{url?:string;authorizationUrl?:string}>(path,{confirm:true});
   if(result.authorizationUrl){location.assign(result.authorizationUrl);return;}
   setLink(result.url||'');
   const s=await whatsappCall<WhatsAppStatus>();setData(s);onStatus(s);
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
  finally{setBusy(false);}
 }
 useEffect(()=>{
  if(data?.configured&&data.authorized&&!data.connected&&!prepared.current){
   prepared.current=true;void act('/connect');
  }
 },[data?.configured,data?.authorized,data?.connected]);
 return <section id="whatsapp" className="reminder-review whatsapp-setup" aria-label="WhatsApp setup">
 <h3>WhatsApp coach</h3><p>Chat about your runs and set reminders.</p>
 {data && <span className="connection-status">{data.connected&&data.authorized?'Connected':data.connected?'Access expired':data.authorized?'Finish linking your number':'Not connected'}</span>}
 <details><summary>Privacy & consent</summary><p>Approve read-only access to your AITracker data, then link your number. Twilio, Meta and our AI provider process messages. Access lasts up to 30 days and requires an active trial or subscription. Send STOP to disconnect.</p></details>
 {!data?<p role="status">Checking connection…</p>:!data.configured?<p>WhatsApp setup is not ready yet.</p>:data.connected&&data.authorized?
 <><p role="status">Connected: {data.destination}</p><p>Send your coach a message on WhatsApp.</p><button disabled={busy} onClick={()=>void act('/disconnect')}>Disconnect WhatsApp</button></>:
 <ol>
 <li><strong>{data.authorized?'Running data connected':'Approve running data access'}</strong>
 {!data.authorized&&<div><p>We’ll bring you back here automatically.</p><button className="primary" disabled={busy} onClick={()=>void act('/authorize')}>{busy?'Connecting…':'Connect my running data'}</button></div>}</li>
 <li><strong>Open WhatsApp</strong>
 {data.authorized&&!data.connected&&(link?<div><a className="primary" href={link} rel="noreferrer" target="_blank">Continue in WhatsApp</a><p>Private link. Valid for 10 minutes.</p><button disabled={busy} onClick={()=>void act('/connect')}>Refresh expired link</button></div>:<div><p role="status">{busy?'Preparing your private link…':'Ready to link your number.'}</p>{!busy&&<button className="primary" onClick={()=>void act('/connect')}>Prepare WhatsApp link</button>}</div>)}</li>
 <li><strong>Tap Send to finish</strong><p>Send the prepared message without editing it. This page updates automatically once connected.</p></li>
 </ol>}
 {data?.connected&&!data.templateReady&&<p>Reminders require a WhatsApp message from you within the last 23 hours.</p>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
