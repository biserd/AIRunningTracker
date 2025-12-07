import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

export interface SubscriptionStatus {
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  subscriptionPlan: 'free' | 'pro' | 'premium';
  stripeSubscriptionId?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
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
  };
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest("/api/stripe/create-checkout-session", "POST", { priceId });
      return response.json();
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
      const response = await apiRequest("/api/stripe/create-portal-session", "POST");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useFeatureAccess() {
  const { isPro, isPremium, isFree } = useSubscription();
  
  return {
    canAccessBasicAnalytics: true,
    canAccessStravaIntegration: true,
    canAccessRunnerScore: true,
    
    canAccessAdvancedInsights: isPro || isPremium,
    canAccessInsightHistory: isPro || isPremium,
    canAccessTrainingPlans: isPro || isPremium,
    canAccessRacePredictions: isPro || isPremium,
    
    canAccessAICoachChat: isPremium,
    canAccessFormAnalysis: isPremium,
    canAccessPrioritySupport: isPremium,
    canAccessEarlyAccess: isPremium,
    
    canAccessUnlimitedHistory: isPro || isPremium,
    maxInsightsPerMonth: isFree ? 3 : Infinity,
    maxDataHistoryDays: isFree ? 30 : Infinity,
  };
}
