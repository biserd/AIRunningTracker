import {useEffect,useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {apiRequest,queryClient} from '@/lib/queryClient';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {GarminActivityConsent} from './GarminConnect';
import {useToast} from '@/hooks/use-toast';
import type {GarminStatus,GarminRun} from '@shared/garmin';
import {Watch,Loader2,RefreshCw,Download} from 'lucide-react';
import {Link} from 'wouter';
export function GarminConnectionCard({unitPreference='km'}:{unitPreference?:string}) {
  const {toast}=useToast(),[consent,setConsent]=useState(false);
  const status=useQuery<GarminStatus>({queryKey:['/api/garmin/status'],staleTime:0,refetchInterval:30_000});
  const runs=useQuery<{activities:GarminRun[]}>({queryKey:['/api/garmin/activities'],enabled:status.data?.available===true,staleTime:0,refetchInterval:30_000});
  const reload=()=>Promise.all([queryClient.invalidateQueries({queryKey:['/api/garmin/status']}),queryClient.invalidateQueries({queryKey:['/api/garmin/activities']}),queryClient.invalidateQueries({predicate:query=>String(query.queryKey[0])==='/api/runs'||String(query.queryKey[0]).startsWith('/api/runs/')})]);
  useEffect(()=>{
    const result=new URLSearchParams(window.location.search).get('garmin');
    if(!result)return;
    const messages:Record<string,string>={connected:'Garmin connected. Your next synced run will appear here.',permission_required:'Enable Activity Export in Garmin Connect, then reconnect.',denied:'Garmin connection was cancelled.',invalid_state:'The connection expired. Please start again.',failed:'Garmin could not be connected. Try again, or disconnect it from another RunAnalytics account first.'};
    toast({title:result==='connected'?'Garmin connected':'Garmin connection',description:messages[result]||'Please check your Garmin connection.',variant:result==='connected'?'default':'destructive'});
    const url=new URL(window.location.href);url.searchParams.delete('garmin');window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  },[toast]);
  const connect=useMutation({mutationFn:()=>apiRequest('/api/garmin/authorize','POST',{activityConsent:consent||status.data?.connected===true}),onSuccess:data=>{
    const url=new URL(data.url);if(url.origin!=='https://connect.garmin.com')throw new Error('Invalid Garmin destination');window.location.assign(url.toString());
  },onError:()=>toast({title:'Connection unavailable',description:'Please try connecting Garmin again shortly.',variant:'destructive'})});
  const disconnect=useMutation({mutationFn:()=>apiRequest('/api/garmin/disconnect','POST'),onSuccess:async()=>{setConsent(false);await reload();toast({title:'Garmin sync stopped',description:'Your imported Garmin feed was deleted. Garmin disconnection may take a moment to finish.'});},onError:()=>toast({title:'Disconnect failed',description:'Please try again.',variant:'destructive'})});
  const remove=useMutation({mutationFn:(id:string)=>apiRequest('/api/garmin/activities/'+encodeURIComponent(id),'DELETE'),onSuccess:reload,onError:()=>toast({title:'Could not delete activity',variant:'destructive'})});
  const download=useMutation({mutationFn:()=>apiRequest('/api/garmin/export'),onSuccess:data=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='runanalytics-garmin-activities.json';link.click();URL.revokeObjectURL(url);
  },onError:()=>toast({title:'Export unavailable',description:'Please try again.',variant:'destructive'})});
  const connected=status.data?.connected, miles=unitPreference==='miles', divisor=miles?1609.344:1000, label=miles?'mi':'km';
  const pace=(run:GarminRun)=>{if(run.averageSpeed<=0)return '—';const seconds=Math.round(divisor/run.averageSpeed);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} /${label}`;};
  return <Card id="garmin" data-testid="garmin-connection-card">
    <CardHeader><CardTitle className="flex items-center gap-2"><Watch className="h-5 w-5"/>Garmin Connect</CardTitle><CardDescription>Direct activity sync from your Garmin account</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {status.isPending?<p role="status">Checking connection…</p>:status.isError?<p role="alert">Could not check Garmin sync. <Button variant="link" onClick={()=>status.refetch()}>Try again</Button></p>:!status.data?.available?<p>Garmin direct sync is being set up. Your existing Strava connection continues to work.</p>:<>
        <p role="status" className="font-medium">{connected?'Connected':status.data.status==='disconnect_pending'?'Sync stopped; finishing disconnection':status.data.status==='permission_required'?'Activity sharing permission needed':status.data.status==='reconnect_required'?'Please reconnect Garmin':'Not connected'}</p>
        <p className="text-sm text-gray-600">{status.data.lastSyncAt?`Last activity received: ${new Date(status.data.lastSyncAt).toLocaleString()}`:'Waiting for a new run after connection. Sync your watch with Garmin Connect after recording it.'}</p>
        <p className="text-sm text-gray-600">New running summaries appear on your dashboard and in Activities. Earlier Garmin activity history is not imported. Clear matches with Strava count once, with both sources labeled. Garmin summaries stay outside the AI coach and messaging services.</p>
        {!connected&&status.data.status!=='disconnect_pending'&&<>
          <GarminActivityConsent checked={consent} onChange={setConsent}/>
          <Button mutation onClick={()=>connect.mutate()} disabled={!consent||connect.isPending} data-testid="connect-garmin">{connect.isPending?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Watch className="mr-2 h-4 w-4"/>}{connect.isPending?'Opening Garmin…':'Connect with Garmin'}</Button>
        </>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/recovery">Health, sleep and recovery</Link></Button>
          {connected&&<Button variant="outline" onClick={()=>connect.mutate()} disabled={connect.isPending}>Review Garmin permissions</Button>}
          <Button variant="outline" onClick={()=>reload()} disabled={status.isFetching||runs.isFetching}><RefreshCw className="mr-2 h-4 w-4"/>Refresh status</Button>
          {!!status.data.activityCount&&<Button variant="outline" onClick={()=>download.mutate()} disabled={download.isPending}><Download className="mr-2 h-4 w-4"/>Export Garmin runs</Button>}
          {status.data.status!=='not_connected'&&<Button variant="destructive" disabled={disconnect.isPending||status.data.status==='disconnect_pending'} onClick={()=>{if(window.confirm('Stop Garmin sync and delete your imported Garmin feed? Your original activities in Garmin Connect will remain.'))disconnect.mutate();}}>Disconnect and delete feed</Button>}
        </div>
        {runs.isError&&<p role="alert">Could not load Garmin runs. Please refresh status.</p>}
        {!!runs.data?.activities.length&&<div><h3 className="font-semibold mb-2">Recent Garmin runs</h3><p className="mb-3 text-xs text-gray-500">Showing the latest {runs.data.activities.length} of {status.data.activityCount}. Source: Garmin Connect.</p><ul className="divide-y">{runs.data.activities.map(run=><li key={run.id} className="py-3 flex items-start justify-between gap-3"><div><p className="font-medium">{run.name}</p><p className="text-xs text-gray-500">{new Date(run.startDate).toLocaleString()}{run.manual?' · Manually entered':''}</p><p className="text-sm mt-1">{(run.distance/divisor).toFixed(2)} {label} · {Math.round(run.duration/60)} min · {pace(run)}{run.averageHeartRate!==null?` · ${Math.round(run.averageHeartRate)} bpm`:''}</p></div><Button variant="ghost" size="sm" disabled={remove.isPending} onClick={()=>{if(window.confirm('Delete this imported Garmin run from RunAnalytics?'))remove.mutate(run.id);}}>Delete</Button></li>)}</ul></div>}
      </>}
    </CardContent>
  </Card>;
}
