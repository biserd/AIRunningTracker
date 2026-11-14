import {Link} from 'wouter';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {sourceLabel,type FeedRun} from '@shared/runningFeed';
import {useMutation} from '@tanstack/react-query';
import {apiRequest,queryClient} from '@/lib/queryClient';
import {useToast} from '@/hooks/use-toast';
import {Button} from '@/components/ui/button';
import {Activity, ArrowRight, ChevronRight, Route, Timer, Zap} from 'lucide-react';
import {formatRunDistance, formatRunDuration, formatRunPace, runUnitLabels} from '@shared/runFormatting';
export function RunSourceBadge({run}:{run:Pick<FeedRun,'sources'|'possibleDuplicate'>}) {
  return <span className="mt-1 inline-flex flex-wrap gap-2 text-xs font-medium text-teal-800"><span title={run.sources.length===2?'Matched by start time, distance and duration. Source copies stay separate.':undefined}>{sourceLabel(run)}</span>{run.possibleDuplicate&&<span className="text-amber-800">Possible overlap · kept separate</span>}</span>;
}
export function SeparateRunCopies({run}:{run:Pick<FeedRun,'sources'|'stravaRecordId'|'garminActivityId'|'separateMatch'>}) {
  const {toast}=useToast(),pair=run.separateMatch||(run.sources.length===2?{stravaRecordId:run.stravaRecordId,garminActivityId:run.garminActivityId}:null);
  const mutation=useMutation({mutationFn:()=>apiRequest('/api/runs/keep-separate',run.separateMatch?'DELETE':'POST',pair),onSuccess:async()=>{await Promise.all(['/api/runs','/api/runs/overview','/api/runs/calendar'].map(path=>queryClient.invalidateQueries({queryKey:[path]})));},onError:()=>toast({title:'Could not update matching',description:'Please try again.',variant:'destructive'})});
  return <div className="flex flex-wrap gap-2">{run.sources.length===2&&run.garminActivityId&&<Link href={'/runs/garmin/'+encodeURIComponent(run.garminActivityId)} className="self-center text-xs text-teal-800 underline">View Garmin details</Link>}{pair&&<Button type="button" variant="outline" size="sm" mutation disabled={mutation.isPending} onClick={()=>mutation.mutate()}>{run.separateMatch?'Check for duplicate again':'Keep as two runs'}</Button>}</div>;
}
export function RunFeedNotice(){return <p className="text-sm leading-6 text-gray-600">Runs from your connected services appear together. Clear Garmin and Strava matches count once; possible overlaps stay separate. Durations use each source’s reported time.</p>;}
const recentRunDate = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

function recentRunDuration(seconds: number) {
  const total = Math.round(seconds);
  if (total < 3600) return formatRunDuration(total);
  return `${Math.floor(total / 3600)}:${formatRunDuration(total % 3600).padStart(5, '0')}`;
}

export function RecentFeedRuns({runs, units}: {runs: FeedRun[]; units: string}) {
  const {distanceUnit, paceUnit} = runUnitLabels(units);
  return (
    <Card data-testid="combined-recent-runs">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-800">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          Recent runs
        </CardTitle>
        <Link href="/activities" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-teal-800 hover:underline">
          View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm leading-6 text-gray-600">Your runs will appear here after they sync. <Link href="/settings#garmin" className="text-teal-800 underline">Manage connections</Link></p>
        ) : (
          <ul className="space-y-2.5">
            {runs.slice(0, 5).map((run, index) => {
              const latest = index === 0;
              const hasDistance = Number.isFinite(run.distance) && run.distance > 0;
              const hasTime = Number.isFinite(run.movingTime) && run.movingTime > 0;
              const date = new Date(run.startDate);
              const metrics = [
                {label: 'Distance', icon: Route, value: hasDistance ? `${formatRunDistance(run.distance, units)} ${distanceUnit}` : null},
                {label: run.source === 'garmin' ? 'Duration' : 'Moving time', icon: Timer, value: hasTime ? recentRunDuration(run.movingTime) : null},
                {label: 'Avg. pace', icon: Zap, value: hasTime && hasDistance ? `${formatRunPace(run.movingTime, run.distance, units)} ${paceUnit}` : null},
              ];
              return (
                <li key={run.id}>
                  <Link
                    href={run.detailUrl}
                    className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-xl border px-3 py-3 transition-colors hover:border-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.95fr)_auto] sm:px-4 ${latest ? 'border-orange-200 bg-orange-50/70' : 'border-gray-200 bg-gray-50/70 hover:bg-orange-50/40'}`}
                    data-testid={'feed-run-'+run.id}
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-charcoal group-hover:underline group-hover:underline-offset-2">{run.name}</p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-600">
                        {Number.isFinite(date.getTime()) && <time dateTime={date.toISOString()} title={date.toLocaleString()}>{recentRunDate.format(date)}</time>}
                        <RunSourceBadge run={run} />
                      </div>
                    </div>
                    <dl className="col-span-2 row-start-2 grid grid-cols-3 gap-2 rounded-lg bg-white/90 px-2.5 py-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:px-3">
                      {metrics.map(({label, icon: Icon, value}) => (
                        <div key={label}>
                          <dt className="flex items-center gap-1 text-[11px] leading-tight text-gray-600"><Icon className="hidden h-3 w-3 shrink-0 text-orange-800 sm:block" aria-hidden="true" />{label}</dt>
                          <dd className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{value ?? <span className="font-normal text-gray-600"><span aria-hidden="true">—</span><span className="sr-only">Not available</span></span>}</dd>
                        </div>
                      ))}
                    </dl>
                    <ChevronRight className="col-start-2 row-start-1 h-5 w-5 text-gray-500 group-hover:text-orange-800 sm:col-start-3" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
