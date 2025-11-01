import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

export interface SubscriptionStatus {
  status: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: 'free' | 'pro';
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  
  // OPTIMIZATION: Disabled subscription API calls since all features are free
  // All users get Pro-tier features at no cost
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["/api/subscription/status"],
    queryFn: () => apiRequest("/api/subscription/status", "GET") as Promise<SubscriptionStatus>,
    enabled: false, // Disabled - all features are free, no need to check subscription
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // All features are now free - everyone gets Pro access
  const isPro = true;
  const isFree = false;

  return {
    subscription,
    isLoading,
    error,
    isPro,
    isFree,
    hasActiveSubscription: true,
  };
}

// Feature gating functions
export function useFeatureAccess() {
  const { isPro } = useSubscription();
  
  return {
    // AI Insights
    canAccessAdvancedInsights: isPro,
    canAccessInsightHistory: isPro,
    
    // Training Plans
    canAccessTrainingPlans: isPro,
    canAccessPersonalizedPlans: isPro,
    
    // Analytics
    canAccessRacePredictions: isPro,
    canAccessInjuryRiskAnalysis: isPro,
    canAccessUnlimitedHistory: isPro,
    
    // Support
    canAccessPrioritySupport: isPro,
    
    // Data limits
    maxInsightsPerMonth: isPro ? Infinity : 10,
    maxDataHistoryDays: isPro ? Infinity : 30,
  };
}