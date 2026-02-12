import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useSubscription";
import AppHeader from "@/components/AppHeader";
import { FloatingAICoach } from "@/components/FloatingAICoach";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { 
  Plus, Calendar, Target, Clock, ChevronRight, ChevronLeft,
  Loader2, CheckCircle, AlertTriangle, TrendingUp, Footprints,
  Sparkles, ArrowRight, RefreshCw, Archive
} from "lucide-react";
import { format, parseISO } from "date-fns";

const KM_TO_MILES = 0.621371;

function formatDistance(km: number | null | undefined, useMiles: boolean): string {
  if (!km) return useMiles ? "0 mi" : "0 km";
  if (useMiles) {
    return `${(km * KM_TO_MILES).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

interface AthleteProfile {
  id: number;
  baselineWeeklyMileageKm: number | null;
  avgRunsPerWeek: number | null;
  longestRecentRunKm: number | null;
  estimatedVdot: number | null;
  typicalEasyPaceMin: number | null;
  typicalEasyPaceMax: number | null;
  lastComputedAt: string | null;
}

interface TrainingPlan {
  id: number;
  goalType: string;
  targetTime: string | null;
  raceDate: string | null;
  totalWeeks: number;
  currentWeek: number | null;
  status: string;
  createdAt: string;
  coachNotes: string | null;
  enrichmentStatus?: "pending" | "enriching" | "complete" | "partial" | "failed" | null;
  enrichedWeeks?: number | null;
}

type WizardStep = "goal" | "preferences" | "generating" | "preview";

export default function TrainingPlans() {
  const { user, isLoading: authLoading } = useAuth();
  const { canAccessAICoachChat } = useFeatureAccess();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showWizard, setShowWizard] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("goal");
  
  // Form state
  const [goalType, setGoalType] = useState<string>("half_marathon");
  const [goalTimeTarget, setGoalTimeTarget] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [raceName, setRaceName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [includeSpeedwork, setIncludeSpeedwork] = useState(true);
  const [includeLongRuns, setIncludeLongRuns] = useState(true);
  const [constraints, setConstraints] = useState("");
  const [preferredDays, setPreferredDays] = useState<string[]>(["monday", "wednesday", "friday", "saturday", "sunday"]);
  const [terrainType, setTerrainType] = useState<string>("road");
  const [secondaryGoalEnabled, setSecondaryGoalEnabled] = useState(false);
  const [secondaryGoalType, setSecondaryGoalType] = useState<string>("50k");
  const [secondaryRaceDate, setSecondaryRaceDate] = useState("");
  const [secondaryTargetTime, setSecondaryTargetTime] = useState("");
  const [secondaryTerrainType, setSecondaryTerrainType] = useState<string>("trail");
  const [conflictWarnings, setConflictWarnings] = useState<Array<{type: string; severity: string; message: string; recommendation?: string}>>([]);
  const [recommendedMode, setRecommendedMode] = useState<string>("single");
  
  const useMiles = (user as any)?.unitPreference === "miles";
  
  // Fetch athlete profile
  const { data: profile, isLoading: profileLoading } = useQuery<AthleteProfile>({
    queryKey: ["/api/training/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // Fetch existing plans
  const { data: plans, isLoading: plansLoading } = useQuery<TrainingPlan[]>({
    queryKey: ["/api/training/plans"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // Generate plan mutation - instant generation, navigate immediately
  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        goalType,
        goalTimeTarget: goalTimeTarget || undefined,
        raceDate: raceDate || undefined,
        raceName: raceName || undefined,
        experienceLevel,
        includeSpeedwork,
        includeLongRuns,
        constraints: constraints || undefined,
        preferredRunDays: preferredDays,
        terrainType: terrainType !== "road" ? terrainType : undefined,
      };
      
      if (secondaryGoalEnabled) {
        body.goals = [
          {
            goalType,
            raceDate: raceDate || undefined,
            targetTime: goalTimeTarget || undefined,
            priority: "primary",
            terrainType: terrainType !== "road" ? terrainType : undefined,
          },
          {
            goalType: secondaryGoalType,
            raceDate: secondaryRaceDate || undefined,
            targetTime: secondaryTargetTime || undefined,
            priority: "secondary",
            terrainType: secondaryTerrainType !== "road" ? secondaryTerrainType : undefined,
          }
        ];
      }
      
      return await apiRequest("/api/training/plans/generate", "POST", body);
    },
    onSuccess: (data: { planId?: number; plan?: TrainingPlan }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/plans"] });
      setShowWizard(false);
      setWizardStep("goal");
      
      // Navigate directly to the new plan - it's available immediately
      const planId = data.planId || data.plan?.id;
      if (planId) {
        toast({
          title: "Training plan created!",
          description: "AI is customizing your workouts in the background.",
        });
        navigate(`/training-plans/${planId}`);
      } else {
        toast({
          title: "Training plan created!",
          description: "Your personalized training plan is ready.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate plan",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setWizardStep("preferences");
    },
  });
  
  const handleGeneratePlan = () => {
    setWizardStep("generating");
    generateMutation.mutate();
  };
  
  const toggleDay = (day: string) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day));
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };
  
  const checkConflicts = async () => {
    if (!secondaryGoalEnabled) {
      setConflictWarnings([]);
      return;
    }
    try {
      const res = await apiRequest("/api/training/plans/check-conflicts", "POST", {
        goals: [
          { goalType, raceDate: raceDate || undefined, priority: "primary", terrainType },
          { goalType: secondaryGoalType, raceDate: secondaryRaceDate || undefined, priority: "secondary", terrainType: secondaryTerrainType }
        ]
      });
      if (res && typeof res === 'object') {
        setConflictWarnings((res as any).conflicts || []);
        setRecommendedMode((res as any).recommendedMode || "single");
      }
    } catch (e) {
    }
  };
  
  const formatPace = (minPerKm: number | null) => {
    if (!minPerKm) return "N/A";
    // Convert to min/mile if user prefers miles
    const pace = useMiles ? minPerKm / KM_TO_MILES : minPerKm;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}/${useMiles ? "mi" : "km"}`;
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
  
  const isUltraGoal = ["50k", "50_mile", "100k", "100_mile"].includes(goalType);
  
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Training Plans</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered personalized training plans based on your running history
            </p>
          </div>
          
          {!showWizard && (
            <Button 
              onClick={() => setShowWizard(true)}
              className="bg-strava-orange hover:bg-orange-600"
              data-testid="button-create-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Plan
            </Button>
          )}
        </div>
        
        {/* Athlete Profile Summary */}
        {!showWizard && profile && (
          <Card className="mb-8 border-l-4 border-l-strava-orange">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-strava-orange" />
                Your Running Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Weekly Mileage</span>
                  <p className="font-semibold text-lg" data-testid="text-weekly-mileage">
                    {formatDistance(profile.baselineWeeklyMileageKm, useMiles)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Runs/Week</span>
                  <p className="font-semibold text-lg" data-testid="text-runs-per-week">
                    {profile.avgRunsPerWeek?.toFixed(1) || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Longest Run</span>
                  <p className="font-semibold text-lg" data-testid="text-longest-run">
                    {formatDistance(profile.longestRecentRunKm, useMiles)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Easy Pace</span>
                  <p className="font-semibold text-lg" data-testid="text-easy-pace">
                    {formatPace(profile.typicalEasyPaceMin)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Plan Creation Wizard */}
        {showWizard && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-strava-orange" />
                    Create Training Plan
                  </CardTitle>
                  <CardDescription>
                    {wizardStep === "goal" && "Step 1: Set your goal"}
                    {wizardStep === "preferences" && "Step 2: Customize preferences"}
                    {wizardStep === "generating" && "Generating your plan..."}
                    {wizardStep === "preview" && "Step 3: Review and save"}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => { setShowWizard(false); setWizardStep("goal"); }}
                  data-testid="button-cancel-wizard"
                >
                  Cancel
                </Button>
              </div>
              
              {/* Progress indicator */}
              <div className="flex gap-2 mt-4">
                <div className={`h-1 flex-1 rounded-full ${wizardStep === "goal" ? "bg-strava-orange" : "bg-gray-200"}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep === "preferences" || wizardStep === "generating" ? "bg-strava-orange" : "bg-gray-200"}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep === "generating" ? "bg-strava-orange" : "bg-gray-200"}`} />
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Step 1: Goal */}
              {wizardStep === "goal" && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="goalType">What's your goal?</Label>
                    <Select value={goalType} onValueChange={setGoalType}>
                      <SelectTrigger className="mt-2" data-testid="select-goal-type">
                        <SelectValue placeholder="Select goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5k">5K Race</SelectItem>
                        <SelectItem value="10k">10K Race</SelectItem>
                        <SelectItem value="half_marathon">Half Marathon</SelectItem>
                        <SelectItem value="marathon">Marathon</SelectItem>
                        <SelectItem value="50k">50K Ultra</SelectItem>
                        <SelectItem value="50_mile">50 Mile Ultra</SelectItem>
                        <SelectItem value="100k">100K Ultra</SelectItem>
                        <SelectItem value="100_mile">100 Mile Ultra</SelectItem>
                        <SelectItem value="general_fitness">General Fitness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {goalType !== "general_fitness" && (
                    <>
                      <div>
                        <Label htmlFor="goalTime">Target time (optional)</Label>
                        <Input 
                          id="goalTime"
                          placeholder="e.g., 1:45:00 or sub-4:00"
                          value={goalTimeTarget}
                          onChange={(e) => setGoalTimeTarget(e.target.value)}
                          className="mt-2"
                          data-testid="input-goal-time"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="raceDate">Race date (optional)</Label>
                        <Input 
                          id="raceDate"
                          type="date"
                          value={raceDate}
                          onChange={(e) => setRaceDate(e.target.value)}
                          className="mt-2"
                          data-testid="input-race-date"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="raceName">Race name (optional)</Label>
                        <Input 
                          id="raceName"
                          placeholder="e.g., NYC Marathon"
                          value={raceName}
                          onChange={(e) => setRaceName(e.target.value)}
                          className="mt-2"
                          data-testid="input-race-name"
                        />
                      </div>
                    </>
                  )}
                  
                  {(isUltraGoal || goalType === "marathon" || goalType === "half_marathon") && (
                    <div>
                      <Label htmlFor="terrainType">Terrain type</Label>
                      <Select value={terrainType} onValueChange={setTerrainType}>
                        <SelectTrigger className="mt-2" data-testid="select-terrain">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="road">Road</SelectItem>
                          <SelectItem value="trail">Trail</SelectItem>
                          <SelectItem value="mountain">Mountain / Technical</SelectItem>
                        </SelectContent>
                      </Select>
                      {isUltraGoal && terrainType !== "road" && (
                        <p className="text-xs text-gray-500 mt-1">
                          {terrainType === "trail" ? "Plan includes trail-specific training with moderate vert targets" : "Plan includes aggressive vert targets, technical terrain training, and power hiking"}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-base font-semibold">Add a second goal?</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Train for two races with one unified plan
                        </p>
                      </div>
                      <Button
                        variant={secondaryGoalEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSecondaryGoalEnabled(!secondaryGoalEnabled);
                          if (secondaryGoalEnabled) {
                            setConflictWarnings([]);
                          }
                        }}
                        data-testid="button-toggle-secondary-goal"
                      >
                        {secondaryGoalEnabled ? "Remove" : <><Plus className="w-4 h-4 mr-1" /> Add Goal</>}
                      </Button>
                    </div>
                    
                    {secondaryGoalEnabled && (
                      <div className="space-y-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Secondary Goal (B Race)</span>
                        </div>
                        
                        <div>
                          <Label htmlFor="secondaryGoalType">Race distance</Label>
                          <Select value={secondaryGoalType} onValueChange={setSecondaryGoalType}>
                            <SelectTrigger className="mt-1" data-testid="select-secondary-goal-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5k">5K Race</SelectItem>
                              <SelectItem value="10k">10K Race</SelectItem>
                              <SelectItem value="half_marathon">Half Marathon</SelectItem>
                              <SelectItem value="marathon">Marathon</SelectItem>
                              <SelectItem value="50k">50K Ultra</SelectItem>
                              <SelectItem value="50_mile">50 Mile Ultra</SelectItem>
                              <SelectItem value="100k">100K Ultra</SelectItem>
                              <SelectItem value="100_mile">100 Mile Ultra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="secondaryRaceDate">Race date</Label>
                          <Input
                            id="secondaryRaceDate"
                            type="date"
                            value={secondaryRaceDate}
                            onChange={(e) => setSecondaryRaceDate(e.target.value)}
                            className="mt-1"
                            data-testid="input-secondary-race-date"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="secondaryTargetTime">Target time (optional)</Label>
                          <Input
                            id="secondaryTargetTime"
                            placeholder="e.g., 5:30:00"
                            value={secondaryTargetTime}
                            onChange={(e) => setSecondaryTargetTime(e.target.value)}
                            className="mt-1"
                            data-testid="input-secondary-target-time"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="secondaryTerrain">Terrain</Label>
                          <Select value={secondaryTerrainType} onValueChange={setSecondaryTerrainType}>
                            <SelectTrigger className="mt-1" data-testid="select-secondary-terrain">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="road">Road</SelectItem>
                              <SelectItem value="trail">Trail</SelectItem>
                              <SelectItem value="mountain">Mountain</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkConflicts}
                          className="mt-2"
                          data-testid="button-check-conflicts"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Check compatibility
                        </Button>
                        
                        {conflictWarnings.length > 0 && (
                          <div className="space-y-2 mt-3">
                            {conflictWarnings.map((w, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-lg text-sm ${
                                  w.severity === "error" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" :
                                  w.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" :
                                  "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium">{w.message}</p>
                                    {w.recommendation && <p className="mt-1 opacity-80">{w.recommendation}</p>}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {recommendedMode !== "single" && (
                              <div className="p-3 rounded-lg text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Mode: <span className="font-semibold capitalize">{recommendedMode.replace("_", " ")}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Step 2: Preferences */}
              {wizardStep === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="experience">Experience level</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="mt-2" data-testid="select-experience">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (less than 1 year running)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                        <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Preferred running days</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`p-2 text-xs rounded-lg border transition-colors ${
                            preferredDays.includes(day) 
                              ? "bg-strava-orange text-white border-strava-orange" 
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          }`}
                          data-testid={`button-day-${day}`}
                        >
                          {day.slice(0, 3).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="speedwork" 
                        checked={includeSpeedwork} 
                        onCheckedChange={(checked) => setIncludeSpeedwork(!!checked)}
                        data-testid="checkbox-speedwork"
                      />
                      <Label htmlFor="speedwork" className="cursor-pointer">Include speedwork</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="longRuns" 
                        checked={includeLongRuns} 
                        onCheckedChange={(checked) => setIncludeLongRuns(!!checked)}
                        data-testid="checkbox-long-runs"
                      />
                      <Label htmlFor="longRuns" className="cursor-pointer">Include long runs</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="constraints">Additional notes or constraints (optional)</Label>
                    <Textarea 
                      id="constraints"
                      placeholder="e.g., I have a knee injury, I can only run in the morning, etc."
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className="mt-2"
                      rows={3}
                      data-testid="textarea-constraints"
                    />
                  </div>
                </div>
              )}
              
              {/* Generating state */}
              {wizardStep === "generating" && (
                <div className="py-12 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-strava-orange mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Creating your personalized plan...</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Our AI coach is analyzing your running history and generating an optimal training plan.
                  </p>
                </div>
              )}
            </CardContent>
            
            {wizardStep !== "generating" && (
              <CardFooter className="flex justify-between">
                {wizardStep === "goal" && (
                  <>
                    <div />
                    <Button onClick={() => setWizardStep("preferences")} data-testid="button-next">
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                )}
                
                {wizardStep === "preferences" && (
                  <>
                    <Button variant="outline" onClick={() => setWizardStep("goal")} data-testid="button-back">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button 
                      onClick={handleGeneratePlan}
                      className="bg-strava-orange hover:bg-orange-600"
                      data-testid="button-generate"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Plan
                    </Button>
                  </>
                )}
              </CardFooter>
            )}
          </Card>
        )}
        
        {/* Existing Plans List */}
        {!showWizard && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Training Plans</h2>
              {plans && plans.some(p => p.status === "archived") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-gray-500"
                  data-testid="button-toggle-archived"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              )}
            </div>
            
            {plansLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-strava-orange" />
              </div>
            ) : plans && plans.filter(p => showArchived || p.status !== "archived").length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.filter(p => showArchived || p.status !== "archived").map((plan) => {
                  const isEnriching = plan.enrichmentStatus === "enriching";
                  const enrichProgress = plan.enrichedWeeks && plan.totalWeeks 
                    ? Math.round((plan.enrichedWeeks / plan.totalWeeks) * 100) 
                    : 0;
                  
                  return (
                    <Link key={plan.id} href={`/training-plans/${plan.id}`}>
                      <Card 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        data-testid={`card-plan-${plan.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                                {plan.status}
                              </Badge>
                              {isEnriching && (
                                <Badge variant="outline" className="text-strava-orange border-strava-orange animate-pulse">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Enriching
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              Week {plan.currentWeek || 1}/{plan.totalWeeks}
                            </span>
                          </div>
                          <CardTitle className="text-lg mt-2">
                            {goalTypeLabels[plan.goalType] || plan.goalType}
                            {plan.targetTime && ` - ${plan.targetTime}`}
                          </CardTitle>
                          {plan.raceDate && (
                            <CardDescription className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(plan.raceDate), "MMM d, yyyy")}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          {isEnriching && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>AI enriching workouts...</span>
                                <span>{enrichProgress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-strava-orange transition-all duration-500" 
                                  style={{ width: `${enrichProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              {plan.totalWeeks} weeks
                            </span>
                            <span className="flex items-center text-strava-orange">
                              View <ArrowRight className="w-4 h-4 ml-1" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Footprints className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No training plans yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first AI-powered training plan to reach your running goals.
                  </p>
                  <Button 
                    onClick={() => setShowWizard(true)}
                    className="bg-strava-orange hover:bg-orange-600"
                    data-testid="button-create-first-plan"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Plan
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      
      {user && (
        <FloatingAICoach 
          userId={user.id} 
          pageContext={{
            pageName: "Training Plans",
            pageDescription: "Page for creating and managing AI-generated training plans for races and fitness goals",
            relevantData: {
              hasPlans: (plans?.length || 0) > 0,
              planCount: plans?.length || 0,
              showingWizard: showWizard
            }
          }}
        />
      )}
    </div>
  );
}
