import React,{useEffect,useState} from 'react';
type Preferences={notes:string;evening:boolean;weekly:boolean;followup:boolean;delivery:string;hour:number;quietStart:number;quietEnd:number};
async function call(action:string,input:unknown){
 const response=await fetch('/api/companion/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Your coaching preferences could not be saved or loaded. Please retry.');
 return response.json() as Promise<{preferences:Preferences}>;
}
export function CoachingPreferences(){
 const [value,setValue]=useState<Preferences>(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;call('read',{}).then(data=>{if(active)setValue(data.preferences)}).catch(e=>{if(active)setMessage(e.message)});return()=>{active=false}},[]);
 const update=(patch:Partial<Preferences>)=>{setValue(v=>v?{...v,...patch}:v);setMessage('')};
 return <section className="settings-group" aria-label="Coaching preferences"><h3>Your coach</h3>
 {!value?<p role="status">{message||'Loading preferences…'}</p>:<form onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');try{await call('preferences',value);setMessage('Saved. Your coach uses these preferences across your account.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}>
 <fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gap:16}}>
 <label>Send coaching updates to<select value={value.delivery??'auto'} onChange={e=>update({delivery:e.target.value})}>
 <option value="auto">Automatic: app, then email</option><option value="push">App notifications</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="none">No proactive alerts</option></select></label>
 <small>One channel per update. Connect your selected channel first. Explicit reminders keep their chosen channel.</small>
 <label><input type="checkbox" checked={value.evening} onChange={e=>update({evening:e.target.checked})}/> Tomorrow’s run briefing</label>
 <label><input type="checkbox" checked={value.weekly} onChange={e=>update({weekly:e.target.checked})}/> Sunday progress story</label>
 <label><input type="checkbox" checked={value.followup??false} onChange={e=>update({followup:e.target.checked})}/> Follow up on my check-ins</label>
 <label>Briefing hour (account timezone)<input type="number" min="0" max="23" required value={value.hour} onChange={e=>update({hour:Number(e.target.value)})}/></label>
 <details><summary>Quiet hours and coach memory</summary>
 <label>Quiet from<input type="number" min="0" max="23" required value={value.quietStart} onChange={e=>update({quietStart:Number(e.target.value)})}/></label>
 <label>Quiet until<input type="number" min="0" max="23" required value={value.quietEnd} onChange={e=>update({quietEnd:Number(e.target.value)})}/></label>
 <label>What should your coach remember?<textarea maxLength={1500} rows={4} value={value.notes} onChange={e=>update({notes:e.target.value})}/></label>
 <small>Running days, goals and time constraints. Edit or clear these notes anytime. Notes guide advice, not automatic plan changes.</small></details>
 <button className="primary" type="submit">{busy?'Saving…':'Save coach settings'}</button>
 </fieldset><p role="status">{message}</p></form>}</section>;
}
