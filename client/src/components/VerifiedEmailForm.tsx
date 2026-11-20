import {useEffect,useId,useRef,useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';

export function VerifiedEmailForm({onVerified}:{onVerified?:()=>void}) {
  const id=useId(),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[sentAt,setSentAt]=useState(0),[error,setError]=useState('');
  const queryClient=useQueryClient();
  const verifiedCallback=useRef(onVerified);
  useEffect(()=>{verifiedCallback.current=onVerified;},[onVerified]);
  const send=useMutation({
    mutationFn:()=>apiRequest('/api/auth/add-email','POST',{
      email:email.trim(),marketingConsent:consent,
      returnTo:window.location.pathname+window.location.search,
    }),
    onSuccess:()=>{setSentAt(Date.now());setError('');},
    onError:(e:Error)=>setError(e.message||'Could not send verification. Please retry.'),
  });

  useEffect(()=>{
    if(!sentAt)return;
    let cancelled=false,checking=false,finished=false;
    const check=async()=>{
      if(cancelled||checking||finished||document.visibilityState==='hidden')return;
      checking=true;
      try {
        // The original tab can pick up the new email even if the link was opened elsewhere.
        const user=await apiRequest('/api/user');
        if(!user?.email||cancelled)return;
        finished=true;
        queryClient.setQueryData(['/api/auth/user'],user);
        void queryClient.invalidateQueries({queryKey:[`/api/dashboard/${user.id}`]});
        void queryClient.invalidateQueries({queryKey:['/api/garmin/onboarding']});
        verifiedCallback.current?.();
      } catch { /* Retry a temporary failure while waiting for the email. */ }
      finally {checking=false;}
    };
    const timer=window.setInterval(()=>{
      if(finished||Date.now()-sentAt>15*60_000)window.clearInterval(timer);
      else void check();
    },5000);
    const recheck=()=>void check();
    window.addEventListener('focus',recheck);
    window.addEventListener('pageshow',recheck);
    document.addEventListener('visibilitychange',recheck);
    void check();
    return ()=>{
      cancelled=true;
      window.clearInterval(timer);
      window.removeEventListener('focus',recheck);
      window.removeEventListener('pageshow',recheck);
      document.removeEventListener('visibilitychange',recheck);
    };
  },[sentAt,queryClient]);
  return <form className="space-y-4" onSubmit={e=>{e.preventDefault();send.mutate();}}>
    <div><label htmlFor={id} className="mb-2 block text-sm font-medium">Email for account access and billing</label><Input id={id} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={send.isPending}/></div>
    <label className="flex items-start gap-3 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)} aria-label="Optional setup and Premium follow-up emails" className="mt-1"/><span>Email me setup reminders and Premium updates. Optional. Unsubscribe anytime. No Garmin activity or health readings are included in these emails.</span></label>
    <Button type="submit" disabled={send.isPending||!email.trim()} className="min-h-11 bg-orange-700 text-white hover:bg-orange-800">{send.isPending?'Sending verification…':sentAt?'Send a new verification link':'Send verification link'}</Button>
    {!!sentAt&&<p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6">Check your inbox or spam folder. Open the link within 15 minutes to verify and return to this screen automatically.</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <p className="text-xs leading-5 text-gray-500">Verification adds an email sign-in method to this account. Existing accounts are never merged. Declining optional emails does not block account access or Premium.</p>
  </form>;
}
