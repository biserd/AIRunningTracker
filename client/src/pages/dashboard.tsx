import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import DashboardHeatmap from "@/components/dashboard/DashboardHeatmap";
import AIInsights from "@/components/dashboard/AIInsights";
import TrainingRecommendations from "@/components/dashboard/TrainingRecommendations";
import FitnessTrends from "@/components/dashboard/FitnessTrends";
import GoalProgress from "@/components/dashboard/GoalProgress";
import RunnerScoreRadar from "@/components/dashboard/RunnerScoreRadar";
import HistoricalRunnerScore from "@/components/dashboard/HistoricalRunnerScore";
import ProgressChecklist from "@/components/dashboard/ProgressChecklist";
import ShoeHub from "@/components/dashboard/ShoeHub";
import Onboarding from "@/components/Onboarding";
import { SyncProgress } from "@/components/SyncProgress";
import { FitnessChart } from "@/components/FitnessChart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { StravaConnectButton, StravaPoweredBy } from "@/components/StravaConnect";
import { FloatingAICoach } from "@/components/FloatingAICoach";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import RecentConversations from "@/components/RecentConversations";
import TrialBadge from "@/components/TrialBadge";
import { Gift, ChevronRight, Crown } from "lucide-react";
import { Link } from "wouter";
import { useFeatureAccess, useSubscription } from "@/hooks/useSubscription";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { canAccessAICoachChat, insightsUsed, insightsLimit, maxInsightsPerMonth } = useFeatureAccess();
  const { isReverseTrial, trialDaysRemaining } = useSubscription();
  const [chartTimeRange, setChartTimeRange] = useState<string>("30days");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
      apiRequest('POST', `/api/users/${user.id}/heartbeat`).catch(() => {});
      
      // Record activation when user views dashboard (one-time event)
      const activationKey = `activation_recorded_${user.id}`;
      if (!localStorage.getItem(activationKey)) {
        apiRequest('POST', `/api/users/${user.id}/activation`, { activationType: 'dashboard_view' })
          .then(() => localStorage.setItem(activationKey, 'true'))
          .catch(() => {});
      }
    }
  }, [user?.id]);

  // Show welcome toast for reverse trial users on first visit
  useEffect(() => {
    if (isReverseTrial && user?.id) {
      const seenKey = `trial_welcome_shown_${user.id}`;
      const hasSeenWelcome = localStorage.getItem(seenKey);
      
      if (!hasSeenWelcome) {
        setTimeout(() => {
          toast({
            title: "Welcome to your 7-day Premium trial!",
            description: `You have ${trialDaysRemaining} days to explore unlimited AI insights, training plans, race predictions, and more. Cancel anytime.`,
            duration: 8000,
          });
          localStorage.setItem(seenKey, 'true');
        }, 1500);
      }
    }
  }, [isReverseTrial, user?.id, trialDaysRemaining, toast]);

  // Check if user has chatted (for checklist)
  const { data: conversationSummaries } = useQuery<Array<{ id: number }>>({
    queryKey: ['/api/chat/summaries?limit=1'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

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

  // Sync activities mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest(`/api/strava/sync/${user.id}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=3m`] });
      queryClient.invalidateQueries({ queryKey: [`/api/activities/heatmap?range=6m`] });
      toast({
        title: "Sync started",
        description: "Syncing activities from Strava. Your dashboard will update automatically.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync activities",
        variant: "destructive",
      });
    },
  });



  // Dashboard data query with polling when insights are generating
  const { data: dashboardData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/dashboard/${user.id}`],
    refetchInterval: (query) => {
      // Only check status after successful initial fetch
      if (!query.state.data) return false;
      // Poll every 5 seconds while insights are being generated
      const status = query.state.data?.insightsStatus;
      if (status === 'syncing' || status === 'generating') {
        return 5000;
      }
      return false; // Stop polling when ready
    },
  });

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
    queryKey: [`/api/performance/recovery/${user.id}`],
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Chart data query with time range
  const { data: chartData } = useQuery({
    queryKey: ['/api/chart', user.id, chartTimeRange],
    queryFn: () => apiRequest(`/api/chart/${user.id}?range=${chartTimeRange}`, "GET"),
  });

  const handleTimeRangeChange = (range: string) => {
    setChartTimeRange(range);
  };



  useEffect(() => {
    // Check if user should see onboarding
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (!onboardingCompleted && user) {
      // Small delay to ensure dashboard data is loaded
      setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
    }
  }, [user]);

  useEffect(() => {
    // Handle URL parameters for Strava connection feedback
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
      setSyncProgress({
        current: 0,
        total: 0,
        activityName: '',
        status: 'error',
        errorMessage: error.message || 'Failed to sync activities'
      });
    }
  };



  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-light-grey">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
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
        </div>
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

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      {/* Onboarding Modal */}
      <Onboarding 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStravaConnect={handleStravaConnect}
        isStravaConnected={dashboardData?.user?.stravaConnected || false}
      />

      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Chat Announcement Banner - Only for Premium Users */}
        {canAccessAICoachChat && (
          <AnnouncementBanner onOpenChat={() => setIsChatOpen(true)} />
        )}

        {/* Trial Badge for reverse trial users */}
        <TrialBadge />

        {/* Strava Sync Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          {!dashboardData?.user?.stravaConnected ? (
            <StravaConnectButton 
              onClick={handleStravaConnect}
              variant="orange"
              size="default"
            />
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
        
        <QuickStats stats={dashboardData?.stats || { totalDistance: "0.0", avgPace: "0:00", trainingLoad: 0, recovery: "Unknown" }} recoveryData={recoveryData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PerformanceChart 
              data={chartData?.chartData || dashboardData?.chartData || []} 
              unitPreference={dashboardData?.user?.unitPreference}
              onTimeRangeChange={handleTimeRangeChange}
              currentTimeRange={chartTimeRange}
            />
            <FitnessChart userId={user?.id!} />
            <RunnerScoreRadar />
            <HistoricalRunnerScore />
            <ActivityHeatmap />
            <DashboardHeatmap />
          </div>
          
          <div className="space-y-6">
            {/* Progress Checklist for New Users */}
            <ProgressChecklist 
              isStravaConnected={dashboardData?.user?.stravaConnected || false}
              hasActivities={(dashboardData?.activities?.length || 0) > 0}
              hasViewedScore={true} // They're on the dashboard, so they've seen it
              hasChatted={(conversationSummaries?.length || 0) > 0}
            />

            {/* My Goals - moved up for visibility */}
            <GoalProgress userId={user?.id!} unitPreference={dashboardData?.user?.unitPreference} />
            
            <AIInsights insights={dashboardData?.insights || {}} userId={user?.id!} insightsStatus={dashboardData?.insightsStatus} />
            <TrainingRecommendations recommendations={dashboardData?.insights?.recommendations || []} userId={user?.id!} insightsStatus={dashboardData?.insightsStatus} />
            <FitnessTrends chartData={dashboardData?.chartData || []} unitPreference={dashboardData?.user?.unitPreference} />

            {/* Recent Conversations - Premium Only */}
            {canAccessAICoachChat && (
              <RecentConversations 
                onOpenConversation={(id) => {
                  setSelectedConversationId(id);
                  setIsChatOpen(true);
                }}
              />
            )}
            
            <ShoeHub />
          </div>
        </div>
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
              trainingLoad: dashboardData?.stats?.trainingLoad,
              recovery: dashboardData?.stats?.recovery,
              recentActivities: dashboardData?.activities?.length || 0
            }
          }}
        />
      )}
    </div>
  );
}
