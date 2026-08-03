import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getQueryFn } from "@/lib/queryClient";

interface PlanSummary {
  id: number;
  status: string;
  goalType: string;
}

interface PlanDay {
  id: number;
  date: string;
  title: string;
  workoutType: string;
  status: string;
  plannedDurationMins?: number | null;
}

interface CurrentWeek {
  weekNumber: number;
  days: PlanDay[];
}

export default function ThisWeekPlan() {
  const { data: plans = [] } = useQuery<PlanSummary[]>({
    queryKey: ["/api/training/plans"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const planList = Array.isArray(plans) ? plans : [];
  const activePlan = planList.find((plan) => plan.status === "active") ?? planList.find((plan) => plan.status === "draft");

  const { data: currentWeek } = useQuery<CurrentWeek | null>({
    queryKey: activePlan ? [`/api/training/plans/${activePlan.id}/current-week`] : ["/api/training/plans/no-current-week"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(activePlan),
    retry: false,
  });

  if (!activePlan) {
    return (
      <Card data-testid="card-this-week-plan-empty">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <h2 className="font-semibold text-charcoal">Set a race or weekly goal</h2>
              <p className="mt-1 text-sm text-gray-500">Turn the dashboard into a simple plan-versus-actual view.</p>
            </div>
          </div>
          <Link href="/training-plans"><Button variant="outline">Set my goal <ChevronRight className="ml-1 h-4 w-4" /></Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (!currentWeek) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold text-charcoal">Your training plan</h2>
            <p className="text-sm text-gray-500">Open the plan to see or adjust your next week.</p>
          </div>
          <Link href={`/training-plans/${activePlan.id}`}><Button variant="outline">View plan</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const workouts = currentWeek.days.filter((day) => day.workoutType !== "rest");
  const completed = workouts.filter((day) => day.status === "completed").length;
  const nextWorkout = workouts
    .filter((day) => day.status === "pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const progress = workouts.length ? (completed / workouts.length) * 100 : 0;

  return (
    <Card data-testid="card-this-week-plan">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">This week vs plan</p>
            <h2 className="mt-1 text-lg font-bold text-charcoal">{completed} of {workouts.length} runs completed</h2>
          </div>
          <Link href={`/training-plans/${activePlan.id}`}><Button size="sm" variant="ghost">View plan <ChevronRight className="ml-1 h-4 w-4" /></Button></Link>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <div className="mt-4 flex items-start gap-2 text-sm">
          {nextWorkout ? (
            <>
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p><span className="font-medium text-charcoal">Next:</span> {nextWorkout.title}{nextWorkout.plannedDurationMins ? ` · ${nextWorkout.plannedDurationMins} min` : ""}</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <p className="font-medium text-green-700">This week’s planned runs are complete.</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
