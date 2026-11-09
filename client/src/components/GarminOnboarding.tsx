import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'wouter';
import {CheckCircle2,Watch,Mail,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {apiRequest} from '@/lib/queryClient';
import {VerifiedEmailForm} from '@/components/VerifiedEmailForm';
import {DirectCheckoutButton} from '@/components/DirectCheckoutButton';
import {TrialOfferDetails,useTrialOffer} from '@/components/TrialOfferDetails';
import {trackFunnelEvent} from '@/lib/analytics';
import {buildUpgradeUrl} from '@shared/upgradeIntent';
import {GARMIN_AI_NOTICE,GARMIN_PREMIUM_BENEFIT,type GarminOnboarding as Setup} from '@shared/garminOnboarding';

export function GarminOnboarding({surface='dashboard'}:{surface?:'dashboard'|'settings'|'run'}) {
  const query=useQuery<Setup>({queryKey:['/api/garmin/onboarding'],queryFn:()=>apiRequest('/api/garmin/onboarding'),staleTime:0,refetchInterval:30_000});
  const setup=query.data;
  if(query.isError)return <p role="alert" className="mb-5 rounded-xl border bg-white p-4 text-sm">Garmin setup could not load. <button className="underline" onClick={()=>query.refetch()}>Try again</button></p>;
  if(!setup?.connected)return null;
  return <GarminOnboardingContent setup={setup} surface={surface}/>;
}
export function GarminOnboardingContent({setup,surface='dashboard'}:{setup:Setup;surface?:'dashboard'|'settings'|'run'}) {
  const [showEmail,setShowEmail]=useState(false);
  const {data:offer}=useTrialOffer();
  const source='garmin_'+surface;
  const upgradeUrl=buildUpgradeUrl({source,capability:'training_plans',benefitKey:'garmin_planning',returnTo:'/dashboard',experimentVariant:'contextual_v1'});
  useEffect(()=>{
    trackFunnelEvent('garmin_onboarding_viewed',{source,action:setup.state,experimentVariant:'contextual_v1'},{oncePerSession:true,dedupeParts:[source,setup.state]});
    if(setup.preview)trackFunnelEvent('garmin_preview_viewed',{source,experimentVariant:'contextual_v1'},{oncePerSession:true,dedupeParts:[source]});
  },[source,setup.state,!!setup.preview]);
  return <section aria-labelledby={'garmin-setup-'+surface} className="mb-6 overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm" data-testid="garmin-onboarding">
    <div className="bg-teal-50 p-5 sm:p-6"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800"><Watch size={17} aria-hidden="true"/>Your Garmin start</p><h2 id={'garmin-setup-'+surface} className="text-2xl font-bold text-gray-900">{setup.preview?'Your first run, in focus':'Connected. Let’s bring in your first run.'}</h2>
      <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><li className="flex gap-2"><CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-teal-700"/>Garmin connected</li><li className="flex gap-2"><span aria-hidden="true" className="font-bold text-teal-700">{setup.activityCount>0?'✓':'2.'}</span>{setup.activityCount>0?'Run received':'Record and sync a new run'}</li><li className="flex gap-2"><Mail size={17} aria-hidden="true" className="shrink-0 text-teal-700"/>{setup.hasEmail?'Account email added':'Add email when you’re ready (optional)'}</li></ol>
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      {setup.preview?<div data-testid="garmin-run-preview"><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Rules-based preview · No AI processing</p><h3 className="mt-2 text-lg font-bold">{setup.preview.name}</h3><p className="mt-1 text-sm text-gray-500">{new Date(setup.preview.startDate).toLocaleDateString()}</p><ul className="my-4 space-y-3 text-sm leading-6 text-gray-700">{setup.preview.findings.map(f=><li key={f} className="rounded-xl bg-gray-50 p-4">{f}</li>)}</ul><p className="text-sm leading-6 text-gray-600">{setup.preview.nextAction}</p><Link href={setup.preview.detailUrl} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-teal-800 underline">Open this run<ArrowRight size={16} aria-hidden="true"/></Link></div>:<div role="status"><h3 className="font-semibold">{setup.activityCount>0?'A preview is waiting for a recent run':'Waiting for your first Garmin run'}</h3><p className="mt-2 text-sm leading-6 text-gray-600">Record a new run, sync your watch to Garmin Connect, then return here. A run of at least 1 km recorded in the last 30 days can populate your preview. Automatic historical import is not included. Provider delivery may take time.</p><div className="mt-2 flex flex-wrap gap-5"><Link href="/garmin/setup#troubleshooting" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline">Check sync steps</Link><Link href="/activities" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline">Browse received runs</Link></div></div>}
      {!setup.hasEmail&&<div className="rounded-xl border p-4"><h3 className="font-semibold">Keep account access and receipts in one place</h3><p className="mt-1 text-sm leading-6 text-gray-600">Garmin doesn’t supply your email. Verify one here for email sign-in, or keep exploring without one. Stripe can collect a billing email at Checkout. Follow-up emails are a separate choice.</p><Button variant="outline" className="mt-3 min-h-11" onClick={()=>setShowEmail(!showEmail)}>{showEmail?'Do this later':'Add and verify email'}</Button>{showEmail&&<div className="mt-4"><VerifiedEmailForm/></div>}</div>}
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{GARMIN_AI_NOTICE}</p>
      {!setup.hasPremium&&<div className="rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-5" data-testid="garmin-premium-offer"><h3 className="text-lg font-bold">Ready to plan your next goal?</h3><p className="mt-2 text-sm leading-6 text-gray-700">Premium adds training-plan creation and editing, plus goal-based coach conversations. It does not unlock AI analysis of this Garmin run. Your existing Garmin run feed and optional Recovery stay available without a subscription.</p><div className="mt-4"><DirectCheckoutButton upgradeUrl={upgradeUrl}><Button className="min-h-12 w-full bg-orange-700 text-white hover:bg-orange-800 sm:w-auto">{offer?.trialEligible?'Start my 7-day Premium trial':offer?'Explore Premium planning':'Check my trial eligibility'}</Button></DirectCheckoutButton></div><TrialOfferDetails className="mt-4" benefit={GARMIN_PREMIUM_BENEFIT}/><Link href={upgradeUrl} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-orange-800 underline">Compare monthly and annual plans</Link></div>}
    </div>
  </section>;
}
