import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export const RATE_LIMITS = {
  FREE_MONTHLY_INSIGHTS: 3,
  FREE_ACTIVITY_HISTORY_DAYS: 30,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: Date;
  message?: string;
}

export async function checkInsightRateLimit(userId: number): Promise<RateLimitResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) {
    return { allowed: false, remaining: 0, limit: 0, message: "User not found" };
  }

  const isProOrPremium = 
    (user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium') &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing');

  if (isProOrPremium) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetAt = user.insightCountResetAt;

  let monthlyCount = user.monthlyInsightCount || 0;

  if (!resetAt || resetAt < currentMonth) {
    monthlyCount = 0;
    await db.update(users)
      .set({ 
        monthlyInsightCount: 0, 
        insightCountResetAt: currentMonth 
      })
      .where(eq(users.id, userId));
  }

  const remaining = Math.max(0, RATE_LIMITS.FREE_MONTHLY_INSIGHTS - monthlyCount);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (monthlyCount >= RATE_LIMITS.FREE_MONTHLY_INSIGHTS) {
    return {
      allowed: false,
      remaining: 0,
      limit: RATE_LIMITS.FREE_MONTHLY_INSIGHTS,
      resetAt: nextMonth,
      message: `You've reached your monthly limit of ${RATE_LIMITS.FREE_MONTHLY_INSIGHTS} AI insights. Upgrade to Pro for unlimited insights.`
    };
  }

  return {
    allowed: true,
    remaining: remaining,
    limit: RATE_LIMITS.FREE_MONTHLY_INSIGHTS,
    resetAt: nextMonth
  };
}

export async function incrementInsightCount(userId: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) return;

  const isProOrPremium = 
    (user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium') &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing');

  if (isProOrPremium) return;

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetAt = user.insightCountResetAt;

  let newCount = (user.monthlyInsightCount || 0) + 1;

  if (!resetAt || resetAt < currentMonth) {
    newCount = 1;
  }

  await db.update(users)
    .set({ 
      monthlyInsightCount: newCount, 
      insightCountResetAt: currentMonth 
    })
    .where(eq(users.id, userId));
}

export function getActivityHistoryLimit(subscriptionPlan: string | null, subscriptionStatus: string | null): number | null {
  const isProOrPremium = 
    (subscriptionPlan === 'pro' || subscriptionPlan === 'premium') &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');

  if (isProOrPremium) {
    return null;
  }

  return RATE_LIMITS.FREE_ACTIVITY_HISTORY_DAYS;
}

export async function getUserUsageStats(userId: number): Promise<{
  insightsUsed: number;
  insightsLimit: number;
  insightsRemaining: number;
  resetAt: Date | null;
  isPremiumUser: boolean;
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) {
    return {
      insightsUsed: 0,
      insightsLimit: RATE_LIMITS.FREE_MONTHLY_INSIGHTS,
      insightsRemaining: RATE_LIMITS.FREE_MONTHLY_INSIGHTS,
      resetAt: null,
      isPremiumUser: false
    };
  }

  const isProOrPremium = 
    (user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium') &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing');

  if (isProOrPremium) {
    return {
      insightsUsed: 0,
      insightsLimit: Infinity,
      insightsRemaining: Infinity,
      resetAt: null,
      isPremiumUser: true
    };
  }

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetAt = user.insightCountResetAt;

  let monthlyCount = user.monthlyInsightCount || 0;

  if (!resetAt || resetAt < currentMonth) {
    monthlyCount = 0;
  }

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    insightsUsed: monthlyCount,
    insightsLimit: RATE_LIMITS.FREE_MONTHLY_INSIGHTS,
    insightsRemaining: Math.max(0, RATE_LIMITS.FREE_MONTHLY_INSIGHTS - monthlyCount),
    resetAt: nextMonth,
    isPremiumUser: false
  };
}
