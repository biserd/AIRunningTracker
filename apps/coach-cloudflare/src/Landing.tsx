import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, AudioLines, CalendarDays, Sparkles, Footprints, Check, ShieldCheck } from 'lucide-react';
import { ReminderUnsubscribe } from './Reminders';
import './landing.css';

async function submit(path: string, data: unknown) {
  const response = await fetch('/api/waitlist'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : 'Could not save your request. Please try again.');
  }
}
export function WaitlistUnsubscribe() {
  const [token] = useState(()=>new URLSearchParams(location.hash.slice(1)).get('token'));
  const [message,setMessage] = useState(''), [busy,setBusy] = useState(false);
  useEffect(()=>{history.replaceState(null,'',location.pathname);},[]);
  return <main className="launch-page"><section className="launch-signup"><a href="/">AITracker</a><h1>Leave the waitlist</h1><p>Stop the launch announcement. This does not change your AITracker account or coaching reminders.</p><button disabled={busy || !token} onClick={async()=>{setBusy(true);try {await submit('/unsubscribe',{token});setMessage('You will not receive the launch announcement. An email already being sent may still arrive.');}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');setBusy(false);}}}>Unsubscribe</button><p role="status">{message || (!token?'Open the complete link from your email.':'')}</p><a href="/">Back to AITracker</a></section></main>;
}
export function Landing() {
  const [done,setDone] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    setBusy(true);setError('');
    try { await submit('',{email:values.get('email'),consent:values.get('consent')==='on',website:values.get('website')});setDone(true); }
    catch(e){setError(e instanceof Error?e.message:'Please try again.');} finally{setBusy(false);}
  }
  return <div className="launch-page">
    <header className="launch-nav"><a className="launch-brand" href="/"><Footprints size={25}/> AITracker<span>.</span></a><nav aria-label="Landing navigation"><a href="#features">The experience</a><a className="launch-small-cta" href="#waitlist">Join the waitlist <ArrowUpRight size={16}/></a></nav></header>
    <main>
      <ReminderUnsubscribe/>
      <section className="launch-hero">
        <div><p className="launch-eyebrow"><span/> A NEW CHAPTER FOR YOUR RUNNING</p><h1>Less second-guessing.<br/><em>More good runs.</em></h1><p className="launch-lead">Meet the AI coach built around your running and your real life. Talk it through, find your next step, and make room for the runs that matter.</p><a className="launch-button" href="#waitlist">Be first to know <ArrowRight size={20}/></a><p className="launch-note">Coming soon. One launch email. No payment needed.</p></div>
        <div className="launch-visual"><div className="launch-orbit"/><div className="launch-orbit second"/><div className="launch-demo"><p className="launch-eyebrow">A LITTLE DIRECTION</p><div className="launch-chat">“I only have 20 minutes today.”</div><h2>Let’s make them count.</h2><p>An easy run can still fit. Want to review a shorter session?</p><div className="launch-workout"><Footprints/><div><strong>20 min · Easy effort</strong><span>Proposed adjustment</span></div><Check/></div><div className="launch-wave" aria-hidden="true">{[14,28,18,40,56,32,64,44,24,48,60,34,18,30,14].map((h,i)=><i key={i} style={{height:h}}/>)}</div><span className="launch-example">Illustrative conversation, not a personal recommendation</span></div><div className="launch-tag"><ShieldCheck size={18}/> Your plan. Your final say.</div></div>
      </section>
      <section className="launch-promise"><span>BUILT FOR RUNNERS WITH A LIFE OUTSIDE RUNNING</span><p>Your data should help you decide what to do next.<br/>Not give you another dashboard to decode.</p></section>
      <section className="launch-features" id="features"><div className="launch-section-title"><p className="launch-eyebrow">MEET YOUR NEXT RUNNING COMPANION</p><h2>A coach you can talk to.<br/>A plan you can live with.</h2></div><div className="launch-grid">
        {[{Icon:AudioLines,n:'01',title:'Talk it through',text:'Ask your questions by voice or text. Get a clear next step without learning the language of training charts.'},{Icon:CalendarDays,n:'02',title:'Make the week fit',text:'Short on time? Review a shorter run or move a session. You approve the change before it is saved.'},{Icon:Sparkles,n:'03',title:'Keep the momentum',text:'Prepare email reminders and turn your running totals into a poster worth keeping.'}].map(({Icon,n,title,text})=><article key={n}><div><Icon size={27}/><span>{n}</span></div><h3>{title}</h3><p>{text}</p></article>)}
      </div></section>
      <section className="launch-preview"><div><p className="launch-eyebrow">CURIOUS ALREADY?</p><h2>Take a look around.</h2><p>Explore voice coaching, plan adjustments and running posters in our working preview. It uses clearly labeled fictional running data. Real-account onboarding is not available here yet.</p></div><a className="launch-secondary" href="/preview">Explore the coach preview <ArrowUpRight size={20}/></a></section>
      <section className="launch-signup" id="waitlist"><p className="launch-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>Get the starting signal.</h2><p>Join the waitlist for the new AITracker coaching experience. We’ll email you when it officially launches.</p>
        {done?<div className="launch-success" role="status"><Check/><h3>Thanks. You’re on the list.</h3><p>If you haven’t previously opted out, we’ll send one launch announcement to this address. No need to sign up again.</p></div>:<form onSubmit={join}><label htmlFor="waitlist-email">Email address</label><div className="launch-form-row"><input id="waitlist-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254}/><button disabled={busy}>{busy?'Joining…':'Join the waitlist'} <ArrowRight size={18}/></button></div><div className="launch-honey" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="launch-consent"><input type="checkbox" name="consent" required/> <span>I agree to receive one email announcing the new AITracker coach launch.</span></label><p className="launch-note">We store your email and consent for the launch announcement, not an ongoing marketing sequence. To withdraw before launch, contact AITracker through the <a href="https://aitracker.run" rel="nofollow noreferrer">current website</a>. The announcement also includes an unsubscribe link.</p><p role="alert">{error}</p></form>}
      </section>
    </main><footer className="launch-footer"><span>AITracker. A little direction. More good runs.</span><a href="https://aitracker.run" rel="nofollow noreferrer">Visit the current AITracker site <ArrowUpRight size={14}/></a></footer>
  </div>;
}
