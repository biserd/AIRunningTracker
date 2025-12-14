import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
  Footprints, Zap, Mountain, Timer, Coffee, Trash2,
  Link2, Battery, BatteryLow, RefreshCw, MessageSquare, Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
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
  wasAdjusted?: boolean;
  originalWorkoutType?: string | null;
  originalDistanceKm?: number | null;
}

interface PlanWeekExtended extends PlanWeek {
  wasAdjusted?: boolean;
  adjustmentReason?: "tired" | "strong" | "manual" | null;
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
  weeks: (PlanWeek & { 
    days: PlanDay[]; 
    wasAdjusted?: boolean;
    adjustmentReason?: "tired" | "strong" | "manual" | null;
  })[];
  enrichmentStatus?: "pending" | "enriching" | "complete" | "partial" | "failed" | null;
  enrichedWeeks?: number | null;
  enrichmentError?: string | null;
}

const workoutTypeIcons: Record<string, typeof Footprints> = {
  easy: Footprints,
  long: Mountain,
  long_run: Mountain,
  tempo: Zap,
  intervals: Timer,
  recovery: Coffee,
  rest: Coffee,
  fartlek: Zap,
  hills: Mountain,
  progression: Zap,
};

const workoutTypeColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  long: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  long_run: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  tempo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  intervals: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  recovery: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  rest: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  fartlek: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  hills: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  progression: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Map full day names to database abbreviations (Mon, Tue, Wed, etc.)
const dayNameToDbKey: Record<string, string> = {
  "Sunday": "Sun",
  "Monday": "Mon",
  "Tuesday": "Tue",
  "Wednesday": "Wed",
  "Thursday": "Thu",
  "Friday": "Fri",
  "Saturday": "Sat",
};

export default function TrainingPlanDetail() {
  const [, params] = useRoute("/training-plans/:planId");
  const planId = params?.planId;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ enrichedWeeks: number; totalWeeks: number; status: string } | null>(null);
  const [sseFailed, setSseFailed] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  
  const { data: dashboardData } = useQuery<{ user?: { unitPreference?: string } }>({
    queryKey: [`/api/dashboard/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });
  
  const useMiles = dashboardData?.user?.unitPreference === "miles";
  
  const { data: plan, isLoading, refetch } = useQuery<TrainingPlanDetail>({
    queryKey: [`/api/training/plans/${planId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && !!planId,
  });
  
  // SSE subscription for enrichment progress
  useEffect(() => {
    if (!planId || !plan) return;
    
    // Only subscribe if plan is currently enriching
    if (plan.enrichmentStatus !== "enriching") {
      setEnrichmentProgress(null);
      return;
    }
    
    // Initialize progress from plan data
    setEnrichmentProgress({
      enrichedWeeks: plan.enrichedWeeks || 0,
      totalWeeks: plan.totalWeeks,
      status: plan.enrichmentStatus
    });
    
    // Get auth token for SSE connection
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    // Create SSE connection with auth
    const eventSource = new EventSource(
      `/api/training/plans/${planId}/enrichment-stream?token=${encodeURIComponent(token)}`
    );
    sseRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEnrichmentProgress({
          enrichedWeeks: data.enrichedWeeks,
          totalWeeks: data.totalWeeks,
          status: data.status
        });
        
        // If enrichment is complete or failed, close connection and refetch
        if (data.status === "complete" || data.status === "partial" || data.status === "failed") {
          eventSource.close();
          sseRef.current = null;
          refetch();
          
          if (data.status === "complete") {
            toast({
              title: "Plan enrichment complete!",
              description: "All your workouts now have personalized coaching details.",
            });
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };
    
    eventSource.onerror = () => {
      // Fall back to polling if SSE fails
      eventSource.close();
      sseRef.current = null;
      setSseFailed(true); // Trigger polling fallback
    };
    
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [planId, plan?.enrichmentStatus, plan?.totalWeeks, plan?.enrichedWeeks, refetch, toast]);
  
  // Polling fallback for enrichment progress (activates when SSE fails)
  useEffect(() => {
    if (!planId || !plan) return;
    if (plan.enrichmentStatus !== "enriching") {
      setSseFailed(false); // Reset on completion
      return;
    }
    if (!sseFailed && sseRef.current) return; // SSE is active and working, skip polling
    
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/training/plans/${planId}/enrichment-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEnrichmentProgress({
            enrichedWeeks: data.enrichedWeeks,
            totalWeeks: data.totalWeeks,
            status: data.status
          });
          
          if (data.status !== "enriching") {
            clearInterval(pollInterval);
            refetch();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [planId, plan?.enrichmentStatus, sseFailed, refetch]);
  
  const [, navigate] = useLocation();
  
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
  
  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/training/plans/${planId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/plans"] });
      toast({
        title: "Plan deleted",
        description: "Your training plan has been removed.",
      });
      navigate("/training-plans");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete plan. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/training/plans/${planId}/auto-link`, "POST");
    },
    onSuccess: (data: { 
      linkedCount: number; 
      adherenceSummary?: { 
        summary: string; 
        callout: string | null;
        last7Days: { adherenceRate: number; planned: number; completed: number };
      } 
    }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/plans/${planId}`] });
      
      const summary = data.adherenceSummary?.summary || 
        (data.linkedCount > 0 ? `Linked ${data.linkedCount} activities.` : "No new activities to link.");
      
      toast({
        title: "Sync complete",
        description: summary,
      });
      
      // Show callout as separate toast if present
      if (data.adherenceSummary?.callout) {
        const adherenceRate = data.adherenceSummary?.last7Days?.adherenceRate ?? 75;
        setTimeout(() => {
          toast({
            title: adherenceRate >= 90 ? "Great work!" : "Training update",
            description: data.adherenceSummary?.callout,
            variant: adherenceRate < 50 ? "destructive" : "default",
          });
        }, 500);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync activities. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const adjustPlanMutation = useMutation({
    mutationFn: async (feeling: "tired" | "strong") => {
      return await apiRequest(`/api/training/plans/${planId}/adjust`, "POST", { feeling });
    },
    onSuccess: (data: { 
      feeling: string; 
      adaptedWeeks?: number;
      adjustedDays?: number;
      changes?: string[];
      coachNote?: string;
      syncPerformed?: boolean;
    }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/plans/${planId}`] });
      toast({
        title: data.feeling === "tired" ? "Recovery mode activated" : "Plan progressed",
        description: data.coachNote || (data.feeling === "tired" 
          ? "Next week has been softened based on your feedback."
          : "Plan maintained - keep up the great work!"),
      });
      
      if (data.syncPerformed) {
        toast({
          title: "Activities synced",
          description: "We synced your recent activities before adjusting.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to adjust plan. Please try again.",
        variant: "destructive",
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
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this training plan? This cannot be undone.")) {
                deletePlanMutation.mutate();
              }
            }}
            disabled={deletePlanMutation.isPending}
            data-testid="button-delete-plan"
          >
            {deletePlanMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" /> Delete Plan</>
            )}
          </Button>
        </div>
        
        {/* Enrichment Progress Banner */}
        {(plan.enrichmentStatus === "enriching" || enrichmentProgress?.status === "enriching") && (
          <Card className="mb-6 border-l-4 border-l-strava-orange bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900" data-testid="card-enrichment-progress">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-strava-orange/10 rounded-full">
                  <Sparkles className="w-5 h-5 text-strava-orange animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      AI is customizing your workouts...
                    </span>
                    <span className="text-sm text-strava-orange font-semibold">
                      {enrichmentProgress?.enrichedWeeks || plan.enrichedWeeks || 0}/{enrichmentProgress?.totalWeeks || plan.totalWeeks} weeks
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-strava-orange transition-all duration-500 ease-out"
                      style={{ 
                        width: `${Math.round(((enrichmentProgress?.enrichedWeeks || plan.enrichedWeeks || 0) / (enrichmentProgress?.totalWeeks || plan.totalWeeks)) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Personalized pace targets and coaching tips are being added
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Enrichment Complete/Partial/Failed Status */}
        {plan.enrichmentStatus === "partial" && (
          <Card className="mb-6 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="card-enrichment-partial">
            <CardContent className="py-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Some workout details couldn't be generated. Your plan is still usable with template workouts.
              </p>
            </CardContent>
          </Card>
        )}
        
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
        
        {/* Plan Actions: Auto-link and Adjustment buttons */}
        <Card className="mb-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoLinkMutation.mutate()}
                disabled={autoLinkMutation.isPending}
                data-testid="button-auto-link"
              >
                {autoLinkMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Sync Activities
              </Button>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              
              <span className="text-sm text-gray-500 hidden sm:inline">How are you feeling?</span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustPlanMutation.mutate("tired")}
                disabled={adjustPlanMutation.isPending}
                className="border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                data-testid="button-feeling-tired"
              >
                {adjustPlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <BatteryLow className="w-4 h-4 mr-2 text-orange-500" />
                )}
                I'm tired
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustPlanMutation.mutate("strong")}
                disabled={adjustPlanMutation.isPending}
                className="border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                data-testid="button-feeling-strong"
              >
                {adjustPlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Battery className="w-4 h-4 mr-2 text-green-500" />
                )}
                I'm strong
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Week Stats Card */}
        {currentWeekData?.plannedDistanceKm && (
          <Card className="mb-4 border-l-4 border-l-strava-orange">
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-gray-500">Target Distance</span>
                  <p className="text-2xl font-bold" data-testid="text-week-distance">
                    {formatDistance(currentWeekData.plannedDistanceKm, useMiles)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Coach Notes Panel - always show when notes exist */}
        {currentWeekData?.coachNotes && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" data-testid="card-coach-notes">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Coach Notes</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{currentWeekData.coachNotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {dayNames.map((dayName, index) => {
            const dayKey = dayNameToDbKey[dayName]; // Use "Mon", "Tue", etc. to match DB
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
                    <div className="flex items-center gap-1">
                      {dayData?.wasAdjusted && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid="badge-adjusted">
                          Adjusted
                        </Badge>
                      )}
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
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
