import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import {
  canAccessCapability,
  getCapabilityMatrix,
  hasPremiumAccess,
} from "@shared/entitlements";

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

  const subject = { subscriptionPlan: plan, subscriptionStatus: status };
  const isPremium = hasPremiumAccess(subject);
  const isFree = !isPremium;

  const usage = subscription?.usage;

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
    trialEndsAt,
  };
}

export interface CheckoutParams {
  priceId: string;
  /** Relative in-app path to return the user to after trial activation. */
  returnTo?: string;
  /** Funnel attribution: where the checkout was initiated from. */
  source?: string;
  /** Funnel attribution: the capability the user was trying to unlock. */
  capability?: string;
  activityId?: number;
  benefitKey?: string;
  pendingResourceId?: string;
  experimentVariant?: string;
}

export function useCheckout(onRequiresEmail?: () => void) {
  return useMutation({
    mutationFn: async (params: string | CheckoutParams) => {
      const { priceId, returnTo, source, capability, activityId, benefitKey, pendingResourceId, experimentVariant } =
        typeof params === "string"
          ? { priceId: params, returnTo: undefined, source: undefined, capability: undefined, activityId: undefined, benefitKey: undefined, pendingResourceId: undefined, experimentVariant: undefined }
          : params;
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          priceId,
          ...(returnTo ? { returnTo } : {}),
          ...(source ? { source } : {}),
          ...(capability ? { capability } : {}),
          ...(activityId ? { activityId } : {}),
          ...(benefitKey ? { benefitKey } : {}),
          ...(pendingResourceId ? { pendingResourceId } : {}),
          ...(experimentVariant ? { experimentVariant } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 402 && data.requiresEmail) {
        onRequiresEmail?.();
        return null;
      }
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data?.url) {
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
  const { isPremium, isFree, usage, plan, status } = useSubscription();

  const hasPremiumAccess = isPremium;
  const hasFreeAccess = isFree;
  const subject = { subscriptionPlan: plan, subscriptionStatus: status };
  const matrix = getCapabilityMatrix(subject);

  return {
    entitlementState: matrix.state,
    capabilityMatrix: matrix,
    canAccessBasicAnalytics: true,
    canAccessStravaIntegration: true,
    canAccessRunnerScore: true,
    
    canAccessAdvancedInsights: canAccessCapability(subject, "advanced_insights"),
    canAccessInsightHistory: hasPremiumAccess,
    canAccessTrainingPlans: canAccessCapability(subject, "training_plans"),
    canAccessRacePredictions: canAccessCapability(subject, "race_predictions"),
    
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

    activity: {
      coachVerdict: 'full',
      nextSteps: 'full',
      routeMap: true,
      baselineComparison: true,

      performanceMetrics: canAccessCapability(subject, "activity_deep_dive"),
      timeline: canAccessCapability(subject, "activity_deep_dive") ? 'full' : 'locked',
      splits: canAccessCapability(subject, "activity_deep_dive") ? 'full' : 'locked',
      hrCadencePower: canAccessCapability(subject, "activity_deep_dive"),

      askCoach: hasPremiumAccess,
      activityComparison: canAccessCapability(subject, "activity_comparison"),
      goalPlanActions: hasPremiumAccess,
    }
  };
}
