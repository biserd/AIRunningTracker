import { Brain } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import RacePredictions from "@/components/dashboard/RacePredictions";
import TrainingPlan from "@/components/dashboard/TrainingPlan";
import InjuryRiskAnalysis from "@/components/dashboard/InjuryRiskAnalysis";

export default function MLInsightsPage() {
  const { user, isLoading } = useAuth();
  
  // Prefetch batch analytics data for all ML components
  const { data: batchData } = useQuery({
    queryKey: ['/api/analytics/batch', user?.id],
    queryFn: () => fetch(`/api/analytics/batch/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
    staleTime: 60000,
  });
  
  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">ML Performance Insights</h1>
              <p className="text-gray-600">AI-powered analysis and predictions for your running</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="xl:col-span-1">
            <RacePredictions userId={user.id} batchData={batchData} />
          </div>
          <div className="xl:col-span-1">
            <InjuryRiskAnalysis userId={user.id} batchData={batchData} />
          </div>
          <div className="xl:col-span-2">
            <TrainingPlan userId={user.id} batchData={batchData} />
          </div>
        </div>
      </main>
    </div>
  );
}