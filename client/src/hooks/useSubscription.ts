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
  // Reverse trial fields
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

  const isPremium = plan === 'premium' && (status === 'active' || status === 'trialing');
  const isPro = (plan === 'pro' || plan === 'premium') && (status === 'active' || status === 'trialing');
  const isFree = plan === 'free' || status === 'canceled' || status === 'past_due';

  const usage = subscription?.usage;
  
  // Reverse trial specific data
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
    isPro,
    isFree,
    hasActiveSubscription: isPro || isPremium,
    usage,
    // Reverse trial exports
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
  const { isPro, isPremium, isFree, usage, isReverseTrial } = useSubscription();
  
  // Reverse trial users get Pro-level access
  const hasProAccess = isPro || isPremium || isReverseTrial;
  const hasFreeAccess = isFree && !isReverseTrial;
  
  return {
    canAccessBasicAnalytics: true,
    canAccessStravaIntegration: true,
    canAccessRunnerScore: true,
    
    canAccessAdvancedInsights: hasProAccess,
    canAccessInsightHistory: hasProAccess,
    canAccessTrainingPlans: hasProAccess,
    canAccessRacePredictions: hasProAccess,
    
    canAccessAICoachChat: isPremium,
    canAccessFormAnalysis: isPremium,
    canAccessPrioritySupport: isPremium,
    canAccessEarlyAccess: isPremium,
    
    canAccessUnlimitedHistory: hasProAccess,
    maxInsightsPerMonth: hasFreeAccess ? 3 : Infinity,
    maxDataHistoryDays: hasFreeAccess ? 30 : Infinity,
    
    // Usage stats
    insightsUsed: usage?.insightsUsed ?? 0,
    insightsRemaining: usage?.insightsRemaining ?? 3,
    insightsLimit: usage?.insightsLimit ?? 3,
    usageResetAt: usage?.resetAt ? new Date(usage.resetAt) : null,
    
    // Trial status for UI
    isOnReverseTrial: isReverseTrial,
  };
}
