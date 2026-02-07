import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

export interface UsageStats {
  insightsUsed: number;
  insightsLimit: number;
  insightsRemaining: number;
  resetAt: string | null;
  isPremiumUser: boolean;
}

export interface SubscriptionStatus {
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  subscriptionPlan: 'free' | 'pro' | 'premium';
  stripeSubscriptionId?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  usage?: UsageStats;
  isReverseTrial?: boolean;
  trialDaysRemaining?: number;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  
  const { data: subscription, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 60 * 1000,
  });

  const plan = subscription?.subscriptionPlan || 'free';
  const status = subscription?.subscriptionStatus || 'free';

  const isPremium = (plan === 'premium' || plan === 'pro') && (status === 'active' || status === 'trialing');
  const isFree = plan === 'free' || status === 'canceled' || status === 'past_due';

  const usage = subscription?.usage;
  
  const isReverseTrial = subscription?.isReverseTrial || false;
  const trialDaysRemaining = subscription?.trialDaysRemaining || 0;
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;

  return {
    subscription,
    isLoading,
    error,
    plan,
    status,
    isPremium,
    isPro: isPremium,
    isFree,
    hasActiveSubscription: isPremium,
    usage,
    isReverseTrial,
    trialDaysRemaining,
    trialEndsAt,
  };
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const data = await apiRequest("/api/stripe/create-checkout-session", "POST", { priceId });
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useManageSubscription() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiRequest("/api/stripe/create-portal-session", "POST");
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useFeatureAccess() {
  const { isPremium, isFree, usage, isReverseTrial } = useSubscription();
  
  const hasPremiumAccess = isPremium || isReverseTrial;
  const hasFreeAccess = isFree && !isReverseTrial;
  
  return {
    canAccessBasicAnalytics: true,
    canAccessStravaIntegration: true,
    canAccessRunnerScore: true,
    
    canAccessAdvancedInsights: hasPremiumAccess,
    canAccessInsightHistory: hasPremiumAccess,
    canAccessTrainingPlans: hasPremiumAccess,
    canAccessRacePredictions: hasPremiumAccess,
    
    canAccessAICoachChat: hasPremiumAccess,
    canAccessFormAnalysis: hasPremiumAccess,
    canAccessPrioritySupport: hasPremiumAccess,
    canAccessEarlyAccess: hasPremiumAccess,
    
    canAccessUnlimitedHistory: hasPremiumAccess,
    maxInsightsPerMonth: hasFreeAccess ? 3 : Infinity,
    maxDataHistoryDays: hasFreeAccess ? 30 : Infinity,
    
    insightsUsed: usage?.insightsUsed ?? 0,
    insightsRemaining: usage?.insightsRemaining ?? 3,
    insightsLimit: usage?.insightsLimit ?? 3,
    usageResetAt: usage?.resetAt ? new Date(usage.resetAt) : null,
    
    isOnReverseTrial: isReverseTrial,
    
    activity: {
      coachVerdict: hasPremiumAccess ? 'full' : 'basic',
      nextSteps: hasPremiumAccess ? 'full' : 'basic',
      routeMap: true,
      baselineComparison: hasPremiumAccess,
      
      performanceMetrics: hasPremiumAccess,
      timeline: hasPremiumAccess ? 'full' : 'readonly',
      splits: hasPremiumAccess ? 'full' : 'preview',
      hrCadencePower: hasPremiumAccess,
      
      askCoach: hasPremiumAccess,
      activityComparison: hasPremiumAccess,
      goalPlanActions: hasPremiumAccess,
    }
  };
}
