import {useState,useId} from 'react';
import {useMutation} from '@tanstack/react-query';
import {apiRequest,queryClient} from '@/lib/queryClient';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';

export function VerifiedEmailForm({onVerified}:{onVerified?:()=>void}) {
  const id=useId(),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  const send=useMutation({mutationFn:()=>apiRequest('/api/auth/add-email','POST',{email:email.trim(),marketingConsent:consent}),onSuccess:()=>{setSent(true);setError('');},onError:(e:Error)=>setError(e.message||'Could not send verification. Please retry.')});
  const check=useMutation({mutationFn:async()=>{
    const user=await apiRequest('/api/auth/user');
    if(!user?.email)throw new Error('Open the email link first, then check again here.');
    queryClient.setQueryData(['/api/auth/user'],user);
    await queryClient.invalidateQueries({queryKey:['/api/garmin/onboarding']});
  },onSuccess:()=>{setError('');onVerified?.();},onError:(e:Error)=>setError(e.message)});
  return <form className="space-y-4" onSubmit={e=>{e.preventDefault();send.mutate();}}>
    <div><label htmlFor={id} className="mb-2 block text-sm font-medium">Email for account access and billing</label><Input id={id} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>{setEmail(e.target.value);setSent(false);}} placeholder="you@example.com" disabled={send.isPending}/></div>
    <label className="flex items-start gap-3 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)} aria-label="Optional setup and Premium follow-up emails" className="mt-1"/><span>Email me setup reminders and Premium updates. Optional. Unsubscribe anytime. No Garmin activity or health readings are included in these emails.</span></label>
    <Button type="submit" disabled={send.isPending||!email.trim()} className="min-h-11 bg-orange-700 text-white hover:bg-orange-800">{send.isPending?'Sending verification…':sent?'Send a new verification link':'Send verification link'}</Button>
    {sent&&<div role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6"><p>Check your inbox and spam folder. Open the link within 15 minutes to verify and add your email. Nothing is attached until you verify.</p><Button type="button" variant="outline" className="mt-3 min-h-11" disabled={check.isPending} onClick={()=>check.mutate()}>{check.isPending?'Checking…':'I verified my email'}</Button></div>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <p className="text-xs leading-5 text-gray-500">Verification adds an email sign-in method to this account. Existing accounts are never merged. Declining optional emails does not block account access or Premium.</p>
  </form>;
}
