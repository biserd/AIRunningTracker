import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
  ArrowLeft,
  CloudSun,
  Clock,
  PauseCircle,
  Send,
  Unplug,
  ShieldCheck,
  CheckCircle2
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

type CoachChannelStatus = {
  pilotEligible: boolean;
  telegram: {
    connected: boolean;
    status: "not_connected" | "provisioning" | "active" | "provisioning_failed" | "revoked";
    linkedAt: string | null;
  };
};

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

  const { data: channelStatus, isLoading: channelStatusLoading } = useQuery<CoachChannelStatus>({
    queryKey: ["/api/coach/channels"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(user?.id && isPremium),
    staleTime: 0,
    refetchOnMount: "always",
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
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [coachDailyBriefingEnabled, setCoachDailyBriefingEnabled] = useState(true);
  const [coachDailyBriefingHour, setCoachDailyBriefingHour] = useState("7");
  const [coachTimezone, setCoachTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [coachWeatherEnabled, setCoachWeatherEnabled] = useState(false);
  const [coachWeatherLocation, setCoachWeatherLocation] = useState<{ label: string; latitude: number; longitude: number } | null>(null);
  const [coachPreferredChannel, setCoachPreferredChannel] = useState<"email" | "push" | "in_app">("email");
  const [coachSnoozedUntil, setCoachSnoozedUntil] = useState<string | null>(null);
  const [coachDailyAvailability, setCoachDailyAvailability] = useState<"available" | "limited" | "unavailable" | null>(null);

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
      setCoachEnabled(u.coachEnabled ?? true);
      setCoachDailyBriefingEnabled(u.coachDailyBriefingEnabled ?? true);
      setCoachDailyBriefingHour(String(u.coachDailyBriefingHour ?? 7));
      setCoachTimezone(u.coachTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      setCoachWeatherEnabled(u.coachWeatherEnabled ?? false);
      setCoachWeatherLocation(u.coachWeatherLocation ?? null);
      setCoachPreferredChannel(u.coachPreferredChannel ?? "email");
      setCoachSnoozedUntil(u.coachSnoozedUntil ?? null);
      setCoachDailyAvailability(u.coachDailyAvailability ?? null);
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

  const connectTelegramMutation = useMutation({
    mutationFn: () => apiRequest("/api/coach/channels/telegram/link", "POST", {}),
    onSuccess: (result: { deepLink: string }) => {
      window.location.assign(result.deepLink);
    },
    onError: (error: any) => toast({
      title: "Telegram could not be connected",
      description: error.message || "Please try again.",
      variant: "destructive",
    }),
  });

  const disconnectTelegramMutation = useMutation({
    mutationFn: () => apiRequest("/api/coach/channels/telegram", "DELETE"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/coach/channels"] });
      toast({ title: "Telegram disconnected", description: "The coach can no longer use this account's running data." });
    },
    onError: (error: any) => toast({
      title: "Could not disconnect Telegram",
      description: error.message || "Please try again.",
      variant: "destructive",
    }),
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
      coachEnabled,
      coachDailyBriefingEnabled,
      coachDailyBriefingHour: parseInt(coachDailyBriefingHour),
      coachTimezone,
      coachWeatherEnabled,
      coachWeatherLocation,
      coachPreferredChannel,
      coachSnoozedUntil,
      coachDailyAvailability,
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "This browser does not provide location access.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoachWeatherLocation({ label: "Current location", latitude: coords.latitude, longitude: coords.longitude });
        setCoachWeatherEnabled(true);
        toast({ title: "Weather location added", description: "Only approximate coordinates are saved for forecasts." });
      },
      () => toast({ title: "Location not shared", description: "Weather coaching stays off until you choose a location.", variant: "destructive" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600000 },
    );
  };

  const snoozeCoach = (hours: number) => {
    setCoachSnoozedUntil(new Date(Date.now() + hours * 60 * 60 * 1000).toISOString());
    setCoachEnabled(true);
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
                <Send className="h-5 w-5 text-[#229ED9]" />
                Telegram coach
                {channelStatus?.telegram.connected && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Get post-run analysis and proactive coaching in a private Telegram conversation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div className="text-sm text-blue-950">
                  <p className="font-medium">Your running data stays tied to your account.</p>
                  <p className="mt-1 text-blue-800">The coach receives a read-only connection for you—not access to another runner, billing, Strava credentials, or account controls. Disconnect anytime.</p>
                </div>
              </div>

              <Link
                href="/proactive-running-coach"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#167ca9] hover:underline"
                data-testid="coach-settings-proactive-coach-link"
              >
                See how private messaging coaching works <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </Link>

              {channelStatusLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking connection…</div>
              ) : channelStatus?.telegram.connected ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Telegram is connected</p>
                    <p className="text-sm text-gray-500">
                      {channelStatus.telegram.linkedAt
                        ? `Connected ${new Date(channelStatus.telegram.linkedAt).toLocaleDateString()}`
                        : "Your private coach connection is active."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectTelegramMutation.mutate()}
                    disabled={disconnectTelegramMutation.isPending}
                    className="gap-2"
                  >
                    {disconnectTelegramMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Disconnect
                  </Button>
                </div>
              ) : !channelStatus?.pilotEligible ? (
                <p className="text-sm text-gray-600">The Telegram coach is currently available to invited test runners. Your existing AI Coach features are unchanged.</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Ready to connect</p>
                    <p className="text-sm text-gray-500">The secure Telegram link expires after 10 minutes and can be used only once.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => connectTelegramMutation.mutate()}
                    disabled={connectTelegramMutation.isPending}
                    className="gap-2 bg-[#229ED9] hover:bg-[#1d8fc4]"
                  >
                    {connectTelegramMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Connect Telegram
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-strava-orange" />
                Proactive Coach
              </CardTitle>
              <CardDescription>
                A short, useful briefing at the right time—not another stream of notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label className="font-medium">Coach is {coachEnabled ? "active" : "paused"}</Label>
                  <p className="text-sm text-gray-500">Pause every proactive coach message without changing your training data.</p>
                </div>
                <Checkbox checked={coachEnabled} onCheckedChange={(checked) => { setCoachEnabled(!!checked); if (!checked) setCoachSnoozedUntil(null); }} />
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="font-medium">Morning run briefing</Label>
                    <p className="text-sm text-gray-500">Today's plan, recovery context, missed-run adjustment, race-week mode and optional weather.</p>
                  </div>
                  <Checkbox checked={coachDailyBriefingEnabled} onCheckedChange={(checked) => setCoachDailyBriefingEnabled(!!checked)} />
                </div>
                {coachDailyBriefingEnabled && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="briefing-hour">Local hour</Label>
                      <Input id="briefing-hour" type="number" min={0} max={23} value={coachDailyBriefingHour} onChange={(e) => setCoachDailyBriefingHour(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="coach-timezone">Timezone</Label>
                      <Input id="coach-timezone" value={coachTimezone} onChange={(e) => setCoachTimezone(e.target.value)} placeholder="America/New_York" />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CloudSun className="h-4 w-4 text-strava-orange" />
                  <Label className="font-medium">Weather-aware advice</Label>
                </div>
                <p className="text-sm text-gray-500">Optional. We use approximate coordinates only to adjust timing, effort and safety guidance.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={useCurrentLocation}>Use my current location</Button>
                  {coachWeatherLocation && <span className="text-sm text-gray-600">{coachWeatherLocation.label} added</span>}
                  {coachWeatherLocation && (
                    <Button type="button" variant="ghost" onClick={() => { setCoachWeatherEnabled(false); setCoachWeatherLocation(null); }}>Remove</Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <Label className="font-medium">Can you run today?</Label>
                <p className="text-sm text-gray-500">A one-tap check-in keeps the coach from recommending a session you cannot do.</p>
                <div className="flex flex-wrap gap-2">
                  {([['available', 'Yes'], ['limited', 'Only briefly'], ['unavailable', 'Not today']] as const).map(([value, label]) => (
                    <Button key={value} type="button" variant={coachDailyAvailability === value ? "default" : "outline"} onClick={() => setCoachDailyAvailability(value)}>{label}</Button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2"><PauseCircle className="h-4 w-4" /><Label className="font-medium">Need some quiet?</Label></div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => snoozeCoach(24)}>Snooze 24 hours</Button>
                  <Button type="button" variant="outline" onClick={() => snoozeCoach(24 * 7)}>Snooze 7 days</Button>
                  {coachSnoozedUntil && <Button type="button" variant="ghost" onClick={() => setCoachSnoozedUntil(null)}>Clear snooze</Button>}
                </div>
                {coachSnoozedUntil && <p className="text-sm text-gray-500">Paused until {new Date(coachSnoozedUntil).toLocaleString()}.</p>}
              </div>
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
                <Label htmlFor="coach-channel" className="font-medium">Preferred channel</Label>
                <select
                  id="coach-channel"
                  value={coachPreferredChannel}
                  onChange={(e) => setCoachPreferredChannel(e.target.value as "email" | "push" | "in_app")}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="email">Email</option>
                  <option value="push">Push notification</option>
                  <option value="in_app">In-app only</option>
                </select>
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
