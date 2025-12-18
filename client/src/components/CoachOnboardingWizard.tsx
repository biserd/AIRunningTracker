import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Target, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Bell, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Trophy,
  Loader2,
  Check
} from "lucide-react";

interface CoachPreferences {
  coachGoal: "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
  coachRaceDate?: string | null;
  coachTargetTime?: string | null;
  coachDaysAvailable: string[];
  coachWeeklyMileageCap?: number | null;
  coachTone: "gentle" | "direct" | "data_nerd";
  coachNotifyRecap: boolean;
  coachNotifyWeeklySummary: boolean;
  coachQuietHoursStart?: number | null;
  coachQuietHoursEnd?: number | null;
  coachOnboardingCompleted: boolean;
}

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
  { id: "5k", label: "5K", description: "Perfect for beginners or speed work" },
  { id: "10k", label: "10K", description: "Build endurance and speed" },
  { id: "half_marathon", label: "Half Marathon", description: "21.1km of challenge" },
  { id: "marathon", label: "Marathon", description: "The ultimate distance goal" },
  { id: "general_fitness", label: "General Fitness", description: "Stay healthy, no specific race" },
];

const TONES = [
  { id: "gentle", label: "Gentle Coach", description: "Supportive and encouraging", icon: "💚" },
  { id: "direct", label: "Direct Coach", description: "Straightforward feedback", icon: "🎯" },
  { id: "data_nerd", label: "Data Nerd", description: "Deep dive into metrics", icon: "📊" },
];

export default function CoachOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [preferences, setPreferences] = useState<CoachPreferences>({
    coachGoal: "general_fitness",
    coachRaceDate: null,
    coachTargetTime: null,
    coachDaysAvailable: ["tuesday", "thursday", "saturday"],
    coachWeeklyMileageCap: null,
    coachTone: "direct",
    coachNotifyRecap: true,
    coachNotifyWeeklySummary: true,
    coachQuietHoursStart: null,
    coachQuietHoursEnd: null,
    coachOnboardingCompleted: true,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: CoachPreferences) => {
      return apiRequest(`/api/users/${user!.id}/coach-preferences`, "PATCH", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Coach preferences saved!",
        description: "Your AI Coach is ready to help you reach your goals",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save preferences",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (dayId: string) => {
    setPreferences((prev) => ({
      ...prev,
      coachDaysAvailable: prev.coachDaysAvailable.includes(dayId)
        ? prev.coachDaysAvailable.filter((d) => d !== dayId)
        : [...prev.coachDaysAvailable, dayId],
    }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleComplete = () => {
    const payload = {
      ...preferences,
      coachRaceDate: preferences.coachRaceDate && preferences.coachRaceDate.trim() !== "" 
        ? new Date(preferences.coachRaceDate).toISOString() 
        : null,
      coachNotifyRecap: Boolean(preferences.coachNotifyRecap),
      coachNotifyWeeklySummary: Boolean(preferences.coachNotifyWeeklySummary),
      coachOnboardingCompleted: true,
    };
    savePreferencesMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Crown className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to AI Coach</CardTitle>
              <CardDescription>
                Let's personalize your coaching experience
              </CardDescription>
            </div>
          </div>
          <Progress value={(step / totalSteps) * 100} className="mt-4 h-2" />
          <p className="text-sm text-gray-500 mt-2">Step {step} of {totalSteps}</p>
        </CardHeader>

        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6" data-testid="wizard-step-1">
              <div className="text-center mb-6">
                <Target className="h-12 w-12 text-strava-orange mx-auto mb-3" />
                <h2 className="text-xl font-semibold">What's your running goal?</h2>
                <p className="text-gray-600">This helps me tailor advice to your objectives</p>
              </div>

              <RadioGroup
                value={preferences.coachGoal}
                onValueChange={(value) => 
                  setPreferences((p) => ({ ...p, coachGoal: value as CoachPreferences["coachGoal"] }))
                }
                className="space-y-3"
              >
                {GOALS.map((goal) => (
                  <label
                    key={goal.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      preferences.coachGoal === goal.id
                        ? "border-strava-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`goal-${goal.id}`}
                  >
                    <RadioGroupItem value={goal.id} id={goal.id} className="mr-3" />
                    <div>
                      <span className="font-medium">{goal.label}</span>
                      <p className="text-sm text-gray-500">{goal.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {preferences.coachGoal !== "general_fitness" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="raceDate">Target Race Date (optional)</Label>
                    <Input
                      id="raceDate"
                      type="date"
                      value={preferences.coachRaceDate || ""}
                      onChange={(e) => 
                        setPreferences((p) => ({ ...p, coachRaceDate: e.target.value || null }))
                      }
                      className="mt-1"
                      data-testid="input-race-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetTime">Target Time (optional)</Label>
                    <Input
                      id="targetTime"
                      type="text"
                      placeholder="e.g., 1:45:00 for half marathon"
                      value={preferences.coachTargetTime || ""}
                      onChange={(e) => 
                        setPreferences((p) => ({ ...p, coachTargetTime: e.target.value || null }))
                      }
                      className="mt-1"
                      data-testid="input-target-time"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6" data-testid="wizard-step-2">
              <div className="text-center mb-6">
                <Calendar className="h-12 w-12 text-strava-orange mx-auto mb-3" />
                <h2 className="text-xl font-semibold">When can you run?</h2>
                <p className="text-gray-600">Select your typical running days</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleDayToggle(day.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      preferences.coachDaysAvailable.includes(day.id)
                        ? "bg-strava-orange text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    data-testid={`day-${day.id}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-gray-500">
                {preferences.coachDaysAvailable.length} days selected
              </p>

              <div className="pt-4 border-t">
                <Label htmlFor="mileageCap">Weekly Mileage Cap (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="mileageCap"
                    type="number"
                    placeholder="e.g., 50"
                    value={preferences.coachWeeklyMileageCap || ""}
                    onChange={(e) => 
                      setPreferences((p) => ({ 
                        ...p, 
                        coachWeeklyMileageCap: e.target.value ? parseFloat(e.target.value) : null 
                      }))
                    }
                    className="w-32"
                    data-testid="input-mileage-cap"
                  />
                  <span className="text-gray-500">km per week</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty if you don't want a cap
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6" data-testid="wizard-step-3">
              <div className="text-center mb-6">
                <MessageSquare className="h-12 w-12 text-strava-orange mx-auto mb-3" />
                <h2 className="text-xl font-semibold">How should I coach you?</h2>
                <p className="text-gray-600">Pick your preferred coaching style</p>
              </div>

              <RadioGroup
                value={preferences.coachTone}
                onValueChange={(value) => 
                  setPreferences((p) => ({ ...p, coachTone: value as CoachPreferences["coachTone"] }))
                }
                className="space-y-3"
              >
                {TONES.map((tone) => (
                  <label
                    key={tone.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      preferences.coachTone === tone.id
                        ? "border-strava-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`tone-${tone.id}`}
                  >
                    <RadioGroupItem value={tone.id} id={tone.id} className="mr-3" />
                    <span className="text-2xl mr-3">{tone.icon}</span>
                    <div>
                      <span className="font-medium">{tone.label}</span>
                      <p className="text-sm text-gray-500">{tone.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6" data-testid="wizard-step-4">
              <div className="text-center mb-6">
                <Bell className="h-12 w-12 text-strava-orange mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Notification Preferences</h2>
                <p className="text-gray-600">How would you like me to reach you?</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Post-Activity Recaps</Label>
                    <p className="text-sm text-gray-500">Get coaching feedback after each run</p>
                  </div>
                  <Checkbox
                    checked={preferences.coachNotifyRecap}
                    onCheckedChange={(checked) => 
                      setPreferences((p) => ({ ...p, coachNotifyRecap: !!checked }))
                    }
                    data-testid="checkbox-recap-notify"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Weekly Summary</Label>
                    <p className="text-sm text-gray-500">Get a weekly training review</p>
                  </div>
                  <Checkbox
                    checked={preferences.coachNotifyWeeklySummary}
                    onCheckedChange={(checked) => 
                      setPreferences((p) => ({ ...p, coachNotifyWeeklySummary: !!checked }))
                    }
                    data-testid="checkbox-weekly-notify"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="font-medium">Quiet Hours (optional)</Label>
                <p className="text-sm text-gray-500 mb-3">Don't notify me during these hours</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="22"
                    value={preferences.coachQuietHoursStart ?? ""}
                    onChange={(e) => 
                      setPreferences((p) => ({ 
                        ...p, 
                        coachQuietHoursStart: e.target.value ? parseInt(e.target.value) : null 
                      }))
                    }
                    className="w-20"
                    data-testid="input-quiet-start"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="7"
                    value={preferences.coachQuietHoursEnd ?? ""}
                    onChange={(e) => 
                      setPreferences((p) => ({ 
                        ...p, 
                        coachQuietHoursEnd: e.target.value ? parseInt(e.target.value) : null 
                      }))
                    }
                    className="w-20"
                    data-testid="input-quiet-end"
                  />
                  <span className="text-gray-500">(24h format)</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">You're all set!</h3>
                    <p className="text-sm text-yellow-700">
                      After your next Strava sync, I'll start providing personalized coaching 
                      feedback, training recommendations, and help you work towards your{" "}
                      {preferences.coachGoal === "general_fitness" 
                        ? "fitness goals" 
                        : `${GOALS.find(g => g.id === preferences.coachGoal)?.label} goal`}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2"
              data-testid="button-prev-step"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={nextStep}
                className="bg-strava-orange hover:bg-strava-orange/90 flex items-center gap-2"
                data-testid="button-next-step"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={savePreferencesMutation.isPending}
                className="bg-strava-orange hover:bg-strava-orange/90 flex items-center gap-2"
                data-testid="button-complete-wizard"
              >
                {savePreferencesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Start Coaching
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
