export function waitlistInput(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Please enter your email and agree to the launch email.');
  const input = value as Record<string, unknown>;
  if (input.website) return null; // Honeypot receives the same generic success response.
  if (input.consent !== true || typeof input.email !== 'string') throw new Error('Please enter your email and agree to the launch email.');
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}
export async function joinWaitlist(env: Env, email: string) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  // Never revive an unsubscribed address from an unauthenticated form submission.
  await env.DB.prepare('INSERT OR IGNORE INTO coach_waitlist(id,email,consent_version,joined_at,unsubscribe_token) VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), email, 'launch-email-v1', Math.floor(Date.now()/1000), token).run();
}
export async function leaveWaitlist(env: Env, token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('This unsubscribe link is invalid.');
  await env.DB.prepare('UPDATE coach_waitlist SET unsubscribed_at=? WHERE unsubscribe_token=? AND unsubscribed_at IS NULL')
    .bind(Math.floor(Date.now()/1000), token).run();
}
export async function deliverLaunch(env: Env) {
  const campaign = await env.DB.prepare('SELECT cutoff_at FROM coach_launch WHERE id=1 AND enabled=1').first<{cutoff_at:number}>();
  if (!campaign || !env.REMINDER_EMAIL || !env.REMINDER_FROM) return;
  const now = Math.floor(Date.now()/1000);
  // Ambiguous outcomes require review, not automatic retries that could duplicate mail.
  await env.DB.prepare("UPDATE coach_waitlist SET launch_status='review' WHERE launch_status='sending' AND claimed_at<?").bind(now-600).run();
  const rows = await env.DB.prepare("SELECT id FROM coach_waitlist WHERE launch_status='pending' AND unsubscribed_at IS NULL AND joined_at<=? ORDER BY joined_at LIMIT 3")
    .bind(campaign.cutoff_at).all<{id:string}>();
  for (const candidate of rows.results) {
    const row = await env.DB.prepare("UPDATE coach_waitlist SET launch_status='sending',claimed_at=? WHERE id=? AND launch_status='pending' AND unsubscribed_at IS NULL AND EXISTS (SELECT 1 FROM coach_launch WHERE id=1 AND enabled=1) RETURNING email,unsubscribe_token")
      .bind(now,candidate.id).first<{email:string;unsubscribe_token:string}>();
    if (!row) continue;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        env.REMINDER_EMAIL.send({from:env.REMINDER_FROM,to:row.email,subject:'Your next chapter of running starts here',
          text:`Hi runner,\n\nYou asked to hear when the new AITracker coach launches. It is ready.\n\nExplore the coach and see what is available: https://new.aitracker.run\n\nThanks for being here from the beginning.\nThe AITracker team\n\nYou received this one-time launch email because you joined the AITracker coach waitlist. No further waitlist emails are scheduled.\nManage your consent: https://new.aitracker.run/waitlist/unsubscribe#token=${row.unsubscribe_token}`}),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Unknown delivery outcome')),20000);}),
      ]);
      await env.DB.prepare("UPDATE coach_waitlist SET launch_status='accepted',notified_at=? WHERE id=?").bind(now,candidate.id).run();
    } catch {
      await env.DB.prepare("UPDATE coach_waitlist SET launch_status='review' WHERE id=?").bind(candidate.id).run();
    } finally { clearTimeout(timer); }
  }
}
