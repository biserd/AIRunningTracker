import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute } from "wouter";
import { 
  ChevronLeft, ChevronRight, Calendar, Target, Clock, 
  Loader2, CheckCircle, Play, Pause, RotateCcw,
  Footprints, Zap, Mountain, Timer, Coffee
} from "lucide-react";
import { format, parseISO, addDays, startOfWeek } from "date-fns";

const KM_TO_MILES = 0.621371;

function formatDistance(km: number | null | undefined, useMiles: boolean): string {
  if (!km) return "";
  if (useMiles) {
    return `${(km * KM_TO_MILES).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

interface PlanWeek {
  id: number;
  weekNumber: number;
  weekType: string | null;
  plannedDistanceKm: number | null;
  coachNotes: string | null;
}

interface PlanDay {
  id: number;
  weekId: number;
  dayOfWeek: string;
  workoutType: string | null;
  title: string | null;
  description: string | null;
  plannedDistanceKm: number | null;
  plannedDurationMins: number | null;
  targetPace: string | null;
  intensity: string | null;
  status: string | null;
  linkedActivityId: number | null;
}

interface TrainingPlanDetail {
  id: number;
  userId: number;
  goalType: string;
  targetTime: string | null;
  raceDate: string | null;
  totalWeeks: number;
  currentWeek: number | null;
  status: string;
  coachNotes: string | null;
  createdAt: string;
  weeks: (PlanWeek & { days: PlanDay[] })[];
}

const workoutTypeIcons: Record<string, typeof Footprints> = {
  easy: Footprints,
  long: Mountain,
  tempo: Zap,
  intervals: Timer,
  recovery: Coffee,
  rest: Coffee,
};

const workoutTypeColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  long: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  tempo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  intervals: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  recovery: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  rest: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TrainingPlanDetail() {
  const [, params] = useRoute("/training-plans/:planId");
  const planId = params?.planId;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  
  const { data: dashboardData } = useQuery<{ user?: { unitPreference?: string } }>({
    queryKey: [`/api/dashboard/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });
  
  const useMiles = dashboardData?.user?.unitPreference === "miles";
  
  const { data: plan, isLoading } = useQuery<TrainingPlanDetail>({
    queryKey: [`/api/training/plans/${planId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && !!planId,
  });
  
  const completeDayMutation = useMutation({
    mutationFn: async ({ dayId, status }: { dayId: number; status: string }) => {
      return await apiRequest(`/api/training/days/${dayId}`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/plans/${planId}`] });
      toast({
        title: "Workout updated",
        description: "Your progress has been saved.",
      });
    },
  });
  
  const formatPace = (minPerKm: number | null | undefined) => {
    if (!minPerKm) return null;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}/km`;
  };
  
  const goalTypeLabels: Record<string, string> = {
    "5k": "5K",
    "10k": "10K",
    "half_marathon": "Half Marathon",
    "marathon": "Marathon",
    "general_fitness": "General Fitness",
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strava-orange" />
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-6xl text-center">
          <h1 className="text-2xl font-bold mb-4">Plan not found</h1>
          <Link href="/training-plans">
            <Button>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          </Link>
        </main>
      </div>
    );
  }
  
  const currentWeekData = plan.weeks.find(w => w.weekNumber === selectedWeek);
  const completedDays = currentWeekData?.days.filter(d => d.status === "completed" || d.linkedActivityId).length || 0;
  const totalWorkoutDays = currentWeekData?.days.filter(d => d.workoutType !== "rest").length || 0;
  const weekProgress = totalWorkoutDays > 0 ? (completedDays / totalWorkoutDays) * 100 : 0;
  const isRecoveryWeek = currentWeekData?.weekType === "recovery";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/training-plans">
          <Button variant="ghost" className="mb-4" data-testid="button-back-to-plans">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {goalTypeLabels[plan.goalType] || plan.goalType}
                {plan.targetTime && ` - ${plan.targetTime}`}
              </h1>
              <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                {plan.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
              {plan.raceDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(plan.raceDate), "MMM d, yyyy")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {plan.totalWeeks} weeks
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek <= 1}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center flex-1 mx-4">
            <h2 className="text-xl font-semibold" data-testid="text-current-week">
              Week {selectedWeek} of {plan.totalWeeks}
            </h2>
            {currentWeekData?.weekType && (
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {currentWeekData.weekType} week
              </p>
            )}
            {isRecoveryWeek && (
              <Badge variant="secondary" className="mt-1">Recovery Week</Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(Math.min(plan.totalWeeks, selectedWeek + 1))}
            disabled={selectedWeek >= plan.totalWeeks}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {currentWeekData && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Week Progress</span>
              <span className="font-medium">{completedDays}/{totalWorkoutDays} workouts</span>
            </div>
            <Progress value={weekProgress} className="h-2" />
          </div>
        )}
        
        {currentWeekData?.plannedDistanceKm && (
          <Card className="mb-6 border-l-4 border-l-strava-orange">
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-gray-500">Target Distance</span>
                  <p className="text-2xl font-bold" data-testid="text-week-distance">
                    {formatDistance(currentWeekData.plannedDistanceKm, useMiles)}
                  </p>
                </div>
                {currentWeekData.coachNotes && (
                  <div className="flex-1 border-l pl-6">
                    <span className="text-sm text-gray-500">Coach Notes</span>
                    <p className="text-sm">{currentWeekData.coachNotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {dayNames.map((dayName, index) => {
            const dayKey = dayName.toLowerCase();
            const dayData = currentWeekData?.days.find(d => d.dayOfWeek === dayKey);
            const Icon = dayData?.workoutType ? workoutTypeIcons[dayData.workoutType] || Footprints : Coffee;
            const colorClass = dayData?.workoutType ? workoutTypeColors[dayData.workoutType] || workoutTypeColors.rest : workoutTypeColors.rest;
            const isCompleted = dayData?.status === "completed" || !!dayData?.linkedActivityId;
            
            return (
              <Card 
                key={index}
                className={`${isCompleted ? "ring-2 ring-green-500" : ""} transition-all hover:shadow-md`}
                data-testid={`card-day-${dayKey}`}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{dayName.slice(0, 3)}</span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  {dayData && dayData.workoutType !== "rest" ? (
                    <div className="space-y-2">
                      <Badge className={`${colorClass} text-xs`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {dayData.workoutType}
                      </Badge>
                      
                      {dayData.plannedDistanceKm && (
                        <p className="text-sm font-semibold" data-testid={`text-distance-${dayKey}`}>
                          {formatDistance(dayData.plannedDistanceKm, useMiles)}
                        </p>
                      )}
                      
                      {dayData.plannedDurationMins && (
                        <p className="text-xs text-gray-500" data-testid={`text-duration-${dayKey}`}>
                          {dayData.plannedDurationMins} min
                        </p>
                      )}
                      
                      {dayData.targetPace && (
                        <p className="text-xs text-gray-500" data-testid={`text-pace-${dayKey}`}>
                          {dayData.targetPace}
                        </p>
                      )}
                      
                      {dayData.title && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" data-testid={`text-title-${dayKey}`}>
                          {dayData.title}
                        </p>
                      )}
                      
                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        className={`w-full mt-2 ${!isCompleted ? "bg-strava-orange hover:bg-orange-600" : ""}`}
                        onClick={() => completeDayMutation.mutate({ 
                          dayId: dayData.id, 
                          status: isCompleted ? "pending" : "completed"
                        })}
                        disabled={completeDayMutation.isPending}
                        data-testid={`button-complete-day-${dayKey}`}
                      >
                        {completeDayMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isCompleted ? (
                          <><RotateCcw className="w-3 h-3 mr-1" /> Undo</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Done</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <Coffee className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Rest Day</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {plan.coachNotes && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Plan Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">{plan.coachNotes}</p>
            </CardContent>
          </Card>
        )}
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Week Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {plan.weeks.map((week) => (
                <button
                  key={week.weekNumber}
                  onClick={() => setSelectedWeek(week.weekNumber)}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    week.weekNumber === selectedWeek
                      ? "bg-strava-orange text-white border-strava-orange"
                      : week.weekType === "recovery"
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-strava-orange"
                  }`}
                  data-testid={`button-week-${week.weekNumber}`}
                >
                  W{week.weekNumber}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
