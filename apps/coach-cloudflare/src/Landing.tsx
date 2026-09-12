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
        <div><p className="launch-eyebrow"><span/> YOUR AI RUNNING COACH. COMING SOON.</p><h1>Life changes.<br/><em>Your coach listens.</em></h1><p className="launch-lead">Talk through your next run. Adjust your week. Get a nudge when it matters. An AI coach ready for a conversation, whenever you are.</p><a className="launch-button" href="#waitlist">Join the waitlist <ArrowRight size={20}/></a><p className="launch-note">One launch email. No payment. No commitment.</p></div>
        <div className="launch-visual"><img className="launch-hero-photo" src="/images/runner-hero.webp" width="960" height="1200" fetchPriority="high" alt="AI-generated editorial image of a runner in orange beside the waterfront at dawn"/><div className="launch-demo"><p className="launch-eyebrow">A LITTLE DIRECTION</p><h2>Make room for a good run.</h2><div className="launch-workout"><Footprints/><div><strong>20 min · Easy effort</strong><span>Example plan adjustment</span></div><Check/></div><span className="launch-example">Illustrative example, not a personal recommendation</span></div><div className="launch-tag"><ShieldCheck size={18}/> Your plan. Your final say.</div></div>
      </section>
      <section className="launch-promise"><span>BUILT FOR RUNNERS WITH A LIFE OUTSIDE RUNNING</span><p>A question before breakfast. A change of plan after work.<br/>Coaching should fit your day, not an appointment.</p></section>
      <section className="launch-features" id="features"><div className="launch-section-title"><p className="launch-eyebrow">MEET YOUR NEXT RUNNING COMPANION</p><h2>A coach you can talk to.<br/>A plan you can live with.</h2></div><div className="launch-grid">
        {[{Icon:AudioLines,n:'01',title:'Speak freely',text:'Use your voice or type a message. Ask the follow-up. Talk through the uncertainty. No training jargon or perfect prompt needed.'},{Icon:CalendarDays,n:'02',title:'Advice that pays attention',text:'Tell your coach how you feel and how much time you have. Review a shorter run or move a session, with your approval before anything changes.'},{Icon:Sparkles,n:'03',title:'Support between runs',text:'Set an email reminder for a moment that matters, or celebrate your running with a poster. Small touches that help you keep showing up.'}].map(({Icon,n,title,text})=><article key={n}><div><Icon size={27}/><span>{n}</span></div><h3>{title}</h3><p>{text}</p></article>)}
      </div></section>
      <section className="launch-editorial"><img src="/images/pre-run.webp" width="1100" height="733" loading="lazy" decoding="async" alt="AI-generated editorial image of a runner tying their shoes before a run"/><div><p className="launch-eyebrow">MORE RUNNING. LESS OVERTHINKING.</p><h2>More than answers.<br/>A conversation that helps.</h2><p>“I’m tired.” “I only have twenty minutes.” “Can we move my long run?” Start with what is actually on your mind. Your AI coach responds to what you share and helps you work out what comes next.</p><a className="launch-secondary" href="#waitlist">Find your next step <ArrowRight size={18}/></a></div></section>
      <section className="launch-signup" id="waitlist"><p className="launch-eyebrow">LESS GUESSWORK. MORE GOOD RUNS.</p><h2>Your next coach is on the way.</h2><p>Join the waitlist. We’ll email you when the new coach opens to runners.</p>
        {done?<div className="launch-success" role="status"><Check/><h3>Thanks. You’re on the list.</h3><p>If you haven’t previously opted out, we’ll send one launch announcement to this address. No need to sign up again.</p></div>:<form onSubmit={join}><label htmlFor="waitlist-email">Email address</label><div className="launch-form-row"><input id="waitlist-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254}/><button disabled={busy}>{busy?'Joining…':'Join the waitlist'} <ArrowRight size={18}/></button></div><div className="launch-honey" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="launch-consent"><input type="checkbox" name="consent" required/> <span>I agree to receive one email announcing the new AITracker coach launch.</span></label><p className="launch-note">We store your email and consent for the launch announcement, not an ongoing marketing sequence. To withdraw before launch, contact AITracker through the <a href="https://aitracker.run" rel="nofollow noreferrer">current website</a>. The announcement also includes an unsubscribe link.</p><p role="alert">{error}</p></form>}
      </section>
    </main><footer className="launch-footer"><span>AITracker. A little direction. More good runs.</span><a href="https://aitracker.run" rel="nofollow noreferrer">Visit the current AITracker site <ArrowUpRight size={14}/></a></footer>
  </div>;
}
