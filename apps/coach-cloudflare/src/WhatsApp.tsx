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
 return <div className="reminder-review"><h4>Bring your coach to WhatsApp</h4><p>Receive reminders you confirm and ask text questions about this sample-data preview. Your messages are processed by Twilio, Meta and our AI provider. The connection expires with this preview.</p>
 {!data?.configured?<p>WhatsApp is waiting for site-owner setup.</p>:data.connected?<><p>Connected: {data.destination}</p><button disabled={busy} onClick={()=>void act('/disconnect')}>Disconnect WhatsApp and cancel its reminders</button></>:<><p>Verify your email first. Connecting opts you in to confirmed WhatsApp reminders and replies. Send STOP anytime.</p><button disabled={busy||!verified} onClick={()=>void act('/connect')}>Agree and connect WhatsApp</button>{link&&<p><a href={link} rel="noreferrer" target="_blank">Open WhatsApp and send the linking message</a><br/>Link expires in 10 minutes. Keep it private.</p>}</>}
 {data?.connected&&!data.templateReady&&<p>Without an approved template, reminders can only be sent within 23 hours of your latest WhatsApp message. Send a message before testing.</p>}
 {error&&<p role="alert">{error}</p>}</div>;
}
