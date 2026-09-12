import React,{useEffect,useState} from 'react';
export type WhatsAppStatus={configured:boolean;connected:boolean;destination:string|null;templateReady:boolean};
export async function whatsappCall<T>(path='',body?:unknown):Promise<T> {
 const r=await fetch('/api/whatsapp'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await r.json(); if(!r.ok) throw new Error(data && typeof data==='object' && 'error' in data ? String(data.error) : 'WhatsApp unavailable.'); return data as T;
}
export function WhatsAppPanel({verified,onStatus}:{verified:boolean;onStatus:(s:WhatsAppStatus)=>void}) {
 const [data,setData]=useState<WhatsAppStatus>(),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{async function refresh(){try{const s=await whatsappCall<WhatsAppStatus>();setData(s);onStatus(s);if(s.connected)setLink('');}catch{}}
 void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[onStatus]);
 async function act(path:string){setBusy(true);setError('');try{const result=await whatsappCall<{url?:string}>(path,{confirm:true});setLink(result.url||'');const s=await whatsappCall<WhatsAppStatus>();setData(s);onStatus(s);}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 return <div className="reminder-review"><h4>WhatsApp coach</h4><p>Chat and get reminders. Uses this preview’s sample data.</p><details><summary>Privacy & consent</summary><p>Connecting opts you in to confirmed reminders and replies. Twilio, Meta and our AI provider process messages. The connection expires with this preview. Send STOP anytime.</p></details>
 {!data?<p>Checking connection…</p>:!data.configured?<p>WhatsApp setup is not ready yet.</p>:data.connected?<><p>Connected: {data.destination}</p><button disabled={busy} onClick={()=>void act('/disconnect')}>Disconnect & cancel WhatsApp reminders</button></>:<>{!verified&&<p>First, verify your email below.</p>}<button disabled={busy||!verified} onClick={()=>void act('/connect')}>Agree & connect WhatsApp</button>{link&&<p><a href={link} rel="noreferrer" target="_blank">Open WhatsApp & send link</a><br/>Private link. Expires in 10 minutes.</p>}</>}
 {data?.connected&&!data.templateReady&&<p>Without an approved template, reminders can only be sent within 23 hours of your latest WhatsApp message. Send a message before testing.</p>}
 {error&&<p role="alert">{error}</p>}</div>;
}
