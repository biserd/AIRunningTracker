export const PRODUCT_NAME = "RunAnalytics";
export const PREMIUM_PLAN_NAME = "Premium";

export const FREE_ACTIVITY_LIMIT = 20;
export const FREE_ACTIVITY_HISTORY_DAYS = 30;
export const FREE_MONTHLY_INSIGHTS = 3;

export type SubscriptionPlan = "free" | "pro" | "premium" | string | null | undefined;
export type SubscriptionStatus =
  | "free"
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "unpaid"
  | string
  | null
  | undefined;

export type EntitlementState = "free" | "premium_preview" | "trial" | "paid" | "expired";

export type Capability =
  | "basic_analytics"
  | "runner_score"
  | "activity_story"
  | "activity_deep_dive"
  | "race_predictions"
  | "injury_risk"
  | "training_plans"
  | "advanced_insights"
  | "ai_coach"
  | "activity_comparison"
  | "unlimited_history"
  | "unlimited_sync";

export interface EntitlementSubject {
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  premiumPreviewActive?: boolean;
}

const PREMIUM_CAPABILITIES = new Set<Capability>([
  "activity_deep_dive",
  "race_predictions",
  "injury_risk",
  "training_plans",
  "advanced_insights",
  "ai_coach",
  "activity_comparison",
  "unlimited_history",
  "unlimited_sync",
]);

export function getEntitlementState(subject: EntitlementSubject): EntitlementState {
  if (subject.premiumPreviewActive) return "premium_preview";

  const isPremiumPlan =
    subject.subscriptionPlan === "premium" || subject.subscriptionPlan === "pro";

  if (isPremiumPlan && subject.subscriptionStatus === "trialing") return "trial";
  if (isPremiumPlan && subject.subscriptionStatus === "active") return "paid";

  if (
    isPremiumPlan ||
    subject.subscriptionStatus === "canceled" ||
    subject.subscriptionStatus === "past_due" ||
    subject.subscriptionStatus === "unpaid"
  ) {
    return "expired";
  }

  return "free";
}

export function hasPremiumAccess(subject: EntitlementSubject): boolean {
  const state = getEntitlementState(subject);
  return state === "trial" || state === "paid";
}

export function canAccessCapability(
  subject: EntitlementSubject,
  capability: Capability,
): boolean {
  if (!PREMIUM_CAPABILITIES.has(capability)) return true;
  return hasPremiumAccess(subject);
}

export function getCapabilityMatrix(subject: EntitlementSubject) {
  const state = getEntitlementState(subject);
  return {
    state,
    capabilities: {
      basicAnalytics: canAccessCapability(subject, "basic_analytics"),
      runnerScore: canAccessCapability(subject, "runner_score"),
      activityStory: canAccessCapability(subject, "activity_story"),
      activityDeepDive: canAccessCapability(subject, "activity_deep_dive"),
      racePredictions: canAccessCapability(subject, "race_predictions"),
      injuryRisk: canAccessCapability(subject, "injury_risk"),
      trainingPlans: canAccessCapability(subject, "training_plans"),
      advancedInsights: canAccessCapability(subject, "advanced_insights"),
      aiCoach: canAccessCapability(subject, "ai_coach"),
      activityComparison: canAccessCapability(subject, "activity_comparison"),
      unlimitedHistory: canAccessCapability(subject, "unlimited_history"),
      unlimitedSync: canAccessCapability(subject, "unlimited_sync"),
    },
    limits: {
      activities: hasPremiumAccess(subject) ? null : FREE_ACTIVITY_LIMIT,
      historyDays: hasPremiumAccess(subject) ? null : FREE_ACTIVITY_HISTORY_DAYS,
      monthlyInsights: hasPremiumAccess(subject) ? null : FREE_MONTHLY_INSIGHTS,
    },
  };
}