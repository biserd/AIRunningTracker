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
import InsightHistory from "@/components/dashboard/InsightHistory";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [chartTimeRange, setChartTimeRange] = useState<string>("30days");
  const { toast } = useToast();
  const [location] = useLocation();

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

  const handleSyncActivities = () => {
    syncMutation.mutate();
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
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Strava Sync Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          {!dashboardData?.user?.stravaConnected ? (
            <Button 
              onClick={handleStravaConnect}
              className="bg-strava-orange hover:bg-strava-orange/90 text-white"
            >
              Connect Strava Account
            </Button>
          ) : (
            <div className="flex flex-col">
              <Button 
                onClick={handleSyncActivities}
                disabled={syncMutation.isPending}
                variant="outline"
              >
                {syncMutation.isPending ? "Syncing..." : "Sync Activities"}
              </Button>
              {dashboardData?.user?.lastSyncAt && (
                <span className="text-xs text-gray-500 mt-1">
                  Last sync: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
        
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
            <RecentActivities activities={dashboardData?.activities || []} unitPreference={dashboardData?.user?.unitPreference} />
          </div>
          
          <div className="space-y-6">
            <AIInsights insights={dashboardData?.insights || {}} />
            <InsightHistory userId={user?.id!} />
            <TrainingRecommendations recommendations={dashboardData?.insights?.recommendations || []} />
            <FitnessTrends chartData={dashboardData?.chartData || []} unitPreference={dashboardData?.user?.unitPreference} />
            <GoalProgress userId={user?.id!} unitPreference={dashboardData?.user?.unitPreference} />
          </div>
        </div>
      </main>
    </div>
  );
}
