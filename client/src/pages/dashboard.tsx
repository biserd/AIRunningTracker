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

export default function Dashboard() {
  const [userId, setUserId] = useState<number | null>(null);
  const { toast } = useToast();

  // Create demo user on first load
  const createUserMutation = useMutation({
    mutationFn: api.createDemoUser,
    onSuccess: (data) => {
      setUserId(data.user.id);
      toast({
        title: "Demo user created",
        description: "You can now connect to Strava to see your data",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create demo user",
        variant: "destructive",
      });
    },
  });

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
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard', userId],
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) {
      createUserMutation.mutate();
    }
  }, []);

  const handleStravaConnect = () => {
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
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">Error loading dashboard</h1>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <Header 
        stravaConnected={dashboardData.user.stravaConnected}
        onStravaConnect={handleStravaConnect}
        onSyncActivities={handleSyncActivities}
        onGenerateInsights={handleGenerateInsights}
        isSyncing={syncMutation.isPending}
        isGeneratingInsights={insightsMutation.isPending}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <WelcomeSection userName={dashboardData.user.name} />
        
        <QuickStats stats={dashboardData.stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PerformanceChart data={dashboardData.chartData} />
            <RecentActivities activities={dashboardData.activities} />
          </div>
          
          <div className="space-y-6">
            <AIInsights insights={dashboardData.insights} />
            <TrainingRecommendations recommendations={dashboardData.insights.recommendations} />
            <FitnessTrends />
            <GoalProgress />
          </div>
        </div>
      </main>
    </div>
  );
}
