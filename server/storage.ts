import { users, activities, aiInsights, trainingPlans, trainingPlansLegacy, athleteProfiles, planWeeks, planDays, feedback, goals, performanceLogs, aiConversations, aiMessages, runningShoes, shoeComparisons, apiKeys, refreshTokens, workoutCache, coachRecaps, agentRuns, notificationOutbox, deletionFeedback, userCampaigns, emailJobs, emailClicks, systemSettings, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type TrainingPlan, type InsertTrainingPlan, type Feedback, type InsertFeedback, type Goal, type InsertGoal, type PerformanceLog, type InsertPerformanceLog, type AIConversation, type InsertAIConversation, type AIMessage, type InsertAIMessage, type RunningShoe, type InsertRunningShoe, type ShoeComparison, type InsertShoeComparison, type ApiKey, type InsertApiKey, type RefreshToken, type InsertRefreshToken, type AthleteProfile, type InsertAthleteProfile, type PlanWeek, type InsertPlanWeek, type PlanDay, type InsertPlanDay, type WorkoutCache, type InsertWorkoutCache, type CoachRecap, type InsertCoachRecap, type AgentRun, type InsertAgentRun, type NotificationOutbox, type InsertNotificationOutbox, type DeletionFeedback, type InsertDeletionFeedback, type UserCampaign, type InsertUserCampaign, type EmailJob, type InsertEmailJob, type EmailClick, type InsertEmailClick } from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gte, gt, lt, ne } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Password reset methods
  updateUserResetToken(userId: number, resetToken: string, resetTokenExpiry: Date): Promise<void>;
  getUserByResetToken(resetToken: string): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  // Strava lookup methods
  getUserByStravaId(stravaAthleteId: string): Promise<User | undefined>;
  
  // Stripe subscription methods
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined>;
  updateStripeSubscriptionId(userId: number, stripeSubscriptionId: string): Promise<User | undefined>;
  updateSubscriptionStatus(userId: number, status: string, plan?: string): Promise<User | undefined>;
  
  createActivity(activity: InsertActivity): Promise<Activity>;
  getMostRecentActivityByUserId(userId: number): Promise<Activity | undefined>;
  getActivitiesNeedingHydration(userId: number, limit?: number): Promise<Activity[]>;
  getActivitiesByUserId(userId: number, limit?: number, startDate?: Date): Promise<Activity[]>;
  getActivitiesByUserIdPaginated(userId: number, options: {
    page: number;
    pageSize: number;
    minDistance?: number;
    maxDistance?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    activities: Activity[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  getActivityById(activityId: number): Promise<Activity | undefined>;
  getActivityStreams(activityId: number): Promise<any | null>;
  getActivityByStravaId(stravaId: string): Promise<Activity | undefined>;
  getActivityByStravaIdAndUser(stravaId: string, userId: number): Promise<Activity | undefined>;
  getUserStravaIds(userId: number): Promise<string[]>;
  updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  updateActivityGrade(activityId: number, grade: "A" | "B" | "C" | "D" | "F"): Promise<void>;
  
  createAIInsight(insight: InsertAIInsight): Promise<AIInsight>;
  getAIInsightsByUserId(userId: number, type?: string, limit?: number): Promise<AIInsight[]>;
  deleteOldAIInsights(userId: number, type: string): Promise<void>;
  cleanupOldAIInsights(userId: number, type: string, keepCount?: number): Promise<void>;
  getHistoricalAIInsights(userId: number, limit?: number): Promise<AIInsight[]>;
  
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getLatestTrainingPlan(userId: number): Promise<TrainingPlan | undefined>;
  deleteTrainingPlans(userId: number): Promise<void>;
  deleteTrainingPlanById(planId: number): Promise<void>;
  
  // New Training Plan System (v2)
  // Athlete Profile methods
  getAthleteProfile(userId: number, sport?: string): Promise<AthleteProfile | undefined>;
  upsertAthleteProfile(profile: InsertAthleteProfile & { userId: number }): Promise<AthleteProfile>;
  
  // Training Plan v2 methods
  createTrainingPlanV2(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getTrainingPlanById(planId: number): Promise<TrainingPlan | undefined>;
  getActiveTrainingPlan(userId: number): Promise<TrainingPlan | undefined>;
  getTrainingPlansByUserId(userId: number): Promise<TrainingPlan[]>;
  updateTrainingPlan(planId: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan | undefined>;
  archiveTrainingPlan(planId: number): Promise<void>;
  
  // Plan Week methods
  createPlanWeek(week: InsertPlanWeek): Promise<PlanWeek>;
  createPlanWeeks(weeks: InsertPlanWeek[]): Promise<PlanWeek[]>;
  getPlanWeeks(planId: number): Promise<PlanWeek[]>;
  getPlanWeekById(weekId: number): Promise<PlanWeek | undefined>;
  updatePlanWeek(weekId: number, updates: Partial<PlanWeek>): Promise<PlanWeek | undefined>;
  getCurrentPlanWeek(planId: number): Promise<PlanWeek | undefined>;
  
  // Plan Day methods
  createPlanDay(day: InsertPlanDay): Promise<PlanDay>;
  createPlanDays(days: InsertPlanDay[]): Promise<PlanDay[]>;
  getPlanDays(weekId: number): Promise<PlanDay[]>;
  getPlanDaysByPlanId(planId: number): Promise<PlanDay[]>;
  getPlanDayById(dayId: number): Promise<PlanDay | undefined>;
  getPlanDayByDate(planId: number, date: Date): Promise<PlanDay | undefined>;
  updatePlanDay(dayId: number, updates: Partial<PlanDay>): Promise<PlanDay | undefined>;
  linkActivityToPlanDay(dayId: number, activityId: number, actualMetrics: { distanceKm?: number; durationMins?: number; pace?: string }): Promise<PlanDay | undefined>;
  getUpcomingWorkouts(userId: number, limit?: number): Promise<PlanDay[]>;
  
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  
  // Goal methods
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoalsByUserId(userId: number, status?: string): Promise<Goal[]>;
  getGoalById(goalId: number): Promise<Goal | undefined>;
  updateGoalProgress(goalId: number, progress: number): Promise<Goal | undefined>;
  completeGoal(goalId: number): Promise<Goal | undefined>;
  deleteGoal(goalId: number): Promise<void>;
  
  // Performance log methods
  createPerformanceLog(log: InsertPerformanceLog): Promise<PerformanceLog>;
  getPerformanceLogs(options: {
    limit?: number;
    userId?: number;
    endpoint?: string;
    method?: string;
    minStatusCode?: number;
    maxStatusCode?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PerformanceLog[]>;
  
  // AI Chat methods
  createConversation(conversation: InsertAIConversation): Promise<AIConversation>;
  getConversation(conversationId: number): Promise<AIConversation | undefined>;
  getConversationsByUserId(userId: number, limit?: number): Promise<AIConversation[]>;
  getConversationSummaries(userId: number, limit?: number): Promise<Array<{
    id: number;
    title: string | null;
    messageCount: number;
    firstMessage: string | null;
    lastMessageAt: Date;
    createdAt: Date;
  }>>;
  updateConversationTimestamp(conversationId: number): Promise<void>;
  updateConversationTitle(conversationId: number, title: string): Promise<AIConversation | undefined>;
  deleteConversation(conversationId: number): Promise<void>;
  addMessage(message: InsertAIMessage): Promise<AIMessage>;
  getMessagesByConversationId(conversationId: number, limit?: number): Promise<AIMessage[]>;
  updateMessageFeedback(messageId: number, feedback: "positive" | "negative" | null): Promise<AIMessage | undefined>;
  verifyMessageOwnership(messageId: number, userId: number): Promise<boolean>;
  
  // User account management
  deleteAccount(userId: number): Promise<void>;
  createDeletionFeedback(feedback: InsertDeletionFeedback): Promise<DeletionFeedback>;
  getDeletionFeedback(limit?: number): Promise<DeletionFeedback[]>;
  
  // Drip campaign methods
  getUserCampaign(userId: number, campaign: string): Promise<UserCampaign | undefined>;
  getActiveCampaigns(userId: number): Promise<UserCampaign[]>;
  createUserCampaign(campaign: InsertUserCampaign): Promise<UserCampaign>;
  updateUserCampaign(id: number, updates: Partial<UserCampaign>): Promise<UserCampaign | undefined>;
  exitUserCampaign(id: number, exitReason: string): Promise<void>;
  
  createEmailJob(job: InsertEmailJob): Promise<EmailJob>;
  getPendingEmailJobs(limit?: number): Promise<EmailJob[]>;
  getEmailJobByDedupeKey(dedupeKey: string): Promise<EmailJob | undefined>;
  updateEmailJob(id: number, updates: Partial<EmailJob>): Promise<EmailJob | undefined>;
  cancelEmailJobsForUser(userId: number): Promise<void>;
  
  createEmailClick(click: InsertEmailClick): Promise<EmailClick>;
  getEmailClicksByUser(userId: number, limit?: number): Promise<EmailClick[]>;
  getCampaignAnalytics(): Promise<{
    totalSent: number;
    totalClicked: number;
    byCampaign: Array<{ campaign: string; sent: number; clicked: number }>;
    byStep: Array<{ step: string; sent: number; clicked: number }>;
  }>;
  getSegmentStatsFromCampaigns(): Promise<{
    segment_a: number;
    segment_b: number;
    segment_c: number;
    segment_d: number;
  }>;
  getUserCountsBySubscription(): Promise<{
    total: number;
    paid: number;
    free: number;
  }>;
  
  // User activation tracking
  updateUserActivation(userId: number, activationAt: Date): Promise<void>;
  updateUserLastSeen(userId: number): Promise<void>;
  getInactiveUsers(daysSinceLastSeen: number): Promise<User[]>;
  getUsersNeedingCampaign(segment: string): Promise<User[]>;
  
  // Welcome campaign methods
  getWelcomeCampaignStats(): Promise<{
    total: number;
    sent: number;
    pending: number;
  }>;
  getUsersWithoutWelcomeEmail(): Promise<User[]>;
  
  // System settings methods
  getSystemSetting(key: string): Promise<string | undefined>;
  setSystemSetting(key: string, value: string): Promise<void>;
  
  // Admin methods
  getAdminStats(): Promise<{
    totalUsers: number;
    connectedUsers: number;
    totalActivities: number;
    recentUsers: User[];
    recentActivities: Activity[];
  }>;
  getAllUsers(limit?: number): Promise<User[]>;
  getUserAnalytics(): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgActivitiesPerUser: number;
    avgDistancePerActivity: number;
    avgTimePerActivity: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    syncSuccessRate: number;
    topActivityTypes: Array<{ type: string; count: number }>;
    userGrowthTrend: Array<{ date: string; count: number }>;
    activityTrend: Array<{ date: string; count: number }>;
  }>;
  getSystemPerformance(): Promise<{
    apiMetrics: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      requestsPerHour: number;
    };
    databaseMetrics: {
      connectionStatus: 'healthy' | 'warning' | 'error';
      avgQueryTime: number;
      slowQueries: number;
      totalQueries: number;
    };
    systemHealth: {
      uptime: number;
      memoryUsage: number;
      diskUsage: number;
      status: 'operational' | 'degraded' | 'down';
    };
    recentErrors: Array<{
      timestamp: string;
      statusCode: number;
      endpoint: string;
      method: string;
      userId?: number | null;
      errorMessage?: string | null;
      errorDetails?: string | null;
      elapsedTime?: number | null;
      requestBody?: string | null;
      responseBody?: string | null;
    }>;
    performanceTrend: Array<{
      timestamp: string;
      responseTime: number;
      requestCount: number;
      errorCount: number;
    }>;
    slowRequests: Array<{
      timestamp: string;
      endpoint: string;
      method: string;
      userId?: number | null;
      elapsedTime: number;
      statusCode: number;
      requestBody?: string | null;
      responseBody?: string | null;
    }>;
  }>;
  
  getAgentRunStats(): Promise<{
    totalRuns: number;
    byStatus: { status: string; count: number }[];
    byType: { runType: string; count: number }[];
    recentRuns: AgentRun[];
    last24Hours: number;
    successRate: number;
  }>;

  // Platform stats for landing page
  getPlatformStats(): Promise<{
    totalInsights: number;
    totalActivities: number;
    totalDistance: number;
    totalUsers: number;
  }>;
  
  // Reverse trial methods
  getUsersWithTrialEndingSoon(daysRemaining: number): Promise<User[]>;
  getUsersWithExpiredTrials(): Promise<User[]>;
  
  // Running Shoe methods
  getShoes(filters: {
    brand?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    hasCarbonPlate?: boolean;
    stability?: string;
  }): Promise<RunningShoe[]>;
  getShoeById(shoeId: number): Promise<RunningShoe | undefined>;
  getShoeBySlug(slug: string): Promise<RunningShoe | undefined>;
  getShoesBySeries(brand: string, seriesName: string): Promise<RunningShoe[]>;
  createShoe(shoe: InsertRunningShoe): Promise<RunningShoe>;
  clearAllShoes(): Promise<void>;
  
  // Shoe Comparison methods
  getShoeComparisons(filters?: { type?: string; limit?: number }): Promise<ShoeComparison[]>;
  getShoeComparisonBySlug(slug: string): Promise<ShoeComparison | undefined>;
  getShoeComparisonsByShoeId(shoeId: number): Promise<ShoeComparison[]>;
  createShoeComparison(comparison: InsertShoeComparison): Promise<ShoeComparison>;
  incrementComparisonViewCount(comparisonId: number): Promise<void>;
  clearAllShoeComparisons(): Promise<void>;
  
  // API Key methods
  createApiKey(userId: number, name: string, scopes: string[]): Promise<{ apiKey: ApiKey; rawKey: string }>;
  getApiKeysByUserId(userId: number): Promise<ApiKey[]>;
  deleteApiKey(keyId: number, userId: number): Promise<void>;
  validateApiKey(rawKey: string): Promise<{ valid: boolean; userId?: number; scopes?: string[]; keyId?: number }>;
  updateApiKeyLastUsed(keyId: number): Promise<void>;
  
  // Mobile auth / Refresh token methods
  createRefreshToken(userId: number, deviceName?: string, deviceId?: string): Promise<{ tokenId: number; rawToken: string; expiresAt: Date }>;
  validateRefreshToken(rawToken: string): Promise<{ valid: boolean; userId?: number; tokenId?: number }>;
  revokeRefreshToken(tokenId: number): Promise<void>;
  revokeAllUserRefreshTokens(userId: number): Promise<void>;
  updateRefreshTokenLastUsed(tokenId: number): Promise<void>;
  getActiveRefreshTokens(userId: number): Promise<Array<{ id: number; deviceName: string | null; deviceId: string | null; lastUsedAt: Date | null; createdAt: Date | null }>>;
  
  // Sync state methods
  getSyncState(userId: number): Promise<{
    syncStatus: "idle" | "running" | "error";
    syncProgress: number;
    syncTotal: number;
    syncError: string | null;
    lastSyncAt: Date | null;
    lastIncrementalSince: Date | null;
  } | undefined>;
  updateSyncState(userId: number, state: {
    syncStatus?: "idle" | "running" | "error";
    syncProgress?: number;
    syncTotal?: number;
    syncError?: string | null;
    lastSyncAt?: Date;
    lastIncrementalSince?: Date;
  }): Promise<void>;
  startSync(userId: number, total?: number): Promise<void>;
  updateSyncProgress(userId: number, progress: number, total?: number): Promise<void>;
  completeSyncSuccess(userId: number, incrementalSince?: Date): Promise<void>;
  completeSyncError(userId: number, error: string): Promise<void>;
  
  // Workout cache methods
  getWorkoutByFingerprint(fingerprint: string): Promise<WorkoutCache | undefined>;
  cacheWorkout(workout: InsertWorkoutCache): Promise<WorkoutCache>;
  incrementWorkoutCacheHit(fingerprint: string): Promise<void>;
  
  // Batch update methods for progressive persistence
  updatePlanDaysByWeek(weekId: number, updates: Array<{ dayOfWeek: string; updates: Partial<PlanDay> }>): Promise<void>;
  
  // AI Coach Agent methods
  // Coach recaps
  createCoachRecap(recap: InsertCoachRecap): Promise<CoachRecap>;
  getCoachRecapByActivityId(activityId: number): Promise<CoachRecap | undefined>;
  getCoachRecapsByUserId(userId: number, limit?: number): Promise<CoachRecap[]>;
  getLatestCoachRecap(userId: number): Promise<CoachRecap | undefined>;
  markCoachRecapViewed(recapId: number): Promise<void>;
  markCoachRecapNotificationSent(recapId: number): Promise<void>;
  getUnviewedCoachRecapsCount(userId: number): Promise<number>;
  
  // Agent runs
  createAgentRun(run: InsertAgentRun): Promise<AgentRun>;
  getAgentRunByDedupeKey(dedupeKey: string): Promise<AgentRun | undefined>;
  updateAgentRun(runId: number, updates: Partial<AgentRun>): Promise<AgentRun | undefined>;
  getAgentRunsByUserId(userId: number, limit?: number): Promise<AgentRun[]>;
  getPendingAgentRuns(limit?: number): Promise<AgentRun[]>;
  
  // Notification outbox
  createNotification(notification: InsertNotificationOutbox): Promise<NotificationOutbox>;
  getPendingNotifications(limit?: number): Promise<NotificationOutbox[]>;
  markNotificationSent(notificationId: number): Promise<void>;
  markNotificationFailed(notificationId: number, error: string): Promise<void>;
  markNotificationReadForUser(notificationId: number, userId: number): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<void>;
  getNotificationsByUserId(userId: number, limit?: number): Promise<NotificationOutbox[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  getNotificationByDedupeKey(dedupeKey: string): Promise<NotificationOutbox | undefined>;
  
  // Coach preferences (updates handled via updateUser, but helper for Premium users)
  getPremiumUsersForCoaching(): Promise<User[]>;
  getUsersNeedingCoachSync(sinceDays?: number): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserByStravaId(stravaAthleteId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stravaAthleteId, stravaAthleteId));
    return user || undefined;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateStripeSubscriptionId(userId: number, stripeSubscriptionId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ stripeSubscriptionId })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateSubscriptionStatus(userId: number, status: string, plan?: string): Promise<User | undefined> {
    const updates: Partial<User> = { subscriptionStatus: status as any };
    if (plan) {
      updates.subscriptionPlan = plan as any;
    }
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserResetToken(userId: number, resetToken: string, resetTokenExpiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken, resetTokenExpiry })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(resetToken: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, resetToken));
    return user || undefined;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, userId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getMostRecentActivityByUserId(userId: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.startDate))
      .limit(1);
    return activity;
  }

  async getActivitiesNeedingHydration(userId: number, limit = 500): Promise<Activity[]> {
    const results = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.userId, userId),
        sql`(
          (${activities.streamsData} IS NULL AND ${activities.lapsData} IS NULL) OR
          (${activities.streamsData} IS NULL AND ${activities.lapsData} NOT LIKE '%"status":"not_available"%') OR
          (${activities.lapsData} IS NULL AND ${activities.streamsData} NOT LIKE '%"status":"not_available"%')
        )`
      ))
      .orderBy(desc(activities.startDate))
      .limit(limit);
    return results;
  }

  async getActivitiesByUserId(userId: number, limit = 50, startDate?: Date): Promise<Activity[]> {
    // Build WHERE conditions
    const conditions = [eq(activities.userId, userId)];
    
    // Add date filter if provided (OPTIMIZATION: filters at database level)
    if (startDate) {
      conditions.push(gte(activities.startDate, startDate));
    }
    
    const userActivities = await db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startDate))
      .limit(limit);
    return userActivities;
  }

  async getActivitiesByUserIdPaginated(userId: number, options: {
    page: number;
    pageSize: number;
    minDistance?: number;
    maxDistance?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    activities: Activity[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page, pageSize, minDistance, maxDistance, startDate, endDate } = options;
    
    // Build where conditions
    const conditions = [eq(activities.userId, userId)];
    
    if (minDistance !== undefined) {
      conditions.push(gte(activities.distance, minDistance));
    }
    if (maxDistance !== undefined) {
      conditions.push(sql`${activities.distance} <= ${maxDistance}`);
    }
    if (startDate) {
      conditions.push(sql`${activities.startDate} >= ${startDate}`);
    }
    if (endDate) {
      // Add one day to endDate to include activities on that day
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(sql`${activities.startDate} < ${endDateTime.toISOString()}`);
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(and(...conditions));
    
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated activities
    const offset = (page - 1) * pageSize;
    const userActivities = await db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startDate))
      .limit(pageSize)
      .offset(offset);

    return {
      activities: userActivities,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getActivityById(activityId: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId));
    return activity || undefined;
  }

  async getActivityStreams(activityId: number): Promise<any | null> {
    const [activity] = await db
      .select({ streamsData: activities.streamsData })
      .from(activities)
      .where(eq(activities.id, activityId));
    
    if (!activity?.streamsData) return null;
    
    try {
      return typeof activity.streamsData === 'string' 
        ? JSON.parse(activity.streamsData)
        : activity.streamsData;
    } catch {
      return null;
    }
  }

  async getActivityByStravaId(stravaId: string): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.stravaId, stravaId));
    return activity || undefined;
  }

  async getActivityByStravaIdAndUser(stravaId: string, userId: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.stravaId, stravaId), eq(activities.userId, userId)));
    return activity || undefined;
  }

  async getUserStravaIds(userId: number): Promise<string[]> {
    const userActivities = await db
      .select({ stravaId: activities.stravaId })
      .from(activities)
      .where(eq(activities.userId, userId));
    return userActivities.map(a => a.stravaId);
  }

  async getActivitiesWithPolylines(userId: number, limit: number = 30): Promise<Activity[]> {
    const userActivities = await db
      .select({
        id: activities.id,
        name: activities.name,
        distance: activities.distance,
        startDate: activities.startDate,
        polyline: activities.polyline,
        detailedPolyline: activities.detailedPolyline,
      })
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.startDate))
      .limit(limit);
    
    return userActivities as Activity[];
  }

  async createAIInsight(insertInsight: InsertAIInsight): Promise<AIInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  async getAIInsightsByUserId(userId: number, type?: string, limit: number = 50): Promise<AIInsight[]> {
    const conditions = [eq(aiInsights.userId, userId)];
    if (type) {
      conditions.push(eq(aiInsights.type, type));
    }

    const userInsights = await db
      .select()
      .from(aiInsights)
      .where(and(...conditions))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
    return userInsights;
  }

  async deleteOldAIInsights(userId: number, type: string): Promise<void> {
    await db
      .delete(aiInsights)
      .where(and(
        eq(aiInsights.userId, userId),
        eq(aiInsights.type, type)
      ));
  }

  // Keep only the most recent N insights per type for timeline history
  async cleanupOldAIInsights(userId: number, type: string, keepCount: number = 10): Promise<void> {
    // Get all insights of this type for this user, ordered by creation date
    const insights = await db
      .select()
      .from(aiInsights)
      .where(and(
        eq(aiInsights.userId, userId),
        eq(aiInsights.type, type)
      ))
      .orderBy(desc(aiInsights.createdAt));

    // If we have more than keepCount, delete the oldest ones
    if (insights.length > keepCount) {
      const idsToDelete = insights.slice(keepCount).map(insight => insight.id);
      if (idsToDelete.length > 0) {
        await db
          .delete(aiInsights)
          .where(and(
            eq(aiInsights.userId, userId),
            eq(aiInsights.type, type),
            inArray(aiInsights.id, idsToDelete)
          ));
      }
    }
  }

  // Get historical insights for timeline view
  async getHistoricalAIInsights(userId: number, limit: number = 50): Promise<AIInsight[]> {
    const insights = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
    return insights;
  }

  async createTrainingPlan(insertPlan: InsertTrainingPlan): Promise<TrainingPlan> {
    const [plan] = await db
      .insert(trainingPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async getLatestTrainingPlan(userId: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1);
    return plan || undefined;
  }

  async deleteTrainingPlans(userId: number): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.userId, userId));
  }

  async deleteTrainingPlanById(planId: number): Promise<void> {
    // Delete days first
    const weeks = await this.getPlanWeeks(planId);
    for (const week of weeks) {
      await db.delete(planDays).where(eq(planDays.weekId, week.id));
    }
    // Delete weeks
    await db.delete(planWeeks).where(eq(planWeeks.planId, planId));
    // Delete plan
    await db.delete(trainingPlans).where(eq(trainingPlans.id, planId));
  }

  // ============== New Training Plan System (v2) ==============

  // Athlete Profile methods
  async getAthleteProfile(userId: number, sport: string = "run"): Promise<AthleteProfile | undefined> {
    const [profile] = await db
      .select()
      .from(athleteProfiles)
      .where(and(
        eq(athleteProfiles.userId, userId),
        eq(athleteProfiles.sport, sport as any)
      ));
    return profile || undefined;
  }

  async upsertAthleteProfile(profile: InsertAthleteProfile & { userId: number }): Promise<AthleteProfile> {
    // Check if profile exists
    const existing = await this.getAthleteProfile(profile.userId, profile.sport || "run");
    
    // Prepare the data - cast JSON fields properly
    const profileData = {
      ...profile,
      lastComputedAt: new Date(),
    } as any;
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(athleteProfiles)
        .set(profileData)
        .where(eq(athleteProfiles.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(athleteProfiles)
        .values(profileData)
        .returning();
      return created;
    }
  }

  // Training Plan v2 methods
  async createTrainingPlanV2(plan: InsertTrainingPlan): Promise<TrainingPlan> {
    const [created] = await db
      .insert(trainingPlans)
      .values(plan)
      .returning();
    return created;
  }

  async getTrainingPlanById(planId: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, planId));
    return plan || undefined;
  }

  async getActiveTrainingPlan(userId: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(and(
        eq(trainingPlans.userId, userId),
        eq(trainingPlans.status, "active")
      ))
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1);
    return plan || undefined;
  }

  async getTrainingPlansByUserId(userId: number): Promise<TrainingPlan[]> {
    return await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt));
  }

  async updateTrainingPlan(planId: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan | undefined> {
    const [updated] = await db
      .update(trainingPlans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trainingPlans.id, planId))
      .returning();
    return updated || undefined;
  }

  async archiveTrainingPlan(planId: number): Promise<void> {
    await db
      .update(trainingPlans)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(trainingPlans.id, planId));
  }

  // Plan Week methods
  async createPlanWeek(week: InsertPlanWeek): Promise<PlanWeek> {
    const [created] = await db
      .insert(planWeeks)
      .values(week)
      .returning();
    return created;
  }

  async createPlanWeeks(weeks: InsertPlanWeek[]): Promise<PlanWeek[]> {
    if (weeks.length === 0) return [];
    return await db
      .insert(planWeeks)
      .values(weeks)
      .returning();
  }

  async getPlanWeeks(planId: number): Promise<PlanWeek[]> {
    return await db
      .select()
      .from(planWeeks)
      .where(eq(planWeeks.planId, planId))
      .orderBy(planWeeks.weekNumber);
  }

  async getPlanWeekById(weekId: number): Promise<PlanWeek | undefined> {
    const [week] = await db
      .select()
      .from(planWeeks)
      .where(eq(planWeeks.id, weekId));
    return week || undefined;
  }

  async updatePlanWeek(weekId: number, updates: Partial<PlanWeek>): Promise<PlanWeek | undefined> {
    const [updated] = await db
      .update(planWeeks)
      .set(updates)
      .where(eq(planWeeks.id, weekId))
      .returning();
    return updated || undefined;
  }

  async getCurrentPlanWeek(planId: number): Promise<PlanWeek | undefined> {
    const now = new Date();
    const [week] = await db
      .select()
      .from(planWeeks)
      .where(and(
        eq(planWeeks.planId, planId),
        lt(planWeeks.weekStartDate, now),
        gte(planWeeks.weekEndDate, now)
      ));
    return week || undefined;
  }

  // Plan Day methods
  async createPlanDay(day: InsertPlanDay): Promise<PlanDay> {
    const [created] = await db
      .insert(planDays)
      .values(day as any)
      .returning();
    return created;
  }

  async createPlanDays(days: InsertPlanDay[]): Promise<PlanDay[]> {
    if (days.length === 0) return [];
    return await db
      .insert(planDays)
      .values(days as any)
      .returning();
  }

  async getPlanDays(weekId: number): Promise<PlanDay[]> {
    return await db
      .select()
      .from(planDays)
      .where(eq(planDays.weekId, weekId))
      .orderBy(planDays.date);
  }

  async getPlanDaysByPlanId(planId: number): Promise<PlanDay[]> {
    return await db
      .select()
      .from(planDays)
      .where(eq(planDays.planId, planId))
      .orderBy(planDays.date);
  }

  async getPlanDayById(dayId: number): Promise<PlanDay | undefined> {
    const [day] = await db
      .select()
      .from(planDays)
      .where(eq(planDays.id, dayId));
    return day || undefined;
  }

  async getPlanDayByDate(planId: number, date: Date): Promise<PlanDay | undefined> {
    // Match by date (ignoring time)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [day] = await db
      .select()
      .from(planDays)
      .where(and(
        eq(planDays.planId, planId),
        gte(planDays.date, startOfDay),
        lt(planDays.date, endOfDay)
      ));
    return day || undefined;
  }

  async updatePlanDay(dayId: number, updates: Partial<PlanDay>): Promise<PlanDay | undefined> {
    const [updated] = await db
      .update(planDays)
      .set(updates)
      .where(eq(planDays.id, dayId))
      .returning();
    return updated || undefined;
  }

  async linkActivityToPlanDay(
    dayId: number, 
    activityId: number, 
    actualMetrics: { distanceKm?: number; durationMins?: number; pace?: string }
  ): Promise<PlanDay | undefined> {
    const [updated] = await db
      .update(planDays)
      .set({
        linkedActivityId: activityId,
        status: "completed",
        actualDistanceKm: actualMetrics.distanceKm,
        actualDurationMins: actualMetrics.durationMins,
        actualPace: actualMetrics.pace,
      })
      .where(eq(planDays.id, dayId))
      .returning();
    return updated || undefined;
  }

  async getUpcomingWorkouts(userId: number, limit: number = 7): Promise<PlanDay[]> {
    const now = new Date();
    
    // First get the active plan for this user
    const activePlan = await this.getActiveTrainingPlan(userId);
    if (!activePlan) return [];
    
    return await db
      .select()
      .from(planDays)
      .where(and(
        eq(planDays.planId, activePlan.id),
        gte(planDays.date, now),
        eq(planDays.status, "pending")
      ))
      .orderBy(planDays.date)
      .limit(limit);
  }

  async updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    const [activity] = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, activityId))
      .returning();
    return activity || undefined;
  }

  async updateActivityGrade(activityId: number, grade: "A" | "B" | "C" | "D" | "F"): Promise<void> {
    await db
      .update(activities)
      .set({ cachedGrade: grade, cachedGradeUpdatedAt: new Date() })
      .where(eq(activities.id, activityId));
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedbackRecord] = await db
      .insert(feedback)
      .values(insertFeedback)
      .returning();
    return feedbackRecord;
  }

  // Goal methods
  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values(insertGoal)
      .returning();
    return goal;
  }

  async getGoalsByUserId(userId: number, status?: string): Promise<Goal[]> {
    if (status) {
      return await db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.status, status as any)))
        .orderBy(desc(goals.createdAt));
    }
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async getGoalById(goalId: number): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, goalId));
    return goal || undefined;
  }

  async updateGoalProgress(goalId: number, progress: number): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set({ currentProgress: progress })
      .where(eq(goals.id, goalId))
      .returning();
    return goal || undefined;
  }

  async completeGoal(goalId: number): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(goals.id, goalId))
      .returning();
    return goal || undefined;
  }

  async deleteGoal(goalId: number): Promise<void> {
    await db.delete(goals).where(eq(goals.id, goalId));
  }

  // Performance log methods
  async createPerformanceLog(log: InsertPerformanceLog): Promise<PerformanceLog> {
    const [performanceLog] = await db
      .insert(performanceLogs)
      .values(log)
      .returning();
    return performanceLog;
  }

  async getPerformanceLogs(options: {
    limit?: number;
    userId?: number;
    endpoint?: string;
    method?: string;
    minStatusCode?: number;
    maxStatusCode?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PerformanceLog[]> {
    const {
      limit = 100,
      userId,
      endpoint,
      method,
      minStatusCode,
      maxStatusCode,
      startDate,
      endDate,
    } = options;
    
    // Build WHERE conditions dynamically
    const conditions = [];
    
    if (userId !== undefined) {
      conditions.push(eq(performanceLogs.userId, userId));
    }
    if (endpoint) {
      conditions.push(eq(performanceLogs.endpoint, endpoint));
    }
    if (method) {
      conditions.push(eq(performanceLogs.method, method));
    }
    if (minStatusCode !== undefined) {
      conditions.push(gte(performanceLogs.statusCode, minStatusCode));
    }
    if (maxStatusCode !== undefined) {
      conditions.push(lt(performanceLogs.statusCode, maxStatusCode));
    }
    if (startDate) {
      conditions.push(gte(performanceLogs.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lt(performanceLogs.timestamp, endDate));
    }

    const query = db
      .select()
      .from(performanceLogs)
      .orderBy(desc(performanceLogs.timestamp))
      .limit(limit);

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  // AI Chat methods
  async createConversation(conversation: InsertAIConversation): Promise<AIConversation> {
    const [newConversation] = await db
      .insert(aiConversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversation(conversationId: number): Promise<AIConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId));
    return conversation || undefined;
  }

  async getConversationsByUserId(userId: number, limit = 20): Promise<AIConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit);
  }

  async getConversationSummaries(userId: number, limit = 20): Promise<Array<{
    id: number;
    title: string | null;
    messageCount: number;
    firstMessage: string | null;
    lastMessageAt: Date;
    createdAt: Date;
  }>> {
    const conversations = await this.getConversationsByUserId(userId, limit);
    
    const summaries = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await db
          .select()
          .from(aiMessages)
          .where(eq(aiMessages.conversationId, conv.id))
          .orderBy(aiMessages.createdAt);

        const messageCount = messages.length;
        const firstUserMessage = messages.find(m => m.role === 'user');
        const lastMessage = messages[messages.length - 1];

        return {
          id: conv.id,
          title: conv.title,
          messageCount,
          firstMessage: firstUserMessage?.content || null,
          lastMessageAt: lastMessage?.createdAt || conv.createdAt || new Date(),
          createdAt: conv.createdAt || new Date()
        };
      })
    );

    return summaries;
  }

  async updateConversationTimestamp(conversationId: number): Promise<void> {
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));
  }

  async updateConversationTitle(conversationId: number, title: string): Promise<AIConversation | undefined> {
    const [updated] = await db
      .update(aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async deleteConversation(conversationId: number): Promise<void> {
    // Delete messages first (foreign key constraint)
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    // Then delete conversation
    await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
  }

  async addMessage(message: InsertAIMessage): Promise<AIMessage> {
    const [newMessage] = await db
      .insert(aiMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessagesByConversationId(conversationId: number, limit = 50): Promise<AIMessage[]> {
    return await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt)
      .limit(limit);
  }

  async updateMessageFeedback(messageId: number, feedback: "positive" | "negative" | null): Promise<AIMessage | undefined> {
    const [updated] = await db
      .update(aiMessages)
      .set({ feedback })
      .where(eq(aiMessages.id, messageId))
      .returning();
    return updated || undefined;
  }

  async verifyMessageOwnership(messageId: number, userId: number): Promise<boolean> {
    // Join message -> conversation -> check userId
    const result = await db
      .select({ conversationUserId: aiConversations.userId })
      .from(aiMessages)
      .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
      .where(eq(aiMessages.id, messageId))
      .limit(1);
    
    return result.length > 0 && result[0].conversationUserId === userId;
  }

  // Admin methods
  async getAdminStats(): Promise<{
    totalUsers: number;
    connectedUsers: number;
    totalActivities: number;
    recentUsers: User[];
    recentActivities: Activity[];
  }> {
    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [connectedUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.stravaConnected, true));
    const [totalActivitiesResult] = await db.select({ count: sql<number>`count(*)` }).from(activities);

    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    const recentActivities = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(10);

    return {
      totalUsers: totalUsersResult.count,
      connectedUsers: connectedUsersResult.count,
      totalActivities: totalActivitiesResult.count,
      recentUsers,
      recentActivities
    };
  }

  async getAllUsers(limit = 100): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  async deleteAccount(userId: number): Promise<void> {
    // Delete all user data in the correct order (cascade deletion)
    // Delete from tables with foreign keys first, then the user record
    
    // Delete activities
    await db.delete(activities).where(eq(activities.userId, userId));
    
    // Delete AI insights
    await db.delete(aiInsights).where(eq(aiInsights.userId, userId));
    
    // Delete training plans
    await db.delete(trainingPlans).where(eq(trainingPlans.userId, userId));
    
    // Delete feedback (nullable userId, so check for match)
    await db.delete(feedback).where(eq(feedback.userId, userId));
    
    // Delete goals
    await db.delete(goals).where(eq(goals.userId, userId));
    
    // Delete performance logs (nullable userId, so check for match)
    await db.delete(performanceLogs).where(eq(performanceLogs.userId, userId));
    
    // Delete AI chat conversations and messages
    const userConversations = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId));
    
    for (const conversation of userConversations) {
      await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversation.id));
    }
    await db.delete(aiConversations).where(eq(aiConversations.userId, userId));
    
    // Finally, delete the user record
    await db.delete(users).where(eq(users.id, userId));
  }

  async createDeletionFeedback(feedbackData: InsertDeletionFeedback): Promise<DeletionFeedback> {
    const [result] = await db
      .insert(deletionFeedback)
      .values(feedbackData)
      .returning();
    return result;
  }

  async getDeletionFeedback(limit = 100): Promise<DeletionFeedback[]> {
    return await db
      .select()
      .from(deletionFeedback)
      .orderBy(desc(deletionFeedback.createdAt))
      .limit(limit);
  }

  // ============== DRIP CAMPAIGN METHODS ==============

  async getUserCampaign(userId: number, campaign: string): Promise<UserCampaign | undefined> {
    const [result] = await db
      .select()
      .from(userCampaigns)
      .where(and(eq(userCampaigns.userId, userId), eq(userCampaigns.campaign, campaign as any)));
    return result;
  }

  async getActiveCampaigns(userId: number): Promise<UserCampaign[]> {
    return await db
      .select()
      .from(userCampaigns)
      .where(and(eq(userCampaigns.userId, userId), eq(userCampaigns.state, "active")));
  }

  async createUserCampaign(campaign: InsertUserCampaign): Promise<UserCampaign> {
    const [result] = await db
      .insert(userCampaigns)
      .values(campaign)
      .returning();
    return result;
  }

  async updateUserCampaign(id: number, updates: Partial<UserCampaign>): Promise<UserCampaign | undefined> {
    const [result] = await db
      .update(userCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userCampaigns.id, id))
      .returning();
    return result;
  }

  async exitUserCampaign(id: number, exitReason: string): Promise<void> {
    await db
      .update(userCampaigns)
      .set({ 
        state: "exited", 
        exitedAt: new Date(), 
        exitReason,
        updatedAt: new Date() 
      })
      .where(eq(userCampaigns.id, id));
  }

  async createEmailJob(job: InsertEmailJob): Promise<EmailJob> {
    const [result] = await db
      .insert(emailJobs)
      .values(job)
      .returning();
    return result;
  }

  async getPendingEmailJobs(limit = 100): Promise<EmailJob[]> {
    const now = new Date();
    return await db
      .select()
      .from(emailJobs)
      .where(and(
        eq(emailJobs.status, "pending"),
        lt(emailJobs.scheduledAt, now)
      ))
      .orderBy(emailJobs.scheduledAt)
      .limit(limit);
  }

  async getEmailJobByDedupeKey(dedupeKey: string): Promise<EmailJob | undefined> {
    const [result] = await db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.dedupeKey, dedupeKey));
    return result;
  }

  async updateEmailJob(id: number, updates: Partial<EmailJob>): Promise<EmailJob | undefined> {
    const [result] = await db
      .update(emailJobs)
      .set(updates)
      .where(eq(emailJobs.id, id))
      .returning();
    return result;
  }

  async cancelEmailJobsForUser(userId: number): Promise<void> {
    await db
      .update(emailJobs)
      .set({ status: "cancelled" })
      .where(and(eq(emailJobs.userId, userId), eq(emailJobs.status, "pending")));
  }

  async createEmailClick(click: InsertEmailClick): Promise<EmailClick> {
    const [result] = await db
      .insert(emailClicks)
      .values(click)
      .returning();
    return result;
  }

  async getEmailClicksByUser(userId: number, limit = 50): Promise<EmailClick[]> {
    return await db
      .select()
      .from(emailClicks)
      .where(eq(emailClicks.userId, userId))
      .orderBy(desc(emailClicks.clickedAt))
      .limit(limit);
  }

  async getCampaignAnalytics(): Promise<{
    totalSent: number;
    totalClicked: number;
    byCampaign: Array<{ campaign: string; sent: number; clicked: number }>;
    byStep: Array<{ step: string; sent: number; clicked: number }>;
  }> {
    // Total sent emails
    const [sentResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailJobs)
      .where(eq(emailJobs.status, "sent"));
    
    // Total clicks
    const [clickResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailClicks);
    
    // Sent by campaign
    const sentByCampaign = await db
      .select({ 
        campaign: emailJobs.campaign,
        count: sql<number>`count(*)` 
      })
      .from(emailJobs)
      .where(eq(emailJobs.status, "sent"))
      .groupBy(emailJobs.campaign);
    
    // Clicks by campaign
    const clicksByCampaign = await db
      .select({ 
        campaign: emailClicks.campaign,
        count: sql<number>`count(*)` 
      })
      .from(emailClicks)
      .groupBy(emailClicks.campaign);

    // Sent by step
    const sentByStep = await db
      .select({ 
        step: emailJobs.step,
        count: sql<number>`count(*)` 
      })
      .from(emailJobs)
      .where(eq(emailJobs.status, "sent"))
      .groupBy(emailJobs.step);
    
    // Clicks by step
    const clicksByStep = await db
      .select({ 
        step: emailClicks.step,
        count: sql<number>`count(*)` 
      })
      .from(emailClicks)
      .groupBy(emailClicks.step);

    // Merge sent and clicked data by campaign
    const campaignMap = new Map<string, { sent: number; clicked: number }>();
    for (const row of sentByCampaign) {
      if (row.campaign) {
        campaignMap.set(row.campaign, { sent: Number(row.count), clicked: 0 });
      }
    }
    for (const row of clicksByCampaign) {
      if (row.campaign) {
        const existing = campaignMap.get(row.campaign) || { sent: 0, clicked: 0 };
        existing.clicked = Number(row.count);
        campaignMap.set(row.campaign, existing);
      }
    }

    // Merge sent and clicked data by step
    const stepMap = new Map<string, { sent: number; clicked: number }>();
    for (const row of sentByStep) {
      if (row.step) {
        stepMap.set(row.step, { sent: Number(row.count), clicked: 0 });
      }
    }
    for (const row of clicksByStep) {
      if (row.step) {
        const existing = stepMap.get(row.step) || { sent: 0, clicked: 0 };
        existing.clicked = Number(row.count);
        stepMap.set(row.step, existing);
      }
    }

    return {
      totalSent: Number(sentResult?.count || 0),
      totalClicked: Number(clickResult?.count || 0),
      byCampaign: Array.from(campaignMap.entries()).map(([campaign, data]) => ({ campaign, ...data })),
      byStep: Array.from(stepMap.entries()).map(([step, data]) => ({ step, ...data })),
    };
  }

  async getSegmentStatsFromCampaigns(): Promise<{
    segment_a: number;
    segment_b: number;
    segment_c: number;
    segment_d: number;
  }> {
    const counts = await db
      .select({
        campaign: userCampaigns.campaign,
        count: sql<number>`count(*)`,
      })
      .from(userCampaigns)
      .where(eq(userCampaigns.state, "active"))
      .groupBy(userCampaigns.campaign);

    const result = {
      segment_a: 0,
      segment_b: 0,
      segment_c: 0,
      segment_d: 0,
    };

    for (const row of counts) {
      if (row.campaign === "segment_a") result.segment_a = Number(row.count);
      if (row.campaign === "segment_b") result.segment_b = Number(row.count);
      if (row.campaign === "segment_c") result.segment_c = Number(row.count);
      if (row.campaign === "segment_d") result.segment_d = Number(row.count);
    }

    return result;
  }

  async getUserCountsBySubscription(): Promise<{
    total: number;
    paid: number;
    free: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [paidResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(ne(users.subscriptionPlan, "free"));

    const total = Number(totalResult?.count || 0);
    const paid = Number(paidResult?.count || 0);

    return {
      total,
      paid,
      free: total - paid,
    };
  }

  async getSystemSetting(key: string): Promise<string | undefined> {
    const [result] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return result?.value;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async updateUserActivation(userId: number, activationAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ activationAt })
      .where(eq(users.id, userId));
  }

  async updateUserLastSeen(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getInactiveUsers(daysSinceLastSeen: number): Promise<User[]> {
    const cutoff = new Date(Date.now() - daysSinceLastSeen * 24 * 60 * 60 * 1000);
    return await db
      .select()
      .from(users)
      .where(and(
        lt(users.lastSeenAt, cutoff),
        eq(users.marketingOptOut, false)
      ));
  }

  async getUsersNeedingCampaign(segment: string): Promise<User[]> {
    // Get users based on segment rules
    switch (segment) {
      case "segment_a": // Not Connected
        return await db
          .select()
          .from(users)
          .where(and(
            eq(users.stravaConnected, false),
            eq(users.marketingOptOut, false)
          ));
      case "segment_b": // Connected, Not Activated
        return await db
          .select()
          .from(users)
          .where(and(
            eq(users.stravaConnected, true),
            sql`${users.activationAt} IS NULL`,
            eq(users.marketingOptOut, false)
          ));
      case "segment_c": // Activated, Not Paid
        return await db
          .select()
          .from(users)
          .where(and(
            sql`${users.activationAt} IS NOT NULL`,
            eq(users.subscriptionPlan, "free"),
            eq(users.marketingOptOut, false)
          ));
      case "segment_d": // Inactive (7+ days)
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return await db
          .select()
          .from(users)
          .where(and(
            lt(users.lastSeenAt, cutoff),
            eq(users.subscriptionPlan, "free"),
            eq(users.marketingOptOut, false)
          ));
      default:
        return [];
    }
  }

  async getWelcomeCampaignStats(): Promise<{
    total: number;
    sent: number;
    pending: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const [sentResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.welcomeEmailSentAt} IS NOT NULL`);
    
    const total = Number(totalResult?.count || 0);
    const sent = Number(sentResult?.count || 0);
    
    return {
      total,
      sent,
      pending: total - sent
    };
  }

  async getUsersWithoutWelcomeEmail(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.welcomeEmailSentAt} IS NULL`)
      .orderBy(users.id);
  }

  async getUserAnalytics(): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgActivitiesPerUser: number;
    avgDistancePerActivity: number;
    avgTimePerActivity: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    syncSuccessRate: number;
    topActivityTypes: Array<{ type: string; count: number }>;
    userGrowthTrend: Array<{ date: string; count: number }>;
    activityTrend: Array<{ date: string; count: number }>;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily/Weekly/Monthly Active Users (users with activities)
    const [dailyActiveResult] = await db
      .select({ count: sql<number>`count(distinct ${activities.userId})` })
      .from(activities)
      .where(gte(activities.startDate, todayStart));

    const [weeklyActiveResult] = await db
      .select({ count: sql<number>`count(distinct ${activities.userId})` })
      .from(activities)
      .where(gte(activities.startDate, weekStart));

    const [monthlyActiveResult] = await db
      .select({ count: sql<number>`count(distinct ${activities.userId})` })
      .from(activities)
      .where(gte(activities.startDate, monthStart));

    // Average activities per user
    const [avgActivitiesResult] = await db
      .select({ 
        avgActivities: sql<number>`avg(activity_count)` 
      })
      .from(
        db
          .select({ 
            userId: activities.userId,
            activityCount: sql<number>`count(*)`.as('activity_count')
          })
          .from(activities)
          .groupBy(activities.userId)
          .as('user_activity_counts')
      );

    // Average distance and time per activity
    const [avgStatsResult] = await db
      .select({
        avgDistance: sql<number>`avg(${activities.distance})`,
        avgTime: sql<number>`avg(${activities.movingTime})`
      })
      .from(activities)
      .where(gt(activities.distance, 0));

    // New users
    const [newUsersTodayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, todayStart));

    const [newUsersWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, weekStart));

    // Sync success rate (users with recent sync vs connected users)
    const [connectedUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.stravaConnected, true));

    const recentSyncCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [recentlySyncedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.stravaConnected, true),
          gte(users.lastSyncAt, recentSyncCutoff)
        )
      );

    const syncSuccessRate = connectedUsersResult.count > 0 
      ? (recentlySyncedResult.count / connectedUsersResult.count) * 100 
      : 0;

    // Top activity types (using activity names as proxy)
    const topActivityTypes = await db
      .select({
        type: sql<string>`
          case 
            when lower(${activities.name}) like '%run%' then 'Running'
            when lower(${activities.name}) like '%bike%' or lower(${activities.name}) like '%cycling%' then 'Cycling'
            when lower(${activities.name}) like '%walk%' then 'Walking'
            when lower(${activities.name}) like '%swim%' then 'Swimming'
            else 'Other'
          end
        `,
        count: sql<number>`count(*)`
      })
      .from(activities)
      .groupBy(sql`
        case 
          when lower(${activities.name}) like '%run%' then 'Running'
          when lower(${activities.name}) like '%bike%' or lower(${activities.name}) like '%cycling%' then 'Cycling'
          when lower(${activities.name}) like '%walk%' then 'Walking'
          when lower(${activities.name}) like '%swim%' then 'Swimming'
          else 'Other'
        end
      `)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(5);

    // User growth trend (last 7 days)
    const userGrowthTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            gte(users.createdAt, date),
            lt(users.createdAt, nextDate)
          )
        );
      
      userGrowthTrend.push({
        date: date.toISOString().split('T')[0],
        count: result.count
      });
    }

    // Activity trend (last 7 days)
    const activityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(
          and(
            gte(activities.startDate, date),
            lt(activities.startDate, nextDate)
          )
        );
      
      activityTrend.push({
        date: date.toISOString().split('T')[0],
        count: result.count
      });
    }

    return {
      dailyActiveUsers: dailyActiveResult.count,
      weeklyActiveUsers: weeklyActiveResult.count,
      monthlyActiveUsers: monthlyActiveResult.count,
      avgActivitiesPerUser: Math.round(avgActivitiesResult.avgActivities || 0),
      avgDistancePerActivity: Math.round((avgStatsResult.avgDistance || 0) / 1000 * 10) / 10,
      avgTimePerActivity: Math.round((avgStatsResult.avgTime || 0) / 60),
      newUsersToday: newUsersTodayResult.count,
      newUsersThisWeek: newUsersWeekResult.count,
      syncSuccessRate: Math.round(syncSuccessRate),
      topActivityTypes: topActivityTypes.map(t => ({ type: t.type, count: t.count })),
      userGrowthTrend,
      activityTrend
    };
  }

  async getSystemPerformance(): Promise<{
    apiMetrics: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      requestsPerHour: number;
    };
    databaseMetrics: {
      connectionStatus: 'healthy' | 'warning' | 'error';
      avgQueryTime: number;
      slowQueries: number;
      totalQueries: number;
    };
    systemHealth: {
      uptime: number;
      memoryUsage: number;
      diskUsage: number;
      status: 'operational' | 'degraded' | 'down';
    };
    recentErrors: Array<{
      timestamp: string;
      statusCode: number;
      endpoint: string;
      method: string;
      userId?: number | null;
      errorMessage?: string | null;
      errorDetails?: string | null;
      elapsedTime?: number | null;
      requestBody?: string | null;
      responseBody?: string | null;
    }>;
    performanceTrend: Array<{
      timestamp: string;
      responseTime: number;
      requestCount: number;
      errorCount: number;
    }>;
    slowRequests: Array<{
      timestamp: string;
      endpoint: string;
      method: string;
      userId?: number | null;
      elapsedTime: number;
      statusCode: number;
      requestBody?: string | null;
      responseBody?: string | null;
    }>;
  }> {
    // Calculate system metrics (simulated based on current data and system state)
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // API Metrics - Based on database activity as proxy for API usage
    const [recentActivitiesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(gte(activities.createdAt, hourAgo));

    const [recentUsersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, hourAgo));

    // Estimate API requests based on platform activity
    const estimatedRequests = (recentActivitiesCount.count * 3) + (recentUsersCount.count * 5) + 50; // Base requests
    const avgResponseTime = 150 + Math.random() * 100; // 150-250ms typical
    const errorRate = Math.random() * 2; // 0-2% error rate
    
    // Database Metrics - Test connection and estimate performance
    let connectionStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let avgQueryTime = 25 + Math.random() * 25; // 25-50ms typical
    let slowQueries = 0;
    let totalQueries = estimatedRequests * 2; // Estimate 2 queries per request

    try {
      // Test database connection with a simple query
      const start = Date.now();
      await db.select({ count: sql<number>`count(*)` }).from(users).limit(1);
      const queryTime = Date.now() - start;
      
      avgQueryTime = queryTime;
      
      if (queryTime > 100) {
        connectionStatus = 'warning';
        slowQueries = Math.floor(totalQueries * 0.05); // 5% slow if db is slow
      } else if (queryTime > 500) {
        connectionStatus = 'error';
        slowQueries = Math.floor(totalQueries * 0.15); // 15% slow if db is very slow
      }
    } catch (error) {
      connectionStatus = 'error';
      avgQueryTime = 1000;
      slowQueries = Math.floor(totalQueries * 0.3);
    }

    // System Health Metrics
    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    const diskUsagePercent = 25 + Math.random() * 30; // Simulated 25-55% disk usage
    
    let systemStatus: 'operational' | 'degraded' | 'down' = 'operational';
    if (connectionStatus === 'error' || memoryUsagePercent > 90) {
      systemStatus = 'down';
    } else if (connectionStatus === 'warning' || memoryUsagePercent > 80 || errorRate > 5) {
      systemStatus = 'degraded';
    }

    // Recent Errors - Query from performanceLogs table (statusCode >= 400)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const errorLogs = await db
      .select({
        timestamp: performanceLogs.timestamp,
        statusCode: performanceLogs.statusCode,
        endpoint: performanceLogs.endpoint,
        method: performanceLogs.method,
        userId: performanceLogs.userId,
        errorMessage: performanceLogs.errorMessage,
        errorDetails: performanceLogs.errorDetails,
        elapsedTime: performanceLogs.elapsedTime,
        requestBody: performanceLogs.requestBody,
        responseBody: performanceLogs.responseBody
      })
      .from(performanceLogs)
      .where(
        sql`${performanceLogs.statusCode} >= 400 AND ${performanceLogs.timestamp} >= ${twentyFourHoursAgo}`
      )
      .orderBy(sql`${performanceLogs.timestamp} DESC`)
      .limit(10);

    const recentErrors = errorLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      statusCode: log.statusCode,
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId,
      errorMessage: log.errorMessage,
      errorDetails: log.errorDetails,
      elapsedTime: log.elapsedTime,
      requestBody: log.requestBody,
      responseBody: log.responseBody
    }));

    // Slow Requests - Query from performanceLogs table (elapsedTime > 10 seconds)
    const slowRequestLogs = await db
      .select({
        timestamp: performanceLogs.timestamp,
        endpoint: performanceLogs.endpoint,
        method: performanceLogs.method,
        userId: performanceLogs.userId,
        elapsedTime: performanceLogs.elapsedTime,
        statusCode: performanceLogs.statusCode,
        requestBody: performanceLogs.requestBody,
        responseBody: performanceLogs.responseBody
      })
      .from(performanceLogs)
      .where(
        and(
          gt(performanceLogs.elapsedTime, 10000),
          gte(performanceLogs.timestamp, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(performanceLogs.elapsedTime))
      .limit(10);

    const slowRequests = slowRequestLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId,
      elapsedTime: log.elapsedTime!,
      statusCode: log.statusCode,
      requestBody: log.requestBody,
      responseBody: log.responseBody
    }));

    // Performance Trend (last 6 hours, hourly data points)
    const performanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseResponseTime = 150;
      const timeVariation = Math.sin(i * 0.5) * 30; // Some fluctuation
      const hourlyRequests = 100 + Math.random() * 50;
      const hourlyErrors = Math.floor(hourlyRequests * (errorRate / 100));
      
      performanceTrend.push({
        timestamp: timestamp.toISOString(),
        responseTime: Math.round(baseResponseTime + timeVariation),
        requestCount: Math.round(hourlyRequests),
        errorCount: hourlyErrors
      });
    }

    return {
      apiMetrics: {
        totalRequests: estimatedRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 10) / 10,
        requestsPerHour: estimatedRequests
      },
      databaseMetrics: {
        connectionStatus,
        avgQueryTime: Math.round(avgQueryTime),
        slowQueries,
        totalQueries
      },
      systemHealth: {
        uptime: Math.round(uptimeSeconds),
        memoryUsage: memoryUsagePercent,
        diskUsage: Math.round(diskUsagePercent),
        status: systemStatus
      },
      recentErrors,
      performanceTrend,
      slowRequests
    };
  }

  async getAgentRunStats(): Promise<{
    totalRuns: number;
    byStatus: { status: string; count: number }[];
    byType: { runType: string; count: number }[];
    recentRuns: AgentRun[];
    last24Hours: number;
    successRate: number;
  }> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total runs
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentRuns);

    // By status
    const byStatusResult = await db
      .select({
        status: agentRuns.status,
        count: sql<number>`count(*)::int`
      })
      .from(agentRuns)
      .groupBy(agentRuns.status);

    // By type
    const byTypeResult = await db
      .select({
        runType: agentRuns.runType,
        count: sql<number>`count(*)::int`
      })
      .from(agentRuns)
      .groupBy(agentRuns.runType);

    // Recent runs (last 20)
    const recentRuns = await db
      .select()
      .from(agentRuns)
      .orderBy(desc(agentRuns.createdAt))
      .limit(20);

    // Last 24 hours
    const [last24HoursResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentRuns)
      .where(gte(agentRuns.createdAt, twentyFourHoursAgo));

    // Success rate
    const completed = byStatusResult.find(s => s.status === 'completed')?.count || 0;
    const failed = byStatusResult.find(s => s.status === 'failed')?.count || 0;
    const total = completed + failed;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      totalRuns: totalResult.count || 0,
      byStatus: byStatusResult.filter(s => s.status !== null).map(s => ({ status: s.status!, count: s.count })),
      byType: byTypeResult.filter(t => t.runType !== null).map(t => ({ runType: t.runType!, count: t.count })),
      recentRuns,
      last24Hours: last24HoursResult.count || 0,
      successRate
    };
  }

  async getPlatformStats(): Promise<{
    totalInsights: number;
    totalActivities: number;
    totalDistance: number;
    totalUsers: number;
  }> {
    // Single optimized query instead of 4 separate queries
    const result = await db.execute(sql`
      SELECT 
        (SELECT count(*)::int FROM ai_insights) as total_insights,
        (SELECT count(*)::int FROM activities) as total_activities,
        (SELECT COALESCE(sum(distance), 0)::numeric FROM activities) as total_distance,
        (SELECT count(*)::int FROM users) as total_users
    `);

    const row = result.rows[0] as any;
    return {
      totalInsights: row?.total_insights || 0,
      totalActivities: row?.total_activities || 0,
      totalDistance: Number(row?.total_distance) || 0,
      totalUsers: row?.total_users || 0
    };
  }

  // Reverse trial methods
  async getUsersWithTrialEndingSoon(daysRemaining: number): Promise<User[]> {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);
    
    // Find users whose trial ends within daysRemaining days
    // and who haven't subscribed yet
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          gt(users.trialEndsAt, now),
          lt(users.trialEndsAt, targetDate),
          sql`${users.stripeSubscriptionId} IS NULL`,
          eq(users.subscriptionPlan, 'free')
        )
      );
    
    return result;
  }
  
  async getUsersWithExpiredTrials(): Promise<User[]> {
    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Find users whose trial expired within the last 24 hours
    // and who haven't subscribed yet
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          lt(users.trialEndsAt, now),
          gt(users.trialEndsAt, oneDayAgo),
          sql`${users.stripeSubscriptionId} IS NULL`,
          eq(users.subscriptionPlan, 'free')
        )
      );
    
    return result;
  }

  // Running Shoe methods
  async getShoes(filters: {
    brand?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    hasCarbonPlate?: boolean;
    stability?: string;
  }): Promise<RunningShoe[]> {
    const conditions = [];
    
    if (filters.brand) {
      conditions.push(eq(runningShoes.brand, filters.brand));
    }
    if (filters.category) {
      conditions.push(eq(runningShoes.category, filters.category as any));
    }
    if (filters.stability) {
      conditions.push(eq(runningShoes.stability, filters.stability as any));
    }
    if (filters.hasCarbonPlate !== undefined) {
      conditions.push(eq(runningShoes.hasCarbonPlate, filters.hasCarbonPlate));
    }
    if (filters.minPrice !== undefined) {
      conditions.push(gte(runningShoes.price, filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(sql`${runningShoes.price} <= ${filters.maxPrice}`);
    }
    
    if (conditions.length > 0) {
      return db.select().from(runningShoes).where(and(...conditions)).orderBy(runningShoes.brand, runningShoes.model);
    }
    
    return db.select().from(runningShoes).orderBy(runningShoes.brand, runningShoes.model);
  }

  async getShoeById(shoeId: number): Promise<RunningShoe | undefined> {
    const [shoe] = await db.select().from(runningShoes).where(eq(runningShoes.id, shoeId));
    return shoe || undefined;
  }

  async getShoeBySlug(slug: string): Promise<RunningShoe | undefined> {
    const [shoe] = await db.select().from(runningShoes).where(eq(runningShoes.slug, slug));
    return shoe || undefined;
  }

  async getShoesBySeries(brand: string, seriesName: string): Promise<RunningShoe[]> {
    return db.select().from(runningShoes)
      .where(and(
        eq(runningShoes.brand, brand),
        eq(runningShoes.seriesName, seriesName)
      ))
      .orderBy(runningShoes.releaseYear);
  }

  async createShoe(shoe: InsertRunningShoe): Promise<RunningShoe> {
    const [newShoe] = await db
      .insert(runningShoes)
      .values(shoe)
      .returning();
    return newShoe;
  }

  async clearAllShoes(): Promise<void> {
    await db.delete(runningShoes);
  }

  // Shoe Comparison methods
  async getShoeComparisons(filters?: { type?: string; limit?: number }): Promise<ShoeComparison[]> {
    let query = db.select().from(shoeComparisons);
    
    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(shoeComparisons.comparisonType, filters.type as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(shoeComparisons.viewCount)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return query;
  }

  async getShoeComparisonBySlug(slug: string): Promise<ShoeComparison | undefined> {
    const [comparison] = await db.select().from(shoeComparisons).where(eq(shoeComparisons.slug, slug));
    return comparison || undefined;
  }

  async getShoeComparisonsByShoeId(shoeId: number): Promise<ShoeComparison[]> {
    return db.select().from(shoeComparisons)
      .where(sql`${shoeComparisons.shoe1Id} = ${shoeId} OR ${shoeComparisons.shoe2Id} = ${shoeId}`)
      .orderBy(desc(shoeComparisons.viewCount));
  }

  async createShoeComparison(comparison: InsertShoeComparison): Promise<ShoeComparison> {
    const [newComparison] = await db.insert(shoeComparisons).values(comparison).returning();
    return newComparison;
  }

  async incrementComparisonViewCount(comparisonId: number): Promise<void> {
    await db.update(shoeComparisons)
      .set({ viewCount: sql`${shoeComparisons.viewCount} + 1` })
      .where(eq(shoeComparisons.id, comparisonId));
  }

  async clearAllShoeComparisons(): Promise<void> {
    await db.delete(shoeComparisons);
  }

  // API Key methods
  async createApiKey(userId: number, name: string, scopes: string[]): Promise<{ apiKey: ApiKey; rawKey: string }> {
    // Generate a secure random API key: ra_ prefix + 32 random bytes as hex
    const rawKey = `ra_${crypto.randomBytes(32).toString('hex')}`;
    
    // Hash the key using bcrypt for secure storage
    const keyHash = await bcrypt.hash(rawKey, 10);
    
    // Store only last 4 chars as hint for identification
    const keyHint = rawKey.slice(-4);
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId,
        keyHash,
        keyHint,
        name,
        scopes,
      })
      .returning();
    
    return { apiKey, rawKey };
  }

  async getApiKeysByUserId(userId: number): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async deleteApiKey(keyId: number, userId: number): Promise<void> {
    await db.delete(apiKeys)
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, userId)
      ));
  }

  async validateApiKey(rawKey: string): Promise<{ valid: boolean; userId?: number; scopes?: string[]; keyId?: number }> {
    // Check if key has correct prefix
    if (!rawKey.startsWith('ra_')) {
      return { valid: false };
    }
    
    // Get all active API keys (we need to check each one since we store hashes)
    const allKeys = await db.select().from(apiKeys)
      .where(eq(apiKeys.isActive, true));
    
    // Check each key - bcrypt compare handles the salt automatically
    for (const key of allKeys) {
      const matches = await bcrypt.compare(rawKey, key.keyHash);
      if (matches) {
        return {
          valid: true,
          userId: key.userId,
          scopes: key.scopes,
          keyId: key.id
        };
      }
    }
    
    return { valid: false };
  }

  async updateApiKeyLastUsed(keyId: number): Promise<void> {
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyId));
  }

  // Mobile auth / Refresh token methods
  async createRefreshToken(userId: number, deviceName?: string, deviceId?: string): Promise<{ tokenId: number; rawToken: string; expiresAt: Date }> {
    const rawToken = `rt_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const [token] = await db.insert(refreshTokens)
      .values({
        userId,
        tokenHash,
        deviceName: deviceName || null,
        deviceId: deviceId || null,
        expiresAt,
      })
      .returning();
    
    return { tokenId: token.id, rawToken, expiresAt };
  }

  async validateRefreshToken(rawToken: string): Promise<{ valid: boolean; userId?: number; tokenId?: number }> {
    if (!rawToken || !rawToken.startsWith('rt_')) {
      return { valid: false };
    }
    
    // Get all non-revoked, non-expired tokens
    const tokens = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date())
        )
      );
    
    // Check each token's hash
    for (const token of tokens) {
      const isMatch = await bcrypt.compare(rawToken, token.tokenHash);
      if (isMatch) {
        return { valid: true, userId: token.userId, tokenId: token.id };
      }
    }
    
    return { valid: false };
  }

  async revokeRefreshToken(tokenId: number): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, tokenId));
  }

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  async updateRefreshTokenLastUsed(tokenId: number): Promise<void> {
    await db.update(refreshTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId));
  }

  async getActiveRefreshTokens(userId: number): Promise<Array<{ id: number; deviceName: string | null; deviceId: string | null; lastUsedAt: Date | null; createdAt: Date | null }>> {
    const tokens = await db.select({
      id: refreshTokens.id,
      deviceName: refreshTokens.deviceName,
      deviceId: refreshTokens.deviceId,
      lastUsedAt: refreshTokens.lastUsedAt,
      createdAt: refreshTokens.createdAt,
    })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .orderBy(desc(refreshTokens.lastUsedAt));
    
    return tokens;
  }

  // Sync state methods
  async getSyncState(userId: number): Promise<{
    syncStatus: "idle" | "running" | "error";
    syncProgress: number;
    syncTotal: number;
    syncError: string | null;
    lastSyncAt: Date | null;
    lastIncrementalSince: Date | null;
  } | undefined> {
    const [user] = await db.select({
      syncStatus: users.syncStatus,
      syncProgress: users.syncProgress,
      syncTotal: users.syncTotal,
      syncError: users.syncError,
      lastSyncAt: users.lastSyncAt,
      lastIncrementalSince: users.lastIncrementalSince,
    }).from(users).where(eq(users.id, userId));
    
    if (!user) return undefined;
    
    return {
      syncStatus: (user.syncStatus as "idle" | "running" | "error") || "idle",
      syncProgress: user.syncProgress || 0,
      syncTotal: user.syncTotal || 0,
      syncError: user.syncError,
      lastSyncAt: user.lastSyncAt,
      lastIncrementalSince: user.lastIncrementalSince,
    };
  }

  async updateSyncState(userId: number, state: {
    syncStatus?: "idle" | "running" | "error";
    syncProgress?: number;
    syncTotal?: number;
    syncError?: string | null;
    lastSyncAt?: Date;
    lastIncrementalSince?: Date;
  }): Promise<void> {
    await db.update(users)
      .set(state)
      .where(eq(users.id, userId));
  }

  async startSync(userId: number, total?: number): Promise<void> {
    await db.update(users)
      .set({
        syncStatus: "running",
        syncProgress: 0,
        syncTotal: total || 0,
        syncError: null,
      })
      .where(eq(users.id, userId));
  }

  async updateSyncProgress(userId: number, progress: number, total?: number): Promise<void> {
    const updates: Record<string, unknown> = { syncProgress: progress };
    if (total !== undefined) {
      updates.syncTotal = total;
    }
    await db.update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  async completeSyncSuccess(userId: number, incrementalSince?: Date): Promise<void> {
    const updates: Record<string, unknown> = {
      syncStatus: "idle",
      syncError: null,
      lastSyncAt: new Date(),
    };
    if (incrementalSince) {
      updates.lastIncrementalSince = incrementalSince;
    }
    await db.update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  async completeSyncError(userId: number, error: string): Promise<void> {
    await db.update(users)
      .set({
        syncStatus: "error",
        syncError: error,
      })
      .where(eq(users.id, userId));
  }

  // Workout cache methods
  async getWorkoutByFingerprint(fingerprint: string): Promise<WorkoutCache | undefined> {
    const [cached] = await db.select()
      .from(workoutCache)
      .where(eq(workoutCache.fingerprint, fingerprint))
      .limit(1);
    return cached || undefined;
  }

  async cacheWorkout(workout: InsertWorkoutCache): Promise<WorkoutCache> {
    const [cached] = await db.insert(workoutCache)
      .values(workout)
      .onConflictDoUpdate({
        target: workoutCache.fingerprint,
        set: {
          title: workout.title,
          descriptionTemplate: workout.descriptionTemplate,
          mainSetTemplate: workout.mainSetTemplate,
          intervalsTemplate: workout.intervalsTemplate,
          intensity: workout.intensity,
          lastUsedAt: new Date(),
        },
      })
      .returning();
    return cached;
  }

  async incrementWorkoutCacheHit(fingerprint: string): Promise<void> {
    await db.update(workoutCache)
      .set({
        hitCount: sql`${workoutCache.hitCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(workoutCache.fingerprint, fingerprint));
  }

  // Batch update plan days by week for progressive persistence
  async updatePlanDaysByWeek(weekId: number, updates: Array<{ dayOfWeek: string; updates: Partial<PlanDay> }>): Promise<void> {
    for (const update of updates) {
      await db.update(planDays)
        .set(update.updates)
        .where(and(
          eq(planDays.weekId, weekId),
          eq(planDays.dayOfWeek, update.dayOfWeek)
        ));
    }
  }

  // ============== AI COACH AGENT METHODS ==============

  // Coach recaps
  async createCoachRecap(recap: InsertCoachRecap): Promise<CoachRecap> {
    const [created] = await db.insert(coachRecaps).values(recap).returning();
    return created;
  }

  async getCoachRecapByActivityId(activityId: number): Promise<CoachRecap | undefined> {
    const [recap] = await db.select()
      .from(coachRecaps)
      .where(eq(coachRecaps.activityId, activityId))
      .limit(1);
    return recap || undefined;
  }

  async getCoachRecapsByUserId(userId: number, limit = 20): Promise<CoachRecap[]> {
    return db.select()
      .from(coachRecaps)
      .where(eq(coachRecaps.userId, userId))
      .orderBy(desc(coachRecaps.createdAt))
      .limit(limit);
  }

  async getLatestCoachRecap(userId: number): Promise<CoachRecap | undefined> {
    const [recap] = await db.select()
      .from(coachRecaps)
      .where(eq(coachRecaps.userId, userId))
      .orderBy(desc(coachRecaps.createdAt))
      .limit(1);
    return recap || undefined;
  }

  async markCoachRecapViewed(recapId: number): Promise<void> {
    await db.update(coachRecaps)
      .set({ viewedAt: new Date() })
      .where(eq(coachRecaps.id, recapId));
  }

  async markCoachRecapNotificationSent(recapId: number): Promise<void> {
    await db.update(coachRecaps)
      .set({ notificationSent: true })
      .where(eq(coachRecaps.id, recapId));
  }

  async getUnviewedCoachRecapsCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(coachRecaps)
      .where(and(
        eq(coachRecaps.userId, userId),
        sql`${coachRecaps.viewedAt} IS NULL`
      ));
    return result[0]?.count ?? 0;
  }

  // Agent runs
  async createAgentRun(run: InsertAgentRun): Promise<AgentRun> {
    const [created] = await db.insert(agentRuns).values(run).returning();
    return created;
  }

  async getAgentRunByDedupeKey(dedupeKey: string): Promise<AgentRun | undefined> {
    const [run] = await db.select()
      .from(agentRuns)
      .where(eq(agentRuns.dedupeKey, dedupeKey))
      .limit(1);
    return run || undefined;
  }

  async updateAgentRun(runId: number, updates: Partial<AgentRun>): Promise<AgentRun | undefined> {
    const [updated] = await db.update(agentRuns)
      .set(updates)
      .where(eq(agentRuns.id, runId))
      .returning();
    return updated || undefined;
  }

  async getAgentRunsByUserId(userId: number, limit = 50): Promise<AgentRun[]> {
    return db.select()
      .from(agentRuns)
      .where(eq(agentRuns.userId, userId))
      .orderBy(desc(agentRuns.createdAt))
      .limit(limit);
  }

  async getPendingAgentRuns(limit = 100): Promise<AgentRun[]> {
    return db.select()
      .from(agentRuns)
      .where(eq(agentRuns.status, "pending"))
      .orderBy(agentRuns.createdAt)
      .limit(limit);
  }

  // Notification outbox
  async createNotification(notification: InsertNotificationOutbox): Promise<NotificationOutbox> {
    const [created] = await db.insert(notificationOutbox).values(notification).returning();
    return created;
  }

  async getPendingNotifications(limit = 100): Promise<NotificationOutbox[]> {
    return db.select()
      .from(notificationOutbox)
      .where(and(
        eq(notificationOutbox.status, "pending"),
        sql`${notificationOutbox.scheduledFor} <= NOW()`
      ))
      .orderBy(notificationOutbox.scheduledFor)
      .limit(limit);
  }

  async markNotificationSent(notificationId: number): Promise<void> {
    await db.update(notificationOutbox)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notificationOutbox.id, notificationId));
  }

  async markNotificationFailed(notificationId: number, error: string): Promise<void> {
    await db.update(notificationOutbox)
      .set({ 
        status: "failed", 
        errorMessage: error,
        retryCount: sql`${notificationOutbox.retryCount} + 1`
      })
      .where(eq(notificationOutbox.id, notificationId));
  }

  async getNotificationsByUserId(userId: number, limit = 50): Promise<NotificationOutbox[]> {
    return db.select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.userId, userId))
      .orderBy(desc(notificationOutbox.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notificationOutbox)
      .where(and(
        eq(notificationOutbox.userId, userId),
        sql`${notificationOutbox.readAt} IS NULL`,
        eq(notificationOutbox.status, "sent"),
        eq(notificationOutbox.channel, "in_app")
      ));
    return result[0]?.count ?? 0;
  }

  async markNotificationReadForUser(notificationId: number, userId: number): Promise<boolean> {
    const result = await db.update(notificationOutbox)
      .set({ readAt: new Date() })
      .where(and(
        eq(notificationOutbox.id, notificationId),
        eq(notificationOutbox.userId, userId)
      ))
      .returning({ id: notificationOutbox.id });
    return result.length > 0;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notificationOutbox)
      .set({ readAt: new Date() })
      .where(and(
        eq(notificationOutbox.userId, userId),
        sql`${notificationOutbox.readAt} IS NULL`
      ));
  }

  async getNotificationByDedupeKey(dedupeKey: string): Promise<NotificationOutbox | undefined> {
    const [notification] = await db.select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.dedupeKey, dedupeKey))
      .limit(1);
    return notification || undefined;
  }

  // Coach preferences helpers
  async getPremiumUsersForCoaching(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(and(
        eq(users.subscriptionPlan, "premium"),
        eq(users.stravaConnected, true),
        eq(users.coachOnboardingCompleted, true)
      ));
  }

  async getUsersNeedingCoachSync(sinceDays = 1): Promise<User[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);
    
    return db.select()
      .from(users)
      .where(and(
        eq(users.subscriptionPlan, "premium"),
        eq(users.stravaConnected, true),
        eq(users.coachOnboardingCompleted, true),
        sql`(${users.lastCoachSyncAt} IS NULL OR ${users.lastCoachSyncAt} < ${cutoff})`
      ));
  }
}

// Initialize with demo data
class DatabaseStorageWithDemo extends DatabaseStorage {
  private initialized = false;

  private async initializeDemoUser() {
    if (this.initialized) return;

    // Check if demo user already exists using direct database call to avoid recursion
    const [existingUser] = await db.select().from(users).where(eq(users.username, "demo_runner"));
    if (existingUser) {
      this.initialized = true;
      return;
    }

    // Create demo user with hashed password
    const hashedPassword = await bcrypt.hash("demo123", 10);
    const demoUser = await this.createUser({
      email: "demo@example.com",
      password: hashedPassword,
      firstName: "Demo",
      lastName: "Runner",
      username: "demo_runner",
      unitPreference: "km"
    });

    // Add demo activities
    const demoActivities = [
      {
        userId: demoUser.id,
        stravaId: "demo_1",
        name: "Morning Run",
        distance: 5200,
        movingTime: 1560,
        totalElevationGain: 45,
        averageSpeed: 3.33,
        maxSpeed: 4.5,
        averageHeartrate: 165,
        maxHeartrate: 180,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        type: "Run"
      },
      {
        userId: demoUser.id,
        stravaId: "demo_2",
        name: "Easy Recovery Run",
        distance: 3800,
        movingTime: 1320,
        totalElevationGain: 20,
        averageSpeed: 2.88,
        maxSpeed: 3.2,
        averageHeartrate: 145,
        maxHeartrate: 160,
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        type: "Run"
      },
      {
        userId: demoUser.id,
        stravaId: "demo_3",
        name: "Tempo Run",
        distance: 8000,
        movingTime: 2400,
        totalElevationGain: 80,
        averageSpeed: 3.33,
        maxSpeed: 4.0,
        averageHeartrate: 175,
        maxHeartrate: 185,
        startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        type: "Run"
      }
    ];

    for (const activityData of demoActivities) {
      await this.createActivity(activityData);
    }

    this.initialized = true;
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.initializeDemoUser();
    return super.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.initializeDemoUser();
    return super.getUserByUsername(username);
  }

  async createTrainingPlan(insertPlan: InsertTrainingPlan): Promise<TrainingPlan> {
    await this.initializeDemoUser();
    return super.createTrainingPlan(insertPlan);
  }

  async getLatestTrainingPlan(userId: number): Promise<TrainingPlan | undefined> {
    await this.initializeDemoUser();
    return super.getLatestTrainingPlan(userId);
  }

  async updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    await this.initializeDemoUser();
    return super.updateActivity(activityId, updates);
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    connectedUsers: number;
    totalActivities: number;
    recentUsers: User[];
    recentActivities: Activity[];
  }> {
    await this.initializeDemoUser();
    return super.getAdminStats();
  }

  async getAllUsers(limit = 100): Promise<User[]> {
    await this.initializeDemoUser();
    return super.getAllUsers(limit);
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined> {
    await this.initializeDemoUser();
    return super.updateStripeCustomerId(userId, stripeCustomerId);
  }

  async updateStripeSubscriptionId(userId: number, stripeSubscriptionId: string): Promise<User | undefined> {
    await this.initializeDemoUser();
    return super.updateStripeSubscriptionId(userId, stripeSubscriptionId);
  }

  async updateSubscriptionStatus(userId: number, status: string, plan?: string): Promise<User | undefined> {
    await this.initializeDemoUser();
    return super.updateSubscriptionStatus(userId, status, plan);
  }
}

export const storage = new DatabaseStorageWithDemo();
