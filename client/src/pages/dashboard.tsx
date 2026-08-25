import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import AIInsights from "@/components/dashboard/AIInsights";
import TrainingRecommendations from "@/components/dashboard/TrainingRecommendations";
import RunnerScoreRadar from "@/components/dashboard/RunnerScoreRadar";
import ProgressChecklist from "@/components/dashboard/ProgressChecklist";
import PremiumPreviewTeaser from "@/components/dashboard/PremiumPreviewTeaser";
import { TelegramConnectionCard } from "@/components/TelegramConnectionCard";
import TodayRunDecision from "@/components/dashboard/TodayRunDecision";
import ThisWeekPlan from "@/components/dashboard/ThisWeekPlan";
import { SyncProgress } from "@/components/SyncProgress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { StravaConnectButton } from "@/components/StravaConnect";
import { FloatingAICoach } from "@/components/FloatingAICoach";
import RecentConversations from "@/components/RecentConversations";
import { CheckCircle2 } from "lucide-react";
import EmailCaptureModal from "@/components/EmailCaptureModal";
import { Link } from "wouter";
import { useFeatureAccess, useSubscription } from "@/hooks/useSubscription";
import { buildUpgradeUrl } from "@shared/upgradeIntent";

function getLocalCalendarDateKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getLocalIsoDateKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { canAccessAICoachChat, canAccessAdvancedInsights } = useFeatureAccess();
  const { isFree } = useSubscription();
  const [chartTimeRange, setChartTimeRange] = useState<string>("30days");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dashboardCalendarDate, setDashboardCalendarDate] = useState(getLocalCalendarDateKey);
  const [selectedConversationId, setSelectedConversationId] = useState<number | undefined>();
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    activityName: string;
    status: 'syncing' | 'insights' | 'complete' | 'error';
    errorMessage?: string;
  } | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check for openChat query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('openChat');
    if (chatId) {
      if (chatId === 'new') {
        setSelectedConversationId(undefined);
      } else {
        setSelectedConversationId(parseInt(chatId));
      }
      setIsChatOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Send heartbeat to track user activity and record activation
  useEffect(() => {
    if (user?.id) {
      // Send heartbeat for lastSeen tracking
      apiRequest(`/api/users/${user.id}/heartbeat`, "POST")
        .then((result) => {
          const params = new URLSearchParams(window.location.search);
          if (result?.reactivated || params.get("account") === "reactivate") {
            toast({
              title: "Account reactivated",
              description: "New Strava activities will be processed again.",
            });
            params.delete("account");
            const query = params.toString();
            window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
          }
        })
        .catch(() => {});
      
      // Record activation when user views dashboard (one-time event)
      const activationKey = `activation_recorded_${user.id}`;
      if (!localStorage.getItem(activationKey)) {
        apiRequest(`/api/users/${user.id}/activation`, "POST", { activationType: 'dashboard_view' })
          .then(() => localStorage.setItem(activationKey, 'true'))
          .catch(() => {});
      }
    }
  }, [user?.id, toast]);

  // Show one-time "welcome" toast for users arriving fresh from signup.
  // New users land here on the free plan with a 20-run cap and a
  // card-on-file upgrade nudge.
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') !== '1') return;
    const seenKey = `welcome_shown_${user.id}`;
    if (localStorage.getItem(seenKey)) return;
    setTimeout(() => {
      toast({
        title: "Welcome to RunAnalytics!",
        description: "Your activities are syncing from Strava: they'll appear on your dashboard in a few seconds.",
        duration: 8000,
      });
      localStorage.setItem(seenKey, 'true');
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.pathname + url.search);
    }, 800);
  }, [user?.id, toast]);

  // NOTE: All hooks must be declared before any conditional return. Early
  // returns for authLoading / !user live just above the render section below:
  // putting them here (before the hooks that follow) changes the hook count
  // between renders and crashes React the moment auth or data state shifts.

  // Dashboard data query with polling when insights are generating or new user is waiting for first sync
  const { data: dashboardData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/dashboard/${user?.id}`, dashboardCalendarDate],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // New user: Strava connected but sync not yet finished: poll every 3s until activities land
      if (data?.user?.stravaConnected && !data?.user?.lastSyncAt) return 3000;
      // Also poll when sync is actively running
      if (data?.insightsStatus === 'syncing') return 3000;
      // Poll every 5s while AI insights are generating
      if (data?.insightsStatus === 'generating') return 5000;
      return false;
    },
  });

  // Roll the query key at local midnight so an open dashboard cannot keep
  // yesterday's week/month totals under today's labels.
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);
    const timeout = window.setTimeout(
      () => setDashboardCalendarDate(getLocalCalendarDateKey()),
      Math.max(1000, nextMidnight.getTime() - now.getTime()),
    );
    return () => window.clearTimeout(timeout);
  }, [dashboardCalendarDate]);

  // When activities first land (0 → N), every other query on the page was
  // fetched while the account was still empty and, with the app-wide
  // staleTime of Infinity: will never refetch on its own. Invalidate the
  // whole cache (except the dashboard query that just delivered the fresh
  // data) so all sub-components repopulate immediately.
  const activitiesCount = dashboardData?.activities?.length ?? 0;
  const prevActivitiesCount = useRef<number>(0);
  useEffect(() => {
    if (prevActivitiesCount.current === 0 && activitiesCount > 0) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] !== `/api/dashboard/${user?.id}`,
      });
    }
    prevActivitiesCount.current = activitiesCount;
  }, [activitiesCount, user?.id]);

  // Recovery status query
  const { data: recoveryData } = useQuery<{
    daysSinceLastRun: number;
    freshnessScore: number;
    riskLevel: string;
    riskReduced: boolean;
    originalRiskLevel: string;
    readyToRun: boolean;
    recommendedNextStep: string;
    statusMessage: string;
    recoveryMessage: string;
  }>({
    queryKey: [`/api/performance/recovery/${user?.id}`],
    enabled: !!user?.id && canAccessAdvancedInsights,
    staleTime: 30000,
  });

  // Chart data query with time range
  const { data: chartData } = useQuery({
    queryKey: ['/api/chart', user?.id, chartTimeRange],
    queryFn: () => apiRequest(`/api/chart/${user?.id}?range=${chartTimeRange}`, "GET"),
    enabled: !!user?.id,
  });

  const handleTimeRangeChange = (range: string) => {
    setChartTimeRange(range);
  };

  const updateTodayAvailability = async (availability: "available" | "limited" | "unavailable") => {
    if (!user?.id) return;
    try {
      await apiRequest(`/api/users/${user.id}/coach-preferences`, "PATCH", {
        coachDailyAvailability: availability,
        coachTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
      toast({ title: "Coach updated", description: availability === "unavailable" ? "Today will be treated as a no-run day." : availability === "limited" ? "Today's recommendation will stay short." : "Today's plan can use your normal availability." });
    } catch (error: any) {
      toast({ title: "Could not update availability", description: error?.message || "Please try again.", variant: "destructive" });
    }
  };



  useEffect(() => {
    // Handle URL parameters for Strava connection feedback
    if (!user?.id) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'true') {
      toast({
        title: "Strava Connected!",
        description: "Activities synced and AI insights generated successfully",
      });
      // Clear URL parameters and refresh data
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=3m`] });
      queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=6m`] });
    } else if (urlParams.get('error')) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Strava. Please try again.",
        variant: "destructive",
      });
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.id]);

  const handleStravaConnect = () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID || "default_client_id";
    const redirectUri = `${window.location.origin}/strava/callback`;
    const scope = "read,activity:read_all,activity:write";
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${user.id}`;
    
    window.location.href = stravaAuthUrl;
  };

  const handleSyncActivities = async () => {
    if (!user) return;
    
    // Reset progress state
    setSyncProgress({
      current: 0,
      total: 0,
      activityName: 'Starting sync...',
      status: 'syncing'
    });
    
    try {
      // First, get a short-lived SSE nonce (cryptographic random, NOT a JWT)
      const nonceResponse = await apiRequest(`/api/strava/sync/${user.id}/start-stream`, "POST", { maxActivities: 200 });
      const nonce = nonceResponse.sseNonce;
      
      // Use EventSource with secure nonce (cannot be used for other API calls)
      const eventSource = new EventSource(
        `/api/strava/sync/${user.id}/stream?nonce=${encodeURIComponent(nonce)}`
      );
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'complete') {
            // No new activities - show quick success message and close immediately
            if (data.syncedCount === 0) {
              eventSource.close();
              setSyncProgress({
                current: 0,
                total: 0,
                activityName: 'Already up to date!',
                status: 'complete'
              });
              // Refresh dashboard and heatmap to update last sync time
              queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
              queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=3m`] });
              queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=6m`] });
              setTimeout(() => {
                setSyncProgress(null);
              }, 2000);
            } else {
              // New activities synced - keep connection open for insights
              setSyncProgress({
                current: data.syncedCount,
                total: data.totalActivities,
                activityName: `Synced ${data.syncedCount} new activities`,
                status: 'complete'
              });
            }
          } else if (data.type === 'insights') {
            setSyncProgress(prev => prev ? { ...prev, status: 'insights' } : null);
          } else if (data.type === 'insights_complete') {
            eventSource.close();
            // Refresh data, heatmap, and close progress
            queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=3m`] });
            queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=6m`] });
            setTimeout(() => {
              setSyncProgress(null);
              window.location.reload();
            }, 1500);
          } else if (data.type === 'error') {
            eventSource.close();
            setSyncProgress({
              current: 0,
              total: 0,
              activityName: '',
              status: 'error',
              errorMessage: data.message
            });
          } else {
            // Progress update
            setSyncProgress({
              current: data.current,
              total: data.total,
              activityName: data.activityName,
              status: 'syncing'
            });
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setSyncProgress({
          current: 0,
          total: 0,
          activityName: '',
          status: 'error',
          errorMessage: 'Connection to server lost'
        });
      };
    } catch (error: any) {
      console.error('Sync error:', error);
      const code = error?.data?.code || error?.code;
      if (code === 'TRIAL_REQUIRED' || /TRIAL_REQUIRED/i.test(error?.message || '')) {
        setSyncProgress(null);
        toast({
          title: "Upgrade to keep syncing",
          description: "Free accounts get one Strava sync. Start a free Premium trial to keep importing new activities.",
          variant: "destructive",
          action: (
            <Link href={buildUpgradeUrl({
              source: "dashboard_sync_limit",
              capability: "unlimited_sync",
              benefitKey: "unlimited_sync",
              returnTo: "/dashboard",
            })}>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                Start trial
              </Button>
            </Link>
          ),
        });
        return;
      }
      setSyncProgress({
        current: 0,
        total: 0,
        activityName: '',
        status: 'error',
        errorMessage: error.message || 'Failed to sync activities'
      });
    }
  };



  // Early returns: safe here because every hook above has already run.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-light-grey">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8" aria-busy="true" aria-label="Loading dashboard">
          <div className="animate-pulse">
            <div className="mb-6 space-y-2">
              <div className="h-8 max-w-xs rounded bg-gray-300"></div>
              <div className="h-4 max-w-md rounded bg-gray-200"></div>
            </div>
            <div className="mb-6 h-32 rounded-xl border border-blue-100 bg-white"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">Error loading dashboard</h1>
          <p className="text-gray-600 mb-4">Error: {error?.message || 'Unknown error'}</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  const showEmailCaptureModal =
    !!dashboardData?.user?.stravaConnected && !dashboardData?.user?.email;

  // Show syncing screen when Strava is connected but the first sync hasn't finished yet
  const showSyncingScreen =
    !showEmailCaptureModal &&
    !!dashboardData?.user?.stravaConnected &&
    !dashboardData?.user?.lastSyncAt &&
    (dashboardData?.activities?.length ?? 0) === 0;

  if (showSyncingScreen) {
    return (
      <div className="min-h-screen bg-light-grey">
        <AppHeader />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-orange-200 border-t-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">Importing your runs…</h2>
          <p className="text-gray-500 max-w-sm mb-6">
            We're pulling your activities from Strava. This usually takes under 30 seconds.
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />

      <EmailCaptureModal open={showEmailCaptureModal} userId={user.id} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">{isFree ? "Your latest run, clearly explained" : "Your running today"}</h1>
          <p className="mt-1 text-sm text-gray-500">{isFree ? "A personal comparison, one next step, and your recent progress." : "One next step, your latest evidence, and this week’s progress."}</p>
        </div>

        {!(dashboardData?.user?.stravaConnected && (dashboardData?.activities?.length || 0) > 0) && (
          <div className="mb-6">
            <ProgressChecklist
              isStravaConnected={dashboardData?.user?.stravaConnected || false}
              hasActivities={(dashboardData?.activities?.length || 0) > 0}
              hasViewedScore={true}
            />
          </div>
        )}

        {/* Lead free runners with proof of value before general guidance. */}
        <PremiumPreviewTeaser />

        {user?.id && (
          <div className="mb-6">
            <TelegramConnectionCard userId={user.id} location="dashboard" />
          </div>
        )}

        <div className="mb-6">
          <TodayRunDecision
            recoveryData={recoveryData}
            isStravaConnected={!!dashboardData?.user?.stravaConnected}
            recentRuns={dashboardData?.activities?.length || 0}
            latestRunAt={dashboardData?.activities?.[0]?.startDate}
            availability={dashboardData?.user?.coachDailyAvailabilityDate === getLocalIsoDateKey() ? dashboardData?.user?.coachDailyAvailability : null}
            onAvailabilityChange={canAccessAICoachChat ? updateTodayAvailability : undefined}
          />
        </div>

        {/* Strava Sync Actions */}
        <div className="mb-6 flex flex-wrap gap-4">
          {!dashboardData?.user?.stravaConnected ? (
            <StravaConnectButton 
              onClick={handleStravaConnect}
              variant="orange"
              size="default"
            />
          ) : isFree ? (
            <div className="flex items-start gap-2 text-sm text-gray-600" data-testid="status-strava-connected">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div>
                <p className="font-medium text-charcoal">Strava connected</p>
                <p>Your free preview uses your initial activity window. Start a trial to keep importing and analyzing new runs.</p>
                {dashboardData?.user?.lastSyncAt && (
                  <p className="mt-0.5 text-xs text-gray-500">Last update: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              <Button 
                onClick={handleSyncActivities}
                disabled={syncProgress !== null}
                variant="outline"
                data-testid="button-sync-activities"
                className="w-fit"
              >
                {syncProgress !== null ? "Syncing..." : "Sync Activities"}
              </Button>
              {dashboardData?.user?.lastSyncAt && !syncProgress && (
                <span className="text-xs text-gray-500 mt-1" data-testid="text-last-sync">
                  Last sync: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Sync Progress Indicator */}
        {syncProgress && (
          <div className="mb-8">
            <SyncProgress 
              current={syncProgress.current}
              total={syncProgress.total}
              activityName={syncProgress.activityName}
              status={syncProgress.status}
              errorMessage={syncProgress.errorMessage}
            />
          </div>
        )}
        
        <div className="mb-6">
          <QuickStats stats={dashboardData?.stats || {
            monthlyTotalDistance: "0.0", monthlyAvgPace: "0:00", monthlyTotalMinutes: 0, monthlyTotalActivities: 0,
            weeklyTotalDistance: "0.0", weeklyAvgPace: "0:00", weeklyTotalMinutes: 0, weeklyTotalActivities: 0,
            totalDistance: "0.0", avgPace: "0:00", runningTimeMinutes: 0, recovery: "Unknown",
          }} />
        </div>

        <div className="mb-8">
          <ThisWeekPlan />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <PerformanceChart
            data={(chartData?.chartData?.length ? chartData.chartData : dashboardData?.chartData) || []}
            unitPreference={dashboardData?.user?.unitPreference}
            onTimeRangeChange={handleTimeRangeChange}
            currentTimeRange={chartTimeRange}
          />
          <RunnerScoreRadar />
        </div>

        {!isFree && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <AIInsights insights={dashboardData?.insights || {}} userId={user.id} insightsStatus={dashboardData?.insightsStatus} />
            <TrainingRecommendations recommendations={dashboardData?.insights?.recommendations || []} userId={user.id} insightsStatus={dashboardData?.insightsStatus} />
          </div>
        )}

        <details className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 font-medium text-charcoal">More analytics</summary>
          <div className="space-y-8 border-t border-gray-100 p-5">
            <ActivityHeatmap />
            {canAccessAICoachChat && (
              <RecentConversations
                onOpenConversation={(id) => {
                  setSelectedConversationId(id);
                  setIsChatOpen(true);
                }}
              />
            )}
          </div>
        </details>
      </main>
      
      {user && (
        <FloatingAICoach 
          userId={user.id} 
          isOpen={isChatOpen}
          onOpenChange={setIsChatOpen}
          initialConversationId={selectedConversationId}
          pageContext={{
            pageName: "Dashboard",
            pageDescription: "Main dashboard showing running performance overview, charts, and quick stats",
            relevantData: {
              totalDistance: dashboardData?.stats?.totalDistance,
              avgPace: dashboardData?.stats?.avgPace,
              runningTimeMinutes: dashboardData?.stats?.runningTimeMinutes,
              recovery: dashboardData?.stats?.recovery,
              recentActivities: dashboardData?.activities?.length || 0
            }
          }}
        />
      )}
    </div>
  );
}
