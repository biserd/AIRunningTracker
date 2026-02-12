import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute } from "wouter";
import { 
  ChevronLeft, ChevronRight, Calendar, Target, Clock, 
  Loader2, CheckCircle, Play, Pause, RotateCcw,
  Footprints, Zap, Mountain, Timer, Coffee, Trash2,
  Link2, Battery, BatteryLow, RefreshCw, MessageSquare, Sparkles,
  Sun, ArrowRight, Dumbbell, MoreVertical, Download, Archive, Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { format, parseISO, addDays, startOfWeek, isToday, isBefore, isAfter, startOfDay, addWeeks } from "date-fns";

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
  phaseName: string | null;
  plannedVertGainM: number | null;
  plannedLongRunDurationMins: number | null;
  whyThisWeek: string | null;
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
  isBackToBackLongRun?: boolean;
  fuelingPractice?: boolean;
  plannedVertGainM?: number | null;
  goalContribution?: Record<string, number> | null;
}

interface PlanWeekExtended extends PlanWeek {
  wasAdjusted?: boolean;
  adjustmentReason?: "tired" | "strong" | "manual" | null;
}

interface PlanGoal {
  goalType: string;
  raceDate?: string;
  targetTime?: string;
  priority: "primary" | "secondary";
  terrainType?: string;
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
  goals?: PlanGoal[] | null;
  weeks: (PlanWeek & { 
    days: PlanDay[]; 
    wasAdjusted?: boolean;
    adjustmentReason?: "tired" | "strong" | "manual" | null;
    goalSplit?: Record<string, number> | null;
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
  back_to_back_long: ArrowRight,
  fueling_practice: Battery,
  cross_training: Dumbbell,
  race: Target,
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
  back_to_back_long: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  fueling_practice: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  cross_training: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  race: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const phaseColors: Record<string, string> = {
  base: "bg-green-500",
  build: "bg-blue-500",
  build2_specific: "bg-purple-500",
  peak: "bg-red-500",
  taper: "bg-amber-500",
  recovery: "bg-gray-400",
};

const goalTypeLabels: Record<string, string> = {
  "5k": "5K",
  "10k": "10K",
  "half_marathon": "HM",
  "marathon": "M",
  "50k": "50K",
  "50_mile": "50M",
  "100k": "100K",
  "100_mile": "100M",
  "general_fitness": "Fit",
};

const goalColors: Record<string, string> = {
  "5k": "text-emerald-600 dark:text-emerald-400",
  "10k": "text-cyan-600 dark:text-cyan-400",
  "half_marathon": "text-blue-600 dark:text-blue-400",
  "marathon": "text-violet-600 dark:text-violet-400",
  "50k": "text-orange-600 dark:text-orange-400",
  "50_mile": "text-red-600 dark:text-red-400",
  "100k": "text-rose-600 dark:text-rose-400",
  "100_mile": "text-pink-600 dark:text-pink-400",
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
  const [adjustmentPreview, setAdjustmentPreview] = useState<{ feeling: "tired" | "strong"; open: boolean }>({ feeling: "tired", open: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    targetTime: "",
    raceDate: "",
    daysPerWeek: 4,
    preferredDays: [] as string[],
    terrainType: "road",
  });
  
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
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return await apiRequest(`/api/training/plans/${planId}/settings`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/plans/${planId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/plans"] });
      setSettingsOpen(false);
      toast({
        title: "Settings saved",
        description: "Your plan settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archivePlanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/training/plans/${planId}/status`, "PATCH", { status: "archived" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/plans"] });
      setArchiveOpen(false);
      toast({
        title: "Plan archived",
        description: "Your training plan has been archived. You can find it in your archived plans.",
      });
      navigate("/training-plans");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportPlan = () => {
    if (!plan) return;
    
    const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows: string[][] = [];
    
    rows.push(["Week", "Phase", "Day", "Workout Type", "Title", "Distance", "Duration (min)", "Target Pace", "Intensity", "Description"]);
    
    plan.weeks.forEach(week => {
      allDays.forEach(dayKey => {
        const day = week.days.find(d => d.dayOfWeek === dayKey);
        if (day) {
          const dist = day.plannedDistanceKm 
            ? (useMiles ? `${(day.plannedDistanceKm * KM_TO_MILES).toFixed(1)} mi` : `${day.plannedDistanceKm.toFixed(1)} km`) 
            : "";
          rows.push([
            `Week ${week.weekNumber}`,
            week.phaseName || week.weekType || "",
            dayKey,
            day.workoutType || "rest",
            day.title || "",
            dist,
            day.plannedDurationMins?.toString() || "",
            day.targetPace || "",
            day.intensity || "",
            (day.description || "").replace(/"/g, '""'),
          ]);
        } else {
          rows.push([
            `Week ${week.weekNumber}`,
            week.phaseName || week.weekType || "",
            dayKey,
            "rest",
            "", "", "", "", "", "",
          ]);
        }
      });
    });
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const planName = `${goalTypeLabels[plan.goalType] || plan.goalType}${plan.targetTime ? ` - ${plan.targetTime}` : ""}`;
    link.href = url;
    link.download = `training-plan-${planName.replace(/[^a-zA-Z0-9]/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Plan exported",
      description: "Your training plan has been downloaded as a CSV file.",
    });
  };

  const openSettings = () => {
    if (!plan) return;
    setSettingsForm({
      targetTime: plan.targetTime || "",
      raceDate: plan.raceDate ? format(parseISO(plan.raceDate), "yyyy-MM-dd") : "",
      daysPerWeek: (plan as any).daysPerWeek || 4,
      preferredDays: (plan as any).preferredDays || [],
      terrainType: (plan as any).terrainType || "road",
    });
    setSettingsOpen(true);
  };

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
    "50k": "50K Ultra",
    "50_mile": "50 Mile Ultra",
    "100k": "100K Ultra",
    "100_mile": "100 Mile Ultra",
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
  
  // Living metrics calculations
  const qualityWorkoutTypes = ["tempo", "intervals", "long", "long_run", "fartlek", "hills", "progression", "back_to_back_long", "fueling_practice"];
  const qualityWorkouts = currentWeekData?.days.filter(d => d.workoutType && qualityWorkoutTypes.includes(d.workoutType)) || [];
  const completedQualityWorkouts = qualityWorkouts.filter(d => d.status === "completed" || d.linkedActivityId).length;
  const totalQualityWorkouts = qualityWorkouts.length;
  
  // Calculate completed distance for the week
  const completedDistanceKm = currentWeekData?.days
    .filter(d => d.status === "completed" || d.linkedActivityId)
    .reduce((sum, d) => sum + (d.plannedDistanceKm || 0), 0) || 0;
  const plannedDistanceKm = currentWeekData?.plannedDistanceKm || 0;
  
  // Find today's workout across all weeks
  const today = new Date();
  const todayDayName = dayNames[today.getDay()];
  const todayDbKey = dayNameToDbKey[todayDayName];
  
  // Calculate which week we're in based on plan start date
  const planStartDate = plan.createdAt ? parseISO(plan.createdAt) : null;
  const currentPlanWeek = planStartDate 
    ? Math.floor((today.getTime() - startOfDay(planStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;
  
  // Find today's workout in the current plan week
  const todayWeekData = currentPlanWeek && currentPlanWeek > 0 && currentPlanWeek <= plan.totalWeeks
    ? plan.weeks.find(w => w.weekNumber === currentPlanWeek)
    : null;
  const todayWorkout = todayWeekData?.days.find(d => d.dayOfWeek === todayDbKey);
  const isTodayCompleted = todayWorkout?.status === "completed" || !!todayWorkout?.linkedActivityId;
  
  // Find next workout if today is rest or completed
  const findNextWorkout = () => {
    if (!todayWeekData) return null;
    
    // Get day index for today (0-6)
    const todayIndex = today.getDay();
    
    // Check remaining days in current week
    for (let i = todayIndex + 1; i < 7; i++) {
      const dayKey = dayNameToDbKey[dayNames[i]];
      const dayWorkout = todayWeekData.days.find(d => d.dayOfWeek === dayKey);
      if (dayWorkout && dayWorkout.workoutType !== "rest" && dayWorkout.status !== "completed" && !dayWorkout.linkedActivityId) {
        return { workout: dayWorkout, dayName: dayNames[i], weekNumber: todayWeekData.weekNumber };
      }
    }
    
    // Check next week
    const nextWeekData = plan.weeks.find(w => w.weekNumber === (todayWeekData.weekNumber + 1));
    if (nextWeekData) {
      for (let i = 0; i < 7; i++) {
        const dayKey = dayNameToDbKey[dayNames[i]];
        const dayWorkout = nextWeekData.days.find(d => d.dayOfWeek === dayKey);
        if (dayWorkout && dayWorkout.workoutType !== "rest" && dayWorkout.status !== "completed" && !dayWorkout.linkedActivityId) {
          return { workout: dayWorkout, dayName: dayNames[i], weekNumber: nextWeekData.weekNumber };
        }
      }
    }
    return null;
  };
  
  const nextWorkoutInfo = (todayWorkout?.workoutType === "rest" || isTodayCompleted) ? findNextWorkout() : null;
  const heroWorkout = nextWorkoutInfo?.workout || todayWorkout;
  const heroWorkoutDay = nextWorkoutInfo?.dayName || todayDayName;
  const isHeroForToday = !nextWorkoutInfo && todayWorkout && todayWorkout.workoutType !== "rest";
  
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
            
            {plan.goals && plan.goals.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {plan.goals.map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <Target className="w-3.5 h-3.5 text-strava-orange" />
                    <span className={`text-sm font-semibold ${goalColors[g.goalType] || "text-gray-700 dark:text-gray-300"}`}>
                      {goalTypeLabels[g.goalType] || g.goalType}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({g.priority})
                    </span>
                    {g.raceDate && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {format(parseISO(g.raceDate), "MMM d")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-plan-menu">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={openSettings}
                data-testid="menu-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={exportPlan}
                data-testid="menu-export"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Plan
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setArchiveOpen(true)}
                data-testid="menu-archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this training plan? This cannot be undone.")) {
                    deletePlanMutation.mutate();
                  }
                }}
                disabled={deletePlanMutation.isPending}
                data-testid="menu-delete"
              >
                {deletePlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        
        {/* Today's / Next Workout Hero Card */}
        {heroWorkout && (
          <Card 
            className={`mb-6 overflow-hidden ${
              heroWorkout.workoutType === "rest" 
                ? "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800"
                : "bg-gradient-to-r from-orange-50 via-orange-100 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/30 border-l-4 border-l-strava-orange"
            }`}
            data-testid="card-hero-workout"
          >
            <CardContent className="py-5 px-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Left: Workout Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isHeroForToday ? (
                      <Badge className="bg-strava-orange text-white">
                        <Sun className="w-3 h-3 mr-1" />
                        Today
                      </Badge>
                    ) : nextWorkoutInfo ? (
                      <Badge variant="secondary">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Next: {heroWorkoutDay}
                      </Badge>
                    ) : null}
                    {heroWorkout.wasAdjusted && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Adjusted
                      </Badge>
                    )}
                  </div>
                  
                  {heroWorkout.workoutType === "rest" ? (
                    <>
                      <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200 mb-1">
                        Rest Day
                      </h3>
                      <p className="text-purple-600 dark:text-purple-300 text-sm">
                        Recovery is when your body adapts and gets stronger. Take it easy today!
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 capitalize">
                        {heroWorkout.title || `${heroWorkout.workoutType} Run`}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {heroWorkout.plannedDistanceKm && (
                          <span className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                            <Target className="w-4 h-4 text-strava-orange" />
                            {formatDistance(heroWorkout.plannedDistanceKm, useMiles)}
                          </span>
                        )}
                        {heroWorkout.plannedDurationMins && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {heroWorkout.plannedDurationMins} min
                          </span>
                        )}
                        {heroWorkout.targetPace && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-4 h-4" />
                            {heroWorkout.targetPace}
                          </span>
                        )}
                        {heroWorkout.workoutType && (
                          <Badge className={workoutTypeColors[heroWorkout.workoutType] || workoutTypeColors.easy}>
                            {(() => {
                              const WorkoutIcon = workoutTypeIcons[heroWorkout.workoutType] || Footprints;
                              return <WorkoutIcon className="w-3 h-3 mr-1" />;
                            })()}
                            {heroWorkout.workoutType}
                          </Badge>
                        )}
                      </div>
                      
                      {heroWorkout.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {heroWorkout.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
                
                {/* Right: Action Button */}
                {heroWorkout.workoutType !== "rest" && (
                  <div className="flex-shrink-0">
                    {isTodayCompleted && isHeroForToday ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-6 h-6" />
                        <span className="font-semibold">Completed!</span>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="bg-strava-orange hover:bg-orange-600 text-white shadow-lg"
                        onClick={() => completeDayMutation.mutate({ 
                          dayId: heroWorkout.id, 
                          status: "completed"
                        })}
                        disabled={completeDayMutation.isPending}
                        data-testid="button-hero-complete"
                      >
                        {completeDayMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-5 h-5 mr-2" />
                        )}
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Rest day encouragement */}
                {heroWorkout.workoutType === "rest" && (
                  <div className="flex-shrink-0 text-center md:text-right">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Coffee className="w-6 h-6" />
                      <span className="text-sm font-medium">Enjoy your rest!</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* No active workout (plan not started or ended) */}
        {!heroWorkout && currentPlanWeek && (currentPlanWeek < 1 || currentPlanWeek > plan.totalWeeks) && (
          <Card className="mb-6 bg-gray-50 dark:bg-gray-800/50 border-dashed" data-testid="card-no-workout">
            <CardContent className="py-5 px-6 text-center">
              <Dumbbell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                {currentPlanWeek < 1 
                  ? "Your plan hasn't started yet. Get ready for your first workout!"
                  : "You've completed your training plan. Congratulations!"
                }
              </p>
            </CardContent>
          </Card>
        )}
        
        {plan.weeks.some(w => w.phaseName) && (
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm overflow-x-auto" data-testid="phase-timeline">
            <div className="flex gap-0.5 min-w-max">
              {plan.weeks.map((week, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedWeek(week.weekNumber)}
                  className={`h-6 flex-1 min-w-[24px] rounded-sm transition-all ${
                    phaseColors[week.weekType || ""] || "bg-gray-300"
                  } ${selectedWeek === week.weekNumber ? "ring-2 ring-offset-1 ring-gray-900 dark:ring-white" : "opacity-70 hover:opacity-100"}`}
                  title={`Week ${week.weekNumber}: ${week.phaseName || week.weekType}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
              {Object.entries(phaseColors).map(([phase, color]) => {
                if (!plan.weeks.some(w => w.weekType === phase)) return null;
                return (
                  <span key={phase} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-sm ${color}`} />
                    {phase === "build2_specific" ? "Race-Specific" : phase.charAt(0).toUpperCase() + phase.slice(1)}
                  </span>
                );
              })}
            </div>
          </div>
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
            {currentWeekData?.phaseName ? (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${phaseColors[currentWeekData.weekType || ""] || "bg-gray-400"}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentWeekData.phaseName}
                </p>
              </div>
            ) : currentWeekData?.weekType && (
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {currentWeekData.weekType === "build2_specific" ? "Race-Specific" : currentWeekData.weekType} week
              </p>
            )}
            {isRecoveryWeek && (
              <Badge variant="secondary" className="mt-1">Recovery Week</Badge>
            )}
            {currentWeekData?.goalSplit && Object.keys(currentWeekData.goalSplit).length > 1 && (
              <div className="mt-2 w-full max-w-[200px]">
                <div className="flex h-2 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                  {Object.entries(currentWeekData.goalSplit).map(([gt, pct], i) => {
                    const colors = ["bg-blue-500", "bg-orange-500", "bg-purple-500"];
                    return (
                      <div
                        key={gt}
                        className={`${colors[i % colors.length]} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${goalTypeLabels[gt] || gt}: ${pct}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-center gap-3 mt-1">
                  {Object.entries(currentWeekData.goalSplit).map(([gt, pct]) => (
                    <span key={gt} className="text-[10px] text-gray-500 dark:text-gray-400">
                      {goalTypeLabels[gt] || gt} {pct}%
                    </span>
                  ))}
                </div>
              </div>
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
        
        {/* Living Week Metrics Card */}
        {currentWeekData && (
          <Card className="mb-6 bg-white dark:bg-gray-800" data-testid="card-week-metrics">
            <CardContent className="py-4 px-5">
              {/* Progress bar at top */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Week {selectedWeek} Progress</span>
                  <span className="font-semibold text-strava-orange">{Math.round(weekProgress)}%</span>
                </div>
                <Progress value={weekProgress} className="h-2" />
              </div>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Distance */}
                <div className="space-y-1" data-testid="metric-distance">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <Target className="w-3 h-3" />
                    Distance
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatDistance(completedDistanceKm, useMiles).replace(/\s+(mi|km)$/, "")}
                    <span className="text-sm font-normal text-gray-400">
                      /{formatDistance(plannedDistanceKm, useMiles)}
                    </span>
                  </p>
                  <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-strava-orange transition-all duration-300"
                      style={{ width: `${plannedDistanceKm > 0 ? Math.min(100, (completedDistanceKm / plannedDistanceKm) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Workouts */}
                <div className="space-y-1" data-testid="metric-workouts">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <Footprints className="w-3 h-3" />
                    Workouts
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {completedDays}
                    <span className="text-sm font-normal text-gray-400">/{totalWorkoutDays}</span>
                  </p>
                  <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${totalWorkoutDays > 0 ? (completedDays / totalWorkoutDays) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Quality Workouts */}
                <div className="space-y-1" data-testid="metric-quality">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <Zap className="w-3 h-3" />
                    Quality
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {completedQualityWorkouts}
                    <span className="text-sm font-normal text-gray-400">/{totalQualityWorkouts}</span>
                  </p>
                  <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${totalQualityWorkouts > 0 ? (completedQualityWorkouts / totalQualityWorkouts) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {(currentWeekData?.plannedVertGainM || currentWeekData?.plannedLongRunDurationMins) && (
                <div className="grid grid-cols-2 gap-4 text-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {currentWeekData.plannedVertGainM && currentWeekData.plannedVertGainM > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Mountain className="w-3 h-3" />
                        Vert Target
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {useMiles ? `${Math.round(currentWeekData.plannedVertGainM * 3.281)} ft` : `${currentWeekData.plannedVertGainM} m`}
                      </p>
                    </div>
                  )}
                  {currentWeekData.plannedLongRunDurationMins && currentWeekData.plannedLongRunDurationMins > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Timer className="w-3 h-3" />
                        Long Run Time
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.floor(currentWeekData.plannedLongRunDurationMins / 60)}h {currentWeekData.plannedLongRunDurationMins % 60}m
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {currentWeekData?.whyThisWeek && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {currentWeekData.whyThisWeek}
                  </p>
                </div>
              )}
              
              {/* Actions row */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
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
                
                <span className="text-sm text-gray-500 hidden sm:inline">Adjust plan:</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustmentPreview({ feeling: "tired", open: true })}
                  disabled={adjustPlanMutation.isPending}
                  className="border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                  data-testid="button-feeling-tired"
                >
                  <BatteryLow className="w-4 h-4 mr-2 text-orange-500" />
                  I'm tired
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustmentPreview({ feeling: "strong", open: true })}
                  disabled={adjustPlanMutation.isPending}
                  className="border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                  data-testid="button-feeling-strong"
                >
                  <Battery className="w-4 h-4 mr-2 text-green-500" />
                  I'm strong
                </Button>
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
            const isSkipped = dayData?.status === "skipped";
            
            // Determine if this day is today
            const isToday = selectedWeek === currentPlanWeek && dayKey === todayDbKey;
            
            // Determine if this day is in the past (missed if not completed)
            const todayIndex = today.getDay();
            const isInPast = selectedWeek < (currentPlanWeek || 0) || 
              (selectedWeek === currentPlanWeek && index < todayIndex);
            const isMissed = isInPast && !isCompleted && !isSkipped && dayData?.workoutType !== "rest";
            
            // Status pill logic
            const getStatusPill = () => {
              if (isCompleted) return { label: "Done", class: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
              if (isSkipped) return { label: "Skipped", class: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" };
              if (isMissed) return { label: "Missed", class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
              return { label: "Planned", class: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" };
            };
            const statusPill = dayData?.workoutType !== "rest" ? getStatusPill() : null;
            
            // Quality workout detection for emphasis
            const isKeyWorkout = dayData?.workoutType && qualityWorkoutTypes.includes(dayData.workoutType);
            
            return (
              <Card 
                key={index}
                className={`${isCompleted ? "ring-2 ring-green-500" : ""} ${isMissed ? "ring-2 ring-red-300 dark:ring-red-700" : ""} ${isToday ? "ring-2 ring-strava-orange shadow-lg" : ""} ${isKeyWorkout && !isCompleted && !isMissed ? "border-l-4 border-l-purple-500" : ""} transition-all hover:shadow-md`}
                data-testid={`card-day-${dayKey}`}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{dayName.slice(0, 3)}</span>
                      {isToday && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-strava-orange text-white" data-testid="badge-today">
                          Today
                        </Badge>
                      )}
                    </div>
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
                      {/* Status pill */}
                      {statusPill && (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusPill.class}`} data-testid={`status-${dayKey}`}>
                            {statusPill.label}
                          </span>
                          {isKeyWorkout && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" data-testid={`badge-key-${dayKey}`}>
                              Key
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge className={`${colorClass} text-xs`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {dayData.workoutType === "back_to_back_long" ? "B2B Long" : 
                           dayData.workoutType === "fueling_practice" ? "Fueling" :
                           dayData.workoutType === "cross_training" ? "Cross Train" :
                           dayData.workoutType}
                        </Badge>
                        {dayData.isBackToBackLongRun && dayData.workoutType !== "back_to_back_long" && (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px] px-1.5">
                            B2B
                          </Badge>
                        )}
                        {dayData.fuelingPractice && dayData.workoutType !== "fueling_practice" && (
                          <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-[10px] px-1.5">
                            Fuel
                          </Badge>
                        )}
                        {dayData.plannedVertGainM && dayData.plannedVertGainM > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5">
                            <Mountain className="w-2.5 h-2.5 mr-0.5" />
                            {useMiles ? `${Math.round(dayData.plannedVertGainM * 3.281)}ft` : `${dayData.plannedVertGainM}m`}
                          </Badge>
                        )}
                        {dayData.goalContribution && Object.keys(dayData.goalContribution).length > 1 && (
                          <Badge className="bg-gray-100 dark:bg-gray-800 text-[10px] px-1.5 py-0 font-medium">
                            {Object.entries(dayData.goalContribution).map(([gt, pct], idx) => (
                              <span key={gt}>
                                {idx > 0 && " / "}
                                <span className={goalColors[gt] || "text-gray-600 dark:text-gray-400"}>
                                  {goalTypeLabels[gt] || gt} {pct}%
                                </span>
                              </span>
                            ))}
                          </Badge>
                        )}
                      </div>
                      
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
                      <p className="text-[10px] text-gray-400 mt-1">Recovery matters</p>
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
            <CardTitle className="text-lg">Training Timeline</CardTitle>
            <CardDescription>
              {currentPlanWeek && currentPlanWeek > 0 && currentPlanWeek <= plan.totalWeeks 
                ? `Week ${currentPlanWeek} of ${plan.totalWeeks}` 
                : `${plan.totalWeeks} weeks total`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Phase legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-gray-600 dark:text-gray-400">Build</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Peak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Taper</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Recovery</span>
              </div>
            </div>
            
            {/* Phase timeline */}
            <div className="relative mb-6">
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {plan.weeks.map((week, idx) => {
                  const phaseColor = week.weekType === "recovery" 
                    ? "bg-purple-500" 
                    : week.weekType === "taper" 
                    ? "bg-green-500"
                    : week.weekType === "peak"
                    ? "bg-red-500"
                    : week.weekType === "build"
                    ? "bg-orange-500"
                    : "bg-blue-500";
                  const isCurrentWeekInTimeline = week.weekNumber === currentPlanWeek;
                  const isSelected = week.weekNumber === selectedWeek;
                  
                  return (
                    <button
                      key={week.weekNumber}
                      onClick={() => setSelectedWeek(week.weekNumber)}
                      className={`flex-1 ${phaseColor} ${isSelected ? "ring-2 ring-offset-1 ring-strava-orange" : ""} ${isCurrentWeekInTimeline ? "relative" : ""} hover:opacity-80 transition-opacity border-r border-white/20 last:border-r-0`}
                      title={`Week ${week.weekNumber} - ${week.weekType || "base"}`}
                      data-testid={`timeline-week-${week.weekNumber}`}
                    >
                      {isCurrentWeekInTimeline && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-strava-orange" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Week markers */}
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-gray-500">W1</span>
                {plan.totalWeeks > 4 && (
                  <span className="text-[10px] text-gray-500">W{Math.floor(plan.totalWeeks / 2)}</span>
                )}
                <span className="text-[10px] text-gray-500">W{plan.totalWeeks}</span>
              </div>
            </div>
            
            {/* Week grid */}
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {plan.weeks.map((week) => {
                const phaseColor = week.weekType === "recovery" 
                  ? "bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700" 
                  : week.weekType === "taper" 
                  ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
                  : week.weekType === "peak"
                  ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                  : week.weekType === "build"
                  ? "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700"
                  : "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700";
                const isCurrentWeekInGrid = week.weekNumber === currentPlanWeek;
                
                return (
                  <button
                    key={week.weekNumber}
                    onClick={() => setSelectedWeek(week.weekNumber)}
                    className={`p-2 text-sm rounded-lg border transition-colors relative ${
                      week.weekNumber === selectedWeek
                        ? "bg-strava-orange text-white border-strava-orange"
                        : phaseColor
                    } ${isCurrentWeekInGrid && week.weekNumber !== selectedWeek ? "ring-2 ring-strava-orange" : ""} hover:shadow-md`}
                    data-testid={`button-week-${week.weekNumber}`}
                  >
                    W{week.weekNumber}
                    {isCurrentWeekInGrid && week.weekNumber !== selectedWeek && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-strava-orange rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Adjustment Preview Dialog */}
        <Dialog 
          open={adjustmentPreview.open} 
          onOpenChange={(open) => setAdjustmentPreview(prev => ({ ...prev, open }))}
        >
          <DialogContent className="sm:max-w-md" data-testid="dialog-adjustment-preview">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {adjustmentPreview.feeling === "tired" ? (
                  <>
                    <BatteryLow className="w-5 h-5 text-orange-500" />
                    Recovery Mode
                  </>
                ) : (
                  <>
                    <Battery className="w-5 h-5 text-green-500" />
                    Feeling Strong
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {adjustmentPreview.feeling === "tired" 
                  ? "We'll adjust your upcoming workouts to help you recover."
                  : "Great! We'll maintain your current training intensity."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                What will change:
              </h4>
              {adjustmentPreview.feeling === "tired" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Volume reduced by ~20%</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Distances will be shortened for easier recovery</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Intensity lowered</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Tempo runs → Easy runs, Intervals → Fartlek</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Extra rest added</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Additional recovery time between hard efforts</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Training maintained</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Your current plan will continue as scheduled</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Feedback noted</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">We'll track your positive feedback for future adaptations</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setAdjustmentPreview(prev => ({ ...prev, open: false }))}
                data-testid="button-cancel-adjustment"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  adjustPlanMutation.mutate(adjustmentPreview.feeling);
                  setAdjustmentPreview(prev => ({ ...prev, open: false }));
                }}
                disabled={adjustPlanMutation.isPending}
                className={adjustmentPreview.feeling === "tired" 
                  ? "bg-orange-500 hover:bg-orange-600" 
                  : "bg-green-500 hover:bg-green-600"}
                data-testid="button-confirm-adjustment"
              >
                {adjustPlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {adjustmentPreview.feeling === "tired" ? "Activate Recovery" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-lg" data-testid="dialog-settings">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Plan Settings
              </DialogTitle>
              <DialogDescription>
                Update your training plan preferences. Note: changing these settings won't regenerate workouts — they update your plan metadata.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="settings-target-time">Target Time</Label>
                <Input
                  id="settings-target-time"
                  placeholder="e.g. 1:45:00"
                  value={settingsForm.targetTime}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, targetTime: e.target.value }))}
                  data-testid="input-settings-target-time"
                />
                <p className="text-xs text-gray-500">Format: H:MM:SS or MM:SS</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-race-date">Race Date</Label>
                <Input
                  id="settings-race-date"
                  type="date"
                  value={settingsForm.raceDate}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, raceDate: e.target.value }))}
                  data-testid="input-settings-race-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-terrain">Terrain Type</Label>
                <Select
                  value={settingsForm.terrainType}
                  onValueChange={(val) => setSettingsForm(prev => ({ ...prev, terrainType: val }))}
                >
                  <SelectTrigger data-testid="select-settings-terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="trail">Trail</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="track">Track</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Running Days</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                    <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={settingsForm.preferredDays.includes(day)}
                        onCheckedChange={(checked) => {
                          setSettingsForm(prev => ({
                            ...prev,
                            preferredDays: checked 
                              ? [...prev.preferredDays, day]
                              : prev.preferredDays.filter(d => d !== day),
                          }));
                        }}
                      />
                      <span className="capitalize">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setSettingsOpen(false)}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const updates: Record<string, any> = {};
                  if (settingsForm.targetTime !== (plan?.targetTime || "")) updates.targetTime = settingsForm.targetTime || null;
                  if (settingsForm.raceDate !== (plan?.raceDate ? format(parseISO(plan.raceDate), "yyyy-MM-dd") : "")) {
                    updates.raceDate = settingsForm.raceDate || null;
                  }
                  if (settingsForm.terrainType !== ((plan as any)?.terrainType || "road")) updates.terrainType = settingsForm.terrainType;
                  if (JSON.stringify(settingsForm.preferredDays.sort()) !== JSON.stringify(((plan as any)?.preferredDays || []).sort())) {
                    updates.preferredDays = settingsForm.preferredDays;
                  }
                  updateSettingsMutation.mutate(updates);
                }}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archive Confirmation Dialog */}
        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="sm:max-w-md" data-testid="dialog-archive">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-500" />
                Archive Training Plan
              </DialogTitle>
              <DialogDescription>
                Archiving this plan will move it out of your active plans. You can still view it later in your archived plans. Your workout history will be preserved.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  {goalTypeLabels[plan?.goalType || ""] || plan?.goalType}
                  {plan?.targetTime && ` — ${plan.targetTime}`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {plan?.totalWeeks} weeks · Created {plan?.createdAt ? format(parseISO(plan.createdAt), "MMM d, yyyy") : ""}
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setArchiveOpen(false)}
                data-testid="button-cancel-archive"
              >
                Cancel
              </Button>
              <Button
                onClick={() => archivePlanMutation.mutate()}
                disabled={archivePlanMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                data-testid="button-confirm-archive"
              >
                {archivePlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Archive className="w-4 h-4 mr-2" />
                )}
                Archive Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
