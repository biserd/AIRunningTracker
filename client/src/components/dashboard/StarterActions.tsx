import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Footprints, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatRunDistance, formatRunPace, runUnitLabels } from "@shared/runFormatting";
import type { FeedRun } from "@shared/runningFeed";
import { STARTER_GOALS, STARTER_SOURCE, STARTER_WEEK_URL, starterWeekWorkouts, type SavedStarterWeek } from "@shared/starterJourney";

const exploreRunHref = (href: string) => `${href}${href.includes("?") ? "&" : "?"}from=${STARTER_SOURCE}`;

export function StarterActions({ runs, units, onOpenCoach }: {
  runs: FeedRun[];
  units?: string;
  onOpenCoach: () => void;
}) {
  const saved = useQuery<{ week: SavedStarterWeek | null }>({
    queryKey: ["/api/onboarding/starter-week"], queryFn: () => apiRequest("/api/onboarding/starter-week"), staleTime: 60_000,
  });
  const week = saved.data?.week;
  const run = runs[0];
  const runUrl = run?.detailUrl;
  const baseline = run && run.distance > 0 && run.movingTime > 0
    ? runs.slice(1).find(other => other.source === run.source && other.movingTime > 0 && Math.abs(other.distance - run.distance) <= run.distance * 0.2)
    : undefined;
  const { distanceUnit, paceUnit } = runUnitLabels(units);
  const linkClass = "flex items-start gap-3 rounded-xl border bg-white p-4 text-left hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600";
  return (
    <section aria-labelledby="starter-heading" className="mb-8" data-testid="starter-actions">
      <h2 id="starter-heading" className="text-xl font-bold text-charcoal">Your first three things to try</h2>
      <p className="mt-1 text-sm text-gray-600">Explore your running and decide what to do next. No trial needed.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Link className={linkClass} href={runUrl ? exploreRunHref(runUrl) : `/tools/race-predictor?source=${STARTER_SOURCE}`} data-testid="starter-explore">
          <Footprints className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" aria-hidden="true" />
          <span className="grow"><span className="block font-semibold">{runUrl ? "Explore my last run" : "Predict my race time"}</span><span className="text-sm text-gray-600">{runUrl ? "See your run details and the numbers behind your effort." : "Use a recent effort while your runs are syncing, or without connecting a watch."}</span></span>
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
        <Link className={linkClass} href={STARTER_WEEK_URL} data-testid="starter-plan">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" aria-hidden="true" />
          <span className="grow"><span className="block font-semibold">{week ? "Open my saved week" : "Preview my first week"}</span><span className="text-sm text-gray-600">Pick a goal and running days. Save the week to revisit it here.</span></span>
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
        <button type="button" className={linkClass} onClick={onOpenCoach} data-testid="starter-coach">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" aria-hidden="true" />
          <span className="grow"><span className="block font-semibold">Ask the coach</span><span className="text-sm text-gray-600">Start with a question about what to run next. Edit it before sending.</span></span>
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      </div>
      {baseline && <details className="mt-4 rounded-xl border bg-white p-4">
        <summary className="cursor-pointer font-semibold">Compare with a run of a similar distance</summary>
        <p className="mt-2 text-sm text-gray-600">Your latest run and the most recent displayed run within 20% of its distance, from the same source. These times don’t account for terrain or effort.</p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[run, baseline].map(item => <li key={item.id}><Link className="font-semibold underline" href={exploreRunHref(item.detailUrl)}>{item.name}</Link>
            <span className="block">{formatRunDistance(item.distance, units)} {distanceUnit} · {formatRunPace(item.movingTime,item.distance,units)} {paceUnit}</span>
          </li>)}
        </ul>
      </details>}
      {week && <div className="mt-4 rounded-xl border bg-white p-4" data-testid="dashboard-saved-week">
        <h3 className="font-semibold">Your saved Week 1 · {STARTER_GOALS[week.goalType]}</h3>
        <ul className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
          {starterWeekWorkouts(week.preferredDays, week.includeSpeedwork, week.includeLongRuns).map(({ day, workout }) => <li key={day}><strong>{day}:</strong> {workout}</li>)}
        </ul>
      </div>}
    </section>
  );
}
