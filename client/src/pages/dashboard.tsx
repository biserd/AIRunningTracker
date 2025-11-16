import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import RecentActivities from "@/components/dashboard/RecentActivities";
import AIInsights from "@/components/dashboard/AIInsights";
import TrainingRecommendations from "@/components/dashboard/TrainingRecommendations";
import FitnessTrends from "@/components/dashboard/FitnessTrends";
import GoalProgress from "@/components/dashboard/GoalProgress";
import RunnerScoreRadar from "@/components/dashboard/RunnerScoreRadar";
import HistoricalRunnerScore from "@/components/dashboard/HistoricalRunnerScore";
import InsightHistory from "@/components/dashboard/InsightHistory";
import ProgressChecklist from "@/components/dashboard/ProgressChecklist";
import Onboarding from "@/components/Onboarding";
import { SyncProgress } from "@/components/SyncProgress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { StravaConnectButton, StravaPoweredBy } from "@/components/StravaConnect";
import { ChatPanel } from "@/components/ChatPanel";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import RecentConversations from "@/components/RecentConversations";
import { MessageCircle, X } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
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
      setSelectedConversationId(parseInt(chatId));
      setIsChatOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Check if user has chatted (for checklist)
  const { data: conversationSummaries } = useQuery<Array<{ id: number }>>({
    queryKey: ['/api/chat/summaries'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=1`);
      if (!res.ok) return [];
      return res.json();
    },
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
      toast({
        title: "Activities synced",
        description: "Activities synced and AI insights generated successfully",
      });
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync activities",
        variant: "destructive",
      });
    },
  });



  // Dashboard data query
  const { data: dashboardData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/dashboard/${user.id}`],
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
    const scope = "read,activity:read_all";
    
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
      const nonceResponse = await apiRequest(`/api/strava/sync/${user.id}/start-stream`, "POST", { maxActivities: 50 });
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
              // Refresh dashboard to update last sync time
              queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
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
            // Refresh data and close progress
            queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
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

      {/* AI Chat Floating Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-36 z-50 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        data-testid="button-toggle-chat"
        aria-label="Toggle AI Chat"
        title="AI Running Coach"
      >
        {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* AI Chat Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 transition-transform duration-300 ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isChatOpen}
      >
        <ChatPanel 
          userId={user.id} 
          onClose={() => {
            setIsChatOpen(false);
            setSelectedConversationId(undefined);
          }}
          initialConversationId={selectedConversationId}
        />
      </div>

      {/* Overlay for mobile */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setIsChatOpen(false)}
          data-testid="overlay-chat-mobile"
        />
      )}
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Chat Announcement Banner */}
        <AnnouncementBanner onOpenChat={() => setIsChatOpen(true)} />

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
        
        <QuickStats stats={dashboardData?.stats || { totalDistance: "0.0", avgPace: "0:00", trainingLoad: 0, recovery: "Unknown" }} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PerformanceChart 
              data={chartData?.chartData || dashboardData?.chartData || []} 
              unitPreference={dashboardData?.user?.unitPreference}
              onTimeRangeChange={handleTimeRangeChange}
              currentTimeRange={chartTimeRange}
            />
            <RunnerScoreRadar />
            <HistoricalRunnerScore />
            <RecentActivities activities={dashboardData?.activities || []} unitPreference={dashboardData?.user?.unitPreference} />
          </div>
          
          <div className="space-y-6">
            {/* Progress Checklist for New Users */}
            <ProgressChecklist 
              isStravaConnected={dashboardData?.user?.stravaConnected || false}
              hasActivities={(dashboardData?.activities?.length || 0) > 0}
              hasViewedScore={true} // They're on the dashboard, so they've seen it
              hasChatted={(conversationSummaries?.length || 0) > 0}
            />

            {/* Recent Conversations */}
            <RecentConversations 
              onOpenConversation={(id) => {
                setSelectedConversationId(id);
                setIsChatOpen(true);
              }}
            />
            
            <AIInsights insights={dashboardData?.insights || {}} userId={user?.id!} />
            <InsightHistory userId={user?.id!} />
            <TrainingRecommendations recommendations={dashboardData?.insights?.recommendations || []} userId={user?.id!} />
            <FitnessTrends chartData={dashboardData?.chartData || []} unitPreference={dashboardData?.user?.unitPreference} />
            <GoalProgress userId={user?.id!} unitPreference={dashboardData?.user?.unitPreference} />
          </div>
        </div>
      </main>
    </div>
  );
}
