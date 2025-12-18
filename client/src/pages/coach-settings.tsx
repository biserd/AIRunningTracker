import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Crown, 
  Target, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Save,
  Loader2,
  ArrowLeft
} from "lucide-react";
import type { DashboardData } from "@/lib/api";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

const GOALS = [
  { id: "5k", label: "5K" },
  { id: "10k", label: "10K" },
  { id: "half_marathon", label: "Half Marathon" },
  { id: "marathon", label: "Marathon" },
  { id: "general_fitness", label: "General Fitness" },
];

const TONES = [
  { id: "gentle", label: "Gentle Coach", icon: "💚" },
  { id: "direct", label: "Direct Coach", icon: "🎯" },
  { id: "data_nerd", label: "Data Nerd", icon: "📊" },
];

export default function CoachSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: dashboardData, isLoading: dataLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const [coachGoal, setCoachGoal] = useState("general_fitness");
  const [coachRaceDate, setCoachRaceDate] = useState("");
  const [coachTargetTime, setCoachTargetTime] = useState("");
  const [coachDaysAvailable, setCoachDaysAvailable] = useState<string[]>([]);
  const [coachWeeklyMileageCap, setCoachWeeklyMileageCap] = useState("");
  const [coachTone, setCoachTone] = useState("direct");
  const [coachNotifyRecap, setCoachNotifyRecap] = useState(true);
  const [coachNotifyWeeklySummary, setCoachNotifyWeeklySummary] = useState(true);
  const [coachQuietHoursStart, setCoachQuietHoursStart] = useState("");
  const [coachQuietHoursEnd, setCoachQuietHoursEnd] = useState("");

  useEffect(() => {
    if (dashboardData?.user) {
      const u = dashboardData.user;
      setCoachGoal(u.coachGoal || "general_fitness");
      setCoachRaceDate(u.coachRaceDate ? new Date(u.coachRaceDate).toISOString().split("T")[0] : "");
      setCoachTargetTime(u.coachTargetTime || "");
      setCoachDaysAvailable(u.coachDaysAvailable || []);
      setCoachWeeklyMileageCap(u.coachWeeklyMileageCap?.toString() || "");
      setCoachTone(u.coachTone || "direct");
      setCoachNotifyRecap(u.coachNotifyRecap ?? true);
      setCoachNotifyWeeklySummary(u.coachNotifyWeeklySummary ?? true);
      setCoachQuietHoursStart(u.coachQuietHoursStart?.toString() || "");
      setCoachQuietHoursEnd(u.coachQuietHoursEnd?.toString() || "");
    }
  }, [dashboardData]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: Record<string, any>) => {
      return apiRequest(`/api/users/${user!.id}/coach-preferences`, "PATCH", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      toast({
        title: "Coach preferences saved",
        description: "Your AI coach settings have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (dayId: string) => {
    setCoachDaysAvailable((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSave = () => {
    let validatedRaceDate: string | null = null;
    if (coachRaceDate && coachRaceDate.trim() !== "") {
      const parsed = new Date(coachRaceDate);
      if (!isNaN(parsed.getTime())) {
        validatedRaceDate = parsed.toISOString();
      }
    }
    
    saveMutation.mutate({
      coachGoal,
      coachRaceDate: validatedRaceDate,
      coachTargetTime: coachTargetTime.trim() || null,
      coachDaysAvailable,
      coachWeeklyMileageCap: coachWeeklyMileageCap ? parseFloat(coachWeeklyMileageCap) : null,
      coachTone,
      coachNotifyRecap: Boolean(coachNotifyRecap),
      coachNotifyWeeklySummary: Boolean(coachNotifyWeeklySummary),
      coachQuietHoursStart: coachQuietHoursStart ? parseInt(coachQuietHoursStart) : null,
      coachQuietHoursEnd: coachQuietHoursEnd ? parseInt(coachQuietHoursEnd) : null,
    });
  };

  if (authLoading || subLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-strava-orange mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (!isPremium) {
    setLocation("/pricing");
    return null;
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/settings")}
            className="mb-4 flex items-center gap-2"
            data-testid="button-back-settings"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Crown className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Coach Settings</h1>
              <p className="text-gray-600">Customize your coaching experience</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-strava-orange" />
                Training Goal
              </CardTitle>
              <CardDescription>
                What are you training for?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={coachGoal}
                onValueChange={setCoachGoal}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {GOALS.map((goal) => (
                  <label
                    key={goal.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                      coachGoal === goal.id
                        ? "border-strava-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`goal-${goal.id}`}
                  >
                    <RadioGroupItem value={goal.id} id={goal.id} className="mr-2" />
                    <span className="font-medium text-sm">{goal.label}</span>
                  </label>
                ))}
              </RadioGroup>

              {coachGoal !== "general_fitness" && (
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div>
                    <Label htmlFor="raceDate">Target Race Date</Label>
                    <Input
                      id="raceDate"
                      type="date"
                      value={coachRaceDate}
                      onChange={(e) => setCoachRaceDate(e.target.value)}
                      className="mt-1"
                      data-testid="input-race-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetTime">Target Time</Label>
                    <Input
                      id="targetTime"
                      type="text"
                      placeholder="e.g., 1:45:00"
                      value={coachTargetTime}
                      onChange={(e) => setCoachTargetTime(e.target.value)}
                      className="mt-1"
                      data-testid="input-target-time"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-strava-orange" />
                Training Schedule
              </CardTitle>
              <CardDescription>
                When can you typically run?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleDayToggle(day.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      coachDaysAvailable.includes(day.id)
                        ? "bg-strava-orange text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    data-testid={`day-${day.id}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="mileageCap">Weekly Mileage Cap (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="mileageCap"
                    type="number"
                    placeholder="e.g., 50"
                    value={coachWeeklyMileageCap}
                    onChange={(e) => setCoachWeeklyMileageCap(e.target.value)}
                    className="w-32"
                    data-testid="input-mileage-cap"
                  />
                  <span className="text-gray-500">km per week</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-strava-orange" />
                Coaching Style
              </CardTitle>
              <CardDescription>
                How would you like your coach to communicate?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={coachTone}
                onValueChange={setCoachTone}
                className="space-y-3"
              >
                {TONES.map((tone) => (
                  <label
                    key={tone.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      coachTone === tone.id
                        ? "border-strava-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`tone-${tone.id}`}
                  >
                    <RadioGroupItem value={tone.id} id={tone.id} className="mr-3" />
                    <span className="text-xl mr-3">{tone.icon}</span>
                    <span className="font-medium">{tone.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-strava-orange" />
                Notifications
              </CardTitle>
              <CardDescription>
                How would you like to be notified?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Post-Activity Recaps</Label>
                  <p className="text-sm text-gray-500">Get coaching feedback after each run</p>
                </div>
                <Checkbox
                  checked={coachNotifyRecap}
                  onCheckedChange={(checked) => setCoachNotifyRecap(!!checked)}
                  data-testid="checkbox-recap-notify"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Weekly Summary</Label>
                  <p className="text-sm text-gray-500">Get a weekly training review</p>
                </div>
                <Checkbox
                  checked={coachNotifyWeeklySummary}
                  onCheckedChange={(checked) => setCoachNotifyWeeklySummary(!!checked)}
                  data-testid="checkbox-weekly-notify"
                />
              </div>

              <div className="pt-4 border-t">
                <Label className="font-medium">Quiet Hours</Label>
                <p className="text-sm text-gray-500 mb-3">Don't send notifications during these hours</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="22"
                    value={coachQuietHoursStart}
                    onChange={(e) => setCoachQuietHoursStart(e.target.value)}
                    className="w-20"
                    data-testid="input-quiet-start"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="7"
                    value={coachQuietHoursEnd}
                    onChange={(e) => setCoachQuietHoursEnd(e.target.value)}
                    className="w-20"
                    data-testid="input-quiet-end"
                  />
                  <span className="text-gray-500">(24h format)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-strava-orange hover:bg-strava-orange/90 flex items-center gap-2"
              data-testid="button-save-coach-settings"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
