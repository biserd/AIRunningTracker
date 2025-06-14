import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/dashboard/Header";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickStats from "@/components/dashboard/QuickStats";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import RecentActivities from "@/components/dashboard/RecentActivities";
import AIInsights from "@/components/dashboard/AIInsights";
import TrainingRecommendations from "@/components/dashboard/TrainingRecommendations";
import FitnessTrends from "@/components/dashboard/FitnessTrends";
import GoalProgress from "@/components/dashboard/GoalProgress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [userId, setUserId] = useState<number>(1); // Use consistent user ID
  const [chartTimeRange, setChartTimeRange] = useState<string>("30days");
  const { toast } = useToast();
  const [location] = useLocation();

  // Sync activities mutation
  const syncMutation = useMutation({
    mutationFn: (userId: number) => api.syncActivities(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', userId] });
      toast({
        title: "Activities synced",
        description: "Your Strava activities have been synced successfully",
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

  // Generate insights mutation
  const insightsMutation = useMutation({
    mutationFn: (userId: number) => api.generateInsights(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', userId] });
      toast({
        title: "AI insights generated",
        description: "Your performance insights have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Insights failed",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  // Dashboard data query
  const { data: dashboardData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/dashboard/${userId}`],
  });

  // Chart data query with time range
  const { data: chartData } = useQuery({
    queryKey: ['/api/chart', userId, chartTimeRange],
    queryFn: () => fetch(`/api/chart/${userId}?range=${chartTimeRange}`).then(res => res.json()),
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
        description: "Your Strava account has been successfully connected",
      });
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error')) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Strava. Please try again.",
        variant: "destructive",
      });
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStravaConnect = () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please wait for the app to load",
        variant: "destructive",
      });
      return;
    }

    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID || "default_client_id";
    const redirectUri = `${window.location.origin}/strava/callback`;
    const scope = "read,activity:read_all";
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${userId}`;
    
    window.location.href = stravaAuthUrl;
  };

  const handleSyncActivities = () => {
    if (userId) {
      syncMutation.mutate(userId);
    }
  };

  const handleGenerateInsights = () => {
    if (userId) {
      insightsMutation.mutate(userId);
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
      <Header 
        stravaConnected={dashboardData?.user?.stravaConnected || false}
        onStravaConnect={handleStravaConnect}
        onSyncActivities={handleSyncActivities}
        onGenerateInsights={handleGenerateInsights}
        isSyncing={syncMutation.isPending}
        isGeneratingInsights={insightsMutation.isPending}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <WelcomeSection userName={dashboardData?.user?.name || "Runner"} lastSyncAt={dashboardData?.user?.lastSyncAt} />
        
        <QuickStats stats={dashboardData?.stats || { totalDistance: "0.0", avgPace: "0:00", trainingLoad: 0, recovery: "Unknown" }} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PerformanceChart 
              data={chartData?.chartData || dashboardData?.chartData || []} 
              unitPreference={dashboardData?.user?.unitPreference}
              onTimeRangeChange={handleTimeRangeChange}
            />
            <RecentActivities activities={dashboardData?.activities || []} unitPreference={dashboardData?.user?.unitPreference} />
          </div>
          
          <div className="space-y-6">
            <AIInsights insights={dashboardData?.insights || {}} />
            <TrainingRecommendations recommendations={dashboardData?.insights?.recommendations || []} />
            <FitnessTrends chartData={dashboardData?.chartData || []} unitPreference={dashboardData?.user?.unitPreference} />
            <GoalProgress />
          </div>
        </div>
      </main>
    </div>
  );
}
