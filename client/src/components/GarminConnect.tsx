import {useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {Watch,Loader2,CheckCircle2} from 'lucide-react';
import {Link} from 'wouter';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiRequest} from '@/lib/queryClient';
import {useToast} from '@/hooks/use-toast';
import type {GarminStatus} from '@shared/garmin';

export function GarminActivityConsent({checked,onChange}:{checked:boolean;onChange:(value:boolean)=>void}) {
  return <label className="flex items-start gap-3 text-sm leading-6"><Checkbox className="mt-1" checked={checked} onCheckedChange={value=>onChange(value===true)} aria-label="Agree to Garmin activity sharing"/><span>I agree to import my Garmin running activity summaries into RunAnalytics, hosted by Cloudflare. Garmin data will not be sent to AI services, Strava, or messaging services in this release. I can withdraw consent and delete the feed by disconnecting. <a className="underline" href="/privacy#garmin" target="_blank" rel="noreferrer">Garmin privacy details</a></span></label>;
}

export function GarminConnectButton({signIn=false,returnTo,className=''}:{signIn?:boolean;returnTo?:string|null;className?:string}) {
  const [open,setOpen]=useState(false),[consent,setConsent]=useState(false),{toast}=useToast();
  const connect=useMutation({mutationFn:()=>apiRequest(signIn?'/api/auth/garmin-login':'/api/garmin/authorize','POST',{activityConsent:consent,...(signIn?{returnTo}: {})}),onSuccess:data=>{
    const url=new URL(data.url);if(url.origin!=='https://connect.garmin.com')throw new Error('Invalid Garmin destination');window.location.assign(url.toString());
  },onError:()=>toast({title:'Could not open Garmin',description:'Please try again shortly.',variant:'destructive'})});
  return <Dialog open={open} onOpenChange={value=>{setOpen(value);if(!value)setConsent(false);}}>
    <Button type="button" onClick={()=>setOpen(true)} className={`h-12 bg-teal-800 px-6 font-semibold text-white hover:bg-teal-900 ${className}`} data-testid={signIn?'button-garmin-login':'garmin-connect-button'}><Watch aria-hidden="true"/>Connect with Garmin</Button>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl">
      <DialogHeader><DialogTitle>Connect with Garmin</DialogTitle><DialogDescription>{signIn?'Sign in or create your RunAnalytics account using Garmin.':'Connect your Garmin account to RunAnalytics.'}</DialogDescription></DialogHeader>
      {signIn&&<div className="space-y-3 text-sm leading-6 text-gray-600"><p>Already linked Garmin? You’ll return to your existing account. Otherwise, we’ll create a free account for you. Garmin doesn’t provide your email; you can add it later in Settings.</p><p className="rounded-lg bg-amber-50 p-3 text-amber-950">Already use Strava or email here? Sign in that way first, then connect Garmin in Settings to keep everything in one account.</p></div>}
      <p className="text-sm leading-6 text-gray-600">New run summaries will sync after you record and upload a run. You can enable health, sleep and HRV separately in Recovery after connecting.</p>
      <GarminActivityConsent checked={consent} onChange={setConsent}/>
      {signIn&&<p className="text-xs leading-5 text-gray-500">By continuing, you agree to the <a href="/terms" target="_blank" rel="noreferrer" className="underline">RunAnalytics Terms</a> and acknowledge our <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>.</p>}
      <Button type="button" mutation disabled={!consent||connect.isPending} onClick={()=>connect.mutate()} className="h-12 bg-teal-800 text-white hover:bg-teal-900" data-testid="garmin-continue">{connect.isPending?<Loader2 className="animate-spin" aria-hidden="true"/>:<Watch aria-hidden="true"/>}{connect.isPending?'Opening Garmin…':'Continue to Garmin'}</Button>
    </DialogContent>
  </Dialog>;
}

export function GarminDashboardConnection() {
  const status=useQuery<GarminStatus>({queryKey:['/api/garmin/status'],staleTime:0,refetchInterval:30_000});
  return <div className="rounded-xl border border-gray-200 bg-white p-4" data-testid="dashboard-garmin-connection">
    <h3 className="mb-3 font-semibold text-charcoal">Garmin Connect</h3>
    {status.isPending?<p role="status" className="text-sm text-gray-500">Checking Garmin connection…</p>:status.isError?<p role="alert" className="text-sm">Could not check Garmin. <Button variant="link" onClick={()=>status.refetch()}>Try again</Button></p>:!status.data?.available?<p className="text-sm text-gray-500">Garmin connection is temporarily unavailable.</p>:<>
      {status.data.connected?<p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true"/>Garmin connected</p>:status.data.status==='disconnect_pending'?<p className="text-sm">Finishing Garmin disconnection. Check Settings shortly.</p>:<GarminConnectButton/>}
      <p className="mt-3 text-sm leading-6 text-gray-600">{status.data.connected?'Your new Garmin runs sync automatically. Open Recovery for optional sleep, HRV and health trends.':'Connect directly for new run summaries and optional recovery trends. Strava is not required.'}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium"><Link href="/settings#garmin" className="text-teal-800 underline">Manage Garmin</Link>{status.data.connected&&<Link href="/recovery" className="text-teal-800 underline">View recovery</Link>}</div>
    </>}
  </div>;
}
