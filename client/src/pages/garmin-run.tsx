import {useQuery} from '@tanstack/react-query';
import {useParams,Link} from 'wouter';
import {useAuth} from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import {RunSourceBadge} from '@/components/RunningFeed';
import {apiRequest} from '@/lib/queryClient';
import type {FeedRun} from '@shared/runningFeed';
import {GarminRunInsights} from '@/components/GarminRunInsights';
export default function GarminRunPage({phone=false}:{phone?:boolean}){
  const params=useParams<{id:string}>(),{user}=useAuth();
  const query=useQuery<{activity:FeedRun}>({queryKey:['/api/runs/'+(phone?'phone':'garmin')+'/'+encodeURIComponent(params.id||'')],enabled:!!user,staleTime:0,queryFn:({queryKey})=>apiRequest(String(queryKey[0]))});
  const run=query.data?.activity,miles=user?.unitPreference==='miles',divisor=miles?1609.344:1000;
  const seconds=run&&run.averageSpeed>0?Math.round(divisor/run.averageSpeed):null;
  return <div className="min-h-screen bg-light-grey"><AppHeader/><main className="mx-auto max-w-4xl space-y-6 px-6 py-8"><Link href="/activities" className="text-teal-800 underline">← All activities</Link>
    {query.isPending?<p role="status">Loading run…</p>:query.isError||!run?<p role="alert">This run is unavailable. <button onClick={()=>query.refetch()} className="underline">Try again</button></p>:<section className="rounded-2xl border bg-white p-6" data-testid="garmin-run-summary"><RunSourceBadge run={run}/><h1 className="mt-3 text-3xl font-bold">{run.name}</h1><p className="mt-2 text-gray-600">{new Date(run.startDate).toLocaleString()}</p><dl className="my-6 grid grid-cols-2 gap-6 sm:grid-cols-3">{[['Distance',`${(run.distance/divisor).toFixed(2)} ${miles?'mi':'km'}`],['Duration',`${Math.floor(run.movingTime/60)} min`],['Average pace',seconds===null?'—':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} /${miles?'mi':'km'}`],['Average heart rate',run.averageHeartrate===null?'—':`${Math.round(run.averageHeartrate)} bpm`],['Elevation gain',run.totalElevationGain===null?'—':`${Math.round(run.totalElevationGain)} m`]].map(([label,value])=><div key={label}><dt className="text-sm text-gray-500">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl><p className="text-sm leading-6 text-gray-600">{phone?'Recorded with RunAnalytics on your phone. The GPS route stays on that device.':'This is your private Garmin activity summary.'} Missing measurements stay blank. Run summaries contribute to basic run totals and trends; they are not sent to the AI coach or messaging services.</p>{!phone&&<Link href="/settings#garmin" className="mt-5 inline-block text-teal-800 underline">Manage Garmin data</Link>}</section>}
    {run&&!phone&&<GarminRunInsights id={params.id||''} miles={miles}/>}
    {run&&!phone&&<Link href={'/garmin-send?run='+encodeURIComponent(params.id||'')} className="inline-block rounded-lg border bg-white px-4 py-3 font-medium text-teal-800">Send this route as a Garmin course</Link>}
  </main></div>;
}
