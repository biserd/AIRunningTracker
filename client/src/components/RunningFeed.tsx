import {Link} from 'wouter';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {sourceLabel,type FeedRun} from '@shared/runningFeed';
import {useMutation} from '@tanstack/react-query';
import {apiRequest,queryClient} from '@/lib/queryClient';
import {useToast} from '@/hooks/use-toast';
import {Button} from '@/components/ui/button';
export function RunSourceBadge({run}:{run:Pick<FeedRun,'sources'|'possibleDuplicate'>}) {
  return <span className="mt-1 inline-flex flex-wrap gap-2 text-xs font-medium text-teal-800"><span title={run.sources.length===2?'Matched by start time, distance and duration. Source copies stay separate.':undefined}>{sourceLabel(run)}</span>{run.possibleDuplicate&&<span className="text-amber-800">Possible overlap · kept separate</span>}</span>;
}
export function SeparateRunCopies({run}:{run:Pick<FeedRun,'sources'|'stravaRecordId'|'garminActivityId'|'separateMatch'>}) {
  const {toast}=useToast(),pair=run.separateMatch||(run.sources.length===2?{stravaRecordId:run.stravaRecordId,garminActivityId:run.garminActivityId}:null);
  const mutation=useMutation({mutationFn:()=>apiRequest('/api/runs/keep-separate',run.separateMatch?'DELETE':'POST',pair),onSuccess:async()=>{await Promise.all(['/api/runs','/api/runs/overview','/api/runs/calendar'].map(path=>queryClient.invalidateQueries({queryKey:[path]})));},onError:()=>toast({title:'Could not update matching',description:'Please try again.',variant:'destructive'})});
  return pair?<Button type="button" variant="outline" size="sm" mutation disabled={mutation.isPending} onClick={()=>mutation.mutate()}>{run.separateMatch?'Check for duplicate again':'Keep as two runs'}</Button>:null;
}
export function RunFeedNotice(){return <p className="text-sm leading-6 text-gray-600">Runs from your connected services appear together. Clear Garmin and Strava matches count once; possible overlaps stay separate. Durations use each source’s reported time.</p>;}
export function RecentFeedRuns({runs,units}:{runs:FeedRun[];units:string}) {
  const divisor=units==='miles'?1609.344:1000;
  return <Card data-testid="combined-recent-runs"><CardHeader><CardTitle className="flex items-center justify-between">Recent runs<Link href="/activities" className="text-sm font-medium text-teal-800 underline">View all</Link></CardTitle></CardHeader><CardContent>
    {runs.length===0?<p className="text-sm leading-6 text-gray-600">Your next synced Garmin run will appear here, or connect Strava to import available history. <Link href="/settings#garmin" className="text-teal-800 underline">Manage connections</Link></p>:<div className="divide-y">{runs.slice(0,5).map(run=><Link key={run.id} href={run.detailUrl} className="flex flex-wrap items-center justify-between gap-3 py-4" data-testid={'feed-run-'+run.id}><div><p className="font-semibold text-charcoal">{run.name}</p><p className="text-xs text-gray-500">{new Date(run.startDate).toLocaleString()}</p><RunSourceBadge run={run}/></div><p className="text-sm font-medium">{(run.distance/divisor).toFixed(2)} {units==='miles'?'mi':'km'} · {Math.round(run.movingTime/60)} min</p></Link>)}</div>}
  </CardContent></Card>;
}
