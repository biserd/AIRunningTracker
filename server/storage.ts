import { users, activities, aiInsights, trainingPlans, trainingPlansLegacy, athleteProfiles, planWeeks, planDays, planGoals, feedback, goals, performanceLogs, aiConversations, aiMessages, runningShoes, shoeComparisons, apiKeys, refreshTokens, workoutCache, coachRecaps, agentRuns, notificationOutbox, deletionFeedback, userCampaigns, emailJobs, emailClicks, systemSettings, pushSubscriptions, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type TrainingPlan, type InsertTrainingPlan, type Feedback, type InsertFeedback, type Goal, type InsertGoal, type PerformanceLog, type InsertPerformanceLog, type AIConversation, type InsertAIConversation, type AIMessage, type InsertAIMessage, type RunningShoe, type InsertRunningShoe, type ShoeComparison, type InsertShoeComparison, type ApiKey, type InsertApiKey, type RefreshToken, type InsertRefreshToken, type AthleteProfile, type InsertAthleteProfile, type PlanWeek, type InsertPlanWeek, type PlanDay, type InsertPlanDay, type PlanGoal, type InsertPlanGoal, type WorkoutCache, type InsertWorkoutCache, type CoachRecap, type InsertCoachRecap, type AgentRun, type InsertAgentRun, type NotificationOutbox, type InsertNotificationOutbox, type DeletionFeedback, type InsertDeletionFeedback, type UserCampaign, type InsertUserCampaign, type EmailJob, type InsertEmailJob, type EmailClick, type InsertEmailClick, type PushSubscription, type InsertPushSubscription } from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, sql, inArray, gte, gt, lt, ne, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

export const RUNNING_ACTIVITY_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

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
  getUserByStravaAthleteId(stravaAthleteId: string): Promise<User | null>;
  
  // Stripe subscription methods
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined>;
  updateStripeSubscriptionId(userId: number, stripeSubscriptionId: string): Promise<User | undefined>;
  updateSubscriptionStatus(userId: number, status: string, plan?: string): Promise<User | undefined>;
  
  createActivity(activity: InsertActivity): Promise<Activity>;
  getMostRecentActivityByUserId(userId: number): Promise<Activity | undefined>;
  getActivitiesNeedingHydration(userId: number, limit?: number): Promise<Activity[]>;
  getActivitiesByUserId(userId: number, limit?: number, startDate?: Date, opts?: { excludeLockedForFree?: boolean }): Promise<Activity[]>;
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
  deleteActivity(activityId: number): Promise<void>;
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
  
  createPlanGoal(goal: InsertPlanGoal): Promise<PlanGoal>;
  createPlanGoals(goals: InsertPlanGoal[]): Promise<PlanGoal[]>;
  getPlanGoals(planId: number): Promise<PlanGoal[]>;
  deletePlanGoals(planId: number): Promise<void>;
  
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
  getLastSentEmailForUser(userId: number): Promise<EmailJob | null>;
  
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
  getSimilarShoes(shoe: RunningShoe, limit?: number): Promise<RunningShoe[]>;
  createShoe(shoe: InsertRunningShoe): Promise<RunningShoe>;
  clearAllShoes(): Promise<void>;
  
  // Shoe Comparison methods
  getShoeComparisons(filters?: { type?: string; limit?: number }): Promise<ShoeComparison[]>;
  getShoeComparisonBySlug(slug: string): Promise<ShoeComparison | undefined>;
  getShoeComparisonsByShoeId(shoeId: number): Promise<ShoeComparison[]>;
  createShoeComparison(comparison: InsertShoeComparison): Promise<ShoeComparison>;
  incrementComparisonViewCount(comparisonId: number): Promise<void>;
  clearAÛÍ5ÒÚ$z{-®éÜj×F÷FÃ°Ğ¢ĞĞ¢v—BF"çWFFR‡W6W'2Ğ¢ç6WB‡WFFW2Ğ¢çv†W&R†W‡W6W'2æ–BÂW6W$–B’“°Ğ¢ĞĞ Ğ¢7–æ26ö×ÆWFU7–æ57V66W72‡W6W$–C¢çVÖ&W"Â–æ7&VÖVçFÅ6–æ6Só¢FFR“¢&öÖ—6SÇfö–Câ°Ğ¢6öç7BWFFW3¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâÒ°Ğ¢7–æ57FGW3¢&–FÆR"ÀĞ¢7–æ4W'&÷#¢çVÆÂÀĞ¢Æ7E7–æ4C¢æWrFFR‚’ÀĞ¢Ó°Ğ¢–b†–æ7&VÖVçFÅ6–æ6R’°Ğ¢WFFW2æÆ7D–æ7&VÖVçFÅ6–æ6RÒ–æ7&VÖVçFÅ6–æ6S°Ğ¢ĞĞ¢v—BF"çWFFR‡W6W'2Ğ¢ç6WB‡WFFW2Ğ¢çv†W&R†W‡W6W'2æ–BÂW6W$–B’“°Ğ¢ĞĞ Ğ¢7–æ26ö×ÆWFU7–æ4W'&÷"‡W6W$–C¢çVÖ&W"ÂW'&÷#¢7G&–ær“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR‡W6W'2Ğ¢ç6WB‡°Ğ¢7–æ57FGW3¢&W'&÷""ÀĞ¢7–æ4W'&÷#¢W'&÷"ÀĞ¢ÒĞ¢çv†W&R†W‡W6W'2æ–BÂW6W$–B’“°Ğ¢ĞĞ Ğ¢òòv÷&¶÷WB66†RÖWF†öG0Ğ¢7–æ2vWEv÷&¶÷WD'”f–ævW'&–çB†f–ævW'&–çC¢7G&–ær“¢&öÖ—6SÅv÷&¶÷WD66†RÂVæFVf–æVCâ°Ğ¢6öç7B¶66†VEÒÒv—BF"ç6VÆV7B‚Ğ¢æg&öÒ‡v÷&¶÷WD66†RĞ¢çv†W&R†W‡v÷&¶÷WD66†Ræf–ævW'&–çBÂf–ævW'&–çB’Ğ¢æÆ–Ö—Bƒ“°Ğ¢&WGW&â66†VBÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢7–æ266†Uv÷&¶÷WB‡v÷&¶÷WC¢–ç6W'Ev÷&¶÷WD66†R“¢&öÖ—6SÅv÷&¶÷WD66†Sâ°Ğ¢6öç7B¶66†VEÒÒv—BF"æ–ç6W'B‡v÷&¶÷WD66†RĞ¢çfÇVW2‡v÷&¶÷WBĞ¢æöä6öæfÆ–7DFõWFFR‡°Ğ¢F&vWC¢v÷&¶÷WD66†Ræf–ævW'&–çBÀĞ¢6WC¢°Ğ¢F—FÆS¢v÷&¶÷WBçF—FÆRÀĞ¢FW67&—F–öåFV×ÆFS¢v÷&¶÷WBæFW67&—F–öåFV×ÆFRÀĞ¢Ö–å6WEFV×ÆFS¢v÷&¶÷WBæÖ–å6WEFV×ÆFRÀĞ¢–çFW'fÇ5FV×ÆFS¢v÷&¶÷WBæ–çFW'fÇ5FV×ÆFRÀĞ¢–çFVç6—G“¢v÷&¶÷WBæ–çFVç6—G’ÀĞ¢Æ7EW6VDC¢æWrFFR‚’ÀĞ¢ÒÀĞ¢ÒĞ¢ç&WGW&æ–ær‚“°Ğ¢&WGW&â66†VC°Ğ¢ĞĞ Ğ¢7–æ2–æ7&VÖVçEv÷&¶÷WD66†T†—B†f–ævW'&–çC¢7G&–ær“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR‡v÷&¶÷WD66†RĞ¢ç6WB‡°Ğ¢†—D6÷VçC¢7ÆG·v÷&¶÷WD66†Ræ†—D6÷VçGÒ²ÀĞ¢Æ7EW6VDC¢æWrFFR‚’ÀĞ¢ÒĞ¢çv†W&R†W‡v÷&¶÷WD66†Ræf–ævW'&–çBÂf–ævW'&–çB’“°Ğ¢ĞĞ Ğ¢òò&F6‚WFFRÆâF—2'’vVV²f÷"&öw&W76—fRW'6—7FVæ6PĞ¢7–æ2WFFUÆäF—4'•vVV²‡vVV´–C¢çVÖ&W"ÂWFFW3¢'&“Ç²F”öevVV³¢7G&–æs²WFFW3¢'F–ÃÅÆäF“âÓâ“¢&öÖ—6SÇfö–Câ°Ğ¢f÷"†6öç7BWFFRöbWFFW2’°Ğ¢v—BF"çWFFR‡ÆäF—2Ğ¢ç6WB‡WFFRçWFFW2Ğ¢çv†W&R†æB€Ğ¢W‡ÆäF—2çvVV´–BÂvVV´–B’ÀĞ¢W‡ÆäF—2æF”öevVV²ÂWFFRæF”öevVV²Ğ¢’“°Ğ¢ĞĞ¢ĞĞ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÒ’4ô4‚tTåBÔUD„ôE2ÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¢òò6ö6‚&V60Ğ¢7–æ27&VFT6ö6…&V6‡&V6¢–ç6W'D6ö6…&V6“¢&öÖ—6SÄ6ö6…&V6â°Ğ¢6öç7B¶7&VFVEÒÒv—BF"æ–ç6W'B†6ö6…&V62’çfÇVW2‡&V6’ç&WGW&æ–ær‚“°Ğ¢&WGW&â7&VFVC°Ğ¢ĞĞ Ğ¢7–æ2vWD6ö6…&V6'”7F—f—G”–B†7F—f—G”–C¢çVÖ&W"“¢&öÖ—6SÄ6ö6…&V6ÂVæFVf–æVCâ°Ğ¢6öç7B·&V6ÒÒv—BF"ç6VÆV7B‚Ğ¢æg&öÒ†6ö6…&V62Ğ¢çv†W&R†W†6ö6…&V62æ7F—f—G”–BÂ7F—f—G”–B’Ğ¢æÆ–Ö—Bƒ“°Ğ¢&WGW&â&V6ÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢7–æ2vWD6ö6…&V64'•W6W$–B‡W6W$–C¢çVÖ&W"ÂÆ–Ö—BÒ#“¢&öÖ—6SÄ6ö6…&V6µÓâ°Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ†6ö6…&V62Ğ¢çv†W&R†W†6ö6…&V62çW6W$–BÂW6W$–B’Ğ¢æ÷&FW$'’†FW62†6ö6…&V62æ7&VFVDB’Ğ¢æÆ–Ö—B†Æ–Ö—B“°Ğ¢ĞĞ Ğ¢7–æ2vWDÆFW7D6ö6…&V6‡W6W$–C¢çVÖ&W"“¢&öÖ—6SÄ6ö6…&V6ÂVæFVf–æVCâ°Ğ¢6öç7B·&V6ÒÒv—BF"ç6VÆV7B‚Ğ¢æg&öÒ†6ö6…&V62Ğ¢çv†W&R†W†6ö6…&V62çW6W$–BÂW6W$–B’Ğ¢æ÷&FW$'’†FW62†6ö6…&V62æ7&VFVDB’Ğ¢æÆ–Ö—Bƒ“°Ğ¢&WGW&â&V6ÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢7–æ2Ö&´6ö6…&V6f–WvVB‡&V6–C¢çVÖ&W"“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR†6ö6…&V62Ğ¢ç6WB‡²f–WvVDC¢æWrFFR‚’ÒĞ¢çv†W&R†W†6ö6…&V62æ–BÂ&V6–B’“°Ğ¢ĞĞ Ğ¢7–æ2Ö&´6ö6…&V6æ÷F–f–6F–öå6VçB‡&V6–C¢çVÖ&W"“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR†6ö6…&V62Ğ¢ç6WB‡²æ÷F–f–6F–öå6VçC¢G'VRÒĞ¢çv†W&R†W†6ö6…&V62æ–BÂ&V6–B’“°Ğ¢ĞĞ Ğ¢7–æ2vWEVçf–WvVD6ö6…&V646÷VçB‡W6W$–C¢çVÖ&W"“¢&öÖ—6SÆçVÖ&W#â°Ğ¢6öç7B&W7VÇBÒv—BF"ç6VÆV7B‡²6÷VçC¢7ÃÆçVÖ&W#æ6÷VçB‚¢“£¦–çFÒĞ¢æg&öÒ†6ö6…&V62Ğ¢çv†W&R†æB€Ğ¢W†6ö6…&V62çW6W$–BÂW6W$–B’ÀĞ¢7ÆG¶6ö6…&V62çf–WvVDGÒ•2åTÄÆ Ğ¢’“°Ğ¢&WGW&â&W7VÇE³Óòæ6÷VçBóò°Ğ¢ĞĞ Ğ¢òòvVçB'Vç0Ğ¢7–æ27&VFTvVçE'Vâ‡'Vã¢–ç6W'DvVçE'Vâ“¢&öÖ—6SÄvVçE'Vãâ°Ğ¢6öç7B¶7&VFVEÒÒv—BF"æ–ç6W'B†vVçE'Vç2’çfÇVW2‡'Vâ’ç&WGW&æ–ær‚“°Ğ¢&WGW&â7&VFVC°Ğ¢ĞĞ Ğ¢7–æ2vWDvVçE'Vä'”FVGWT¶W’†FVGWT¶W“¢7G&–ær“¢&öÖ—6SÄvVçE'VâÂVæFVf–æVCâ°Ğ¢6öç7B·'VåÒÒv—BF"ç6VÆV7B‚Ğ¢æg&öÒ†vVçE'Vç2Ğ¢çv†W&R†W†vVçE'Vç2æFVGWT¶W’ÂFVGWT¶W’’Ğ¢æÆ–Ö—Bƒ“°Ğ¢&WGW&â'VâÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢7–æ2WFFTvVçE'Vâ‡'Vä–C¢çVÖ&W"ÂWFFW3¢'F–ÃÄvVçE'Vãâ“¢&öÖ—6SÄvVçE'VâÂVæFVf–æVCâ°Ğ¢6öç7B·WFFVEÒÒv—BF"çWFFR†vVçE'Vç2Ğ¢ç6WB‡WFFW2Ğ¢çv†W&R†W†vVçE'Vç2æ–BÂ'Vä–B’Ğ¢ç&WGW&æ–ær‚“°Ğ¢&WGW&âWFFVBÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢7–æ2vWDvVçE'Vç4'•W6W$–B‡W6W$–C¢çVÖ&W"ÂÆ–Ö—BÒS“¢&öÖ—6SÄvVçE'VåµÓâ°Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ†vVçE'Vç2Ğ¢çv†W&R†W†vVçE'Vç2çW6W$–BÂW6W$–B’Ğ¢æ÷&FW$'’†FW62†vVçE'Vç2æ7&VFVDB’Ğ¢æÆ–Ö—B†Æ–Ö—B“°Ğ¢ĞĞ Ğ¢7–æ2vWEVæF–ætvVçE'Vç2†Æ–Ö—BÒ“¢&öÖ—6SÄvVçE'VåµÓâ°Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ†vVçE'Vç2Ğ¢çv†W&R†W†vVçE'Vç2ç7FGW2Â'VæF–ær"’Ğ¢æ÷&FW$'’†vVçE'Vç2æ7&VFVDBĞ¢æÆ–Ö—B†Æ–Ö—B“°Ğ¢ĞĞ Ğ¢òòæ÷F–f–6F–öâ÷WF&÷€Ğ¢7–æ27&VFTæ÷F–f–6F–öâ†æ÷F–f–6F–öã¢–ç6W'Dæ÷F–f–6F–öä÷WF&÷‚“¢&öÖ—6SÄæ÷F–f–6F–öä÷WF&÷ƒâ°¢–b†æ÷F–f–6F–öâæFVGWT¶W’’°¢6öç7BFVGWT¶W’Òæ÷F–f–6F–öâæFVGWT¶W“°¢&WGW&âF"çG&ç67F–öâ†7–æ2‡G‚’Óâ°¢òòG&ç67F–öâ×66÷VBGf—6÷'’Æö6²Ö¶W2FVGWRFöÖ–2WfVâGW&–ær¢òò&öÆÆ–ærFWÆ÷’&Vf÷&RF†RVæ—VR–æFW‚†2&VVâ7&VFVBà¢v—BG‚æW†V7WFR‡7Æ4TÄT5BuöGf—6÷'•÷†7EöÆö6²††6‡FW‡B‚G¶FVGWT¶W—Ò’–“°¢6öç7B¶W†—7F–æuÒÒv—BG‚ç6VÆV7B‚’æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚æFVGWT¶W’ÂFVGWT¶W’’’æÆ–Ö—Bƒ“°¢–b†W†—7F–ær’&WGW&âW†—7F–æs°¢6öç7B¶7&VFVEÒÒv—BG‚æ–ç6W'B†æ÷F–f–6F–öä÷WF&÷‚’çfÇVW2†æ÷F–f–6F–öâ’ç&WGW&æ–ær‚“°¢&WGW&â7&VFVC°¢Ò“°¢Ğ¢6öç7B¶7&VFVEÒÒv—BF"æ–ç6W'B†æ÷F–f–6F–öä÷WF&÷‚’çfÇVW2†æ÷F–f–6F–öâ’ç&WGW&æ–ær‚“°¢&WGW&â7&VFVC°¢Ğ ¢7–æ2vWEVæF–ætæ÷F–f–6F–öç2†Æ–Ö—BÒ“¢&öÖ—6SÄæ÷F–f–6F–öä÷WF&÷…µÓâ°¢&WGW&âF"çG&ç67F–öâ†7–æ2‡G‚’Óâ°¢v—BG‚çWFFR†æ÷F–f–6F–öä÷WF&÷‚¢ç6WB‡²7FGW3¢'VæF–ær"Â&ö6W76–æu7F'FVDC¢çVÆÂÂW'&÷$ÖW76vS¢%&V6÷fW&VB7FÆRFVÆ—fW'’6Æ–Ò"Ò¢çv†W&R†æB€¢W†æ÷F–f–6F–öä÷WF&÷‚ç7FGW2Â'&ö6W76–ær"’À¢7ÆG¶æ÷F–f–6F–öä÷WF&÷‚ç&ö6W76–æu7F'FVDGÒÂäõr‚’Ò”åDU%dÂsÖ–çWFW2vÀ¢’“°¢6öç7B6Æ–ÖVBÒv—BG‚ç6VÆV7B‡²–C¢æ÷F–f–6F–öä÷WF&÷‚æ–BÒ¢æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚¢çv†W&R†æB†W†æ÷F–f–6F–öä÷WF&÷‚ç7FGW2Â'VæF–ær"’Â7ÆG¶æ÷F–f–6F–öä÷WF&÷‚ç66†VGVÆVDf÷'ÒÃÒäõr‚–’¢æ÷&FW$'’†æ÷F–f–6F–öä÷WF&÷‚ç66†VGVÆVDf÷"¢æÆ–Ö—B†Æ–Ö—B¢æf÷"‚'WFFR"Â²6¶—Æö6¶VC¢G'VRÒ“°¢–b†6Æ–ÖVBæÆVæwF‚ÓÓÒ’&WGW&âµÓ°¢6öç7B–G2Ò6Æ–ÖVBæÖ‚‡&÷r’Óâ&÷ræ–B“°¢v—BG‚çWFFR†æ÷F–f–6F–öä÷WF&÷‚’ç6WB‡²7FGW3¢'&ö6W76–ær"Â&ö6W76–æu7F'FVDC¢æWrFFR‚’Ò’çv†W&R†–ä'&’†æ÷F–f–6F–öä÷WF&÷‚æ–BÂ–G2’“°¢&WGW&âG‚ç6VÆV7B‚’æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚’çv†W&R†–ä'&’†æ÷F–f–6F–öä÷WF&÷‚æ–BÂ–G2’“°¢Ò“°¢Ğ Ğ¢7–æ2Ö&´æ÷F–f–6F–öå6VçB†æ÷F–f–6F–öä–C¢çVÖ&W"“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR†æ÷F–f–6F–öä÷WF&÷‚Ğ¢ç6WB‡²7FGW3¢'6VçB"Â6VçDC¢æWrFFR‚’Â&ö6W76–æu7F'FVDC¢çVÆÂÒ¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚æ–BÂæ÷F–f–6F–öä–B’“°Ğ¢ĞĞ Ğ¢7–æ2Ö&´æ÷F–f–6F–öäf–ÆVB†æ÷F–f–6F–öä–C¢çVÖ&W"ÂW'&÷#¢7G&–ær“¢&öÖ—6SÇfö–Câ°¢v—BF"çWFFR†æ÷F–f–6F–öä÷WF&÷‚Ğ¢ç6WB‡² Ğ¢7FGW3¢&f–ÆVB"Â Ğ¢W'&÷$ÖW76vS¢W'&÷"ÀĞ¢&WG'”6÷VçC¢7ÆG¶æ÷F–f–6F–öä÷WF&÷‚ç&WG'”6÷VçGÒ²À¢&ö6W76–æu7F'FVDC¢çVÆÂÀ¢ÒĞ¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚æ–BÂæ÷F–f–6F–öä–B’“°Ğ¢Ğ ¢7–æ2&W66†VGVÆTæ÷F–f–6F–öâ†æ÷F–f–6F–öä–C¢çVÖ&W"Â66†VGVÆVDf÷#¢FFR“¢&öÖ—6SÇfö–Câ°¢v—BF"çWFFR†æ÷F–f–6F–öä÷WF&÷‚¢ç6WB‡²66†VGVÆVDf÷"Â7FGW3¢'VæF–ær"ÂW'&÷$ÖW76vS¢çVÆÂÂ&ö6W76–æu7F'FVDC¢çVÆÂÒ¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚æ–BÂæ÷F–f–6F–öä–B’“°¢Ğ Ğ¢7–æ2vWDæ÷F–f–6F–öç4'•W6W$–B‡W6W$–C¢çVÖ&W"ÂÆ–Ö—BÒS“¢&öÖ—6SÄæ÷F–f–6F–öä÷WF&÷…µÓâ°Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚Ğ¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚çW6W$–BÂW6W$–B’Ğ¢æ÷&FW$'’†FW62†æ÷F–f–6F–öä÷WF&÷‚æ7&VFVDB’Ğ¢æÆ–Ö—B†Æ–Ö—B“°Ğ¢ĞĞ Ğ¢7–æ2vWEVç&VDæ÷F–f–6F–öç46÷VçB‡W6W$–C¢çVÖ&W"“¢&öÖ—6SÆçVÖ&W#â°Ğ¢6öç7B&W7VÇBÒv—BF"ç6VÆV7B‡²6÷VçC¢7ÃÆçVÖ&W#æ6÷VçB‚¢“£¦–çFÒĞ¢æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚Ğ¢çv†W&R†æB€Ğ¢W†æ÷F–f–6F–öä÷WF&÷‚çW6W$–BÂW6W$–B’ÀĞ¢7ÆG¶æ÷F–f–6F–öä÷WF&÷‚ç&VDGÒ•2åTÄÆÀĞ¢W†æ÷F–f–6F–öä÷WF&÷‚ç7FGW2Â'6VçB"’ÀĞ¢W†æ÷F–f–6F–öä÷WF&÷‚æ6†ææVÂÂ&–åö"Ğ¢’“°Ğ¢&WGW&â&W7VÇE³Óòæ6÷VçBóò°Ğ¢ĞĞ Ğ¢7–æ2Ö&´æ÷F–f–6F–öå&VDf÷%W6W"†æ÷F–f–6F–öä–C¢çVÖ&W"ÂW6W$–C¢çVÖ&W"“¢&öÖ—6SÆ&ööÆVãâ°Ğ¢6öç7B&W7VÇBÒv—BF"çWFFR†æ÷F–f–6F–öä÷WF&÷‚Ğ¢ç6WB‡²&VDC¢æWrFFR‚’ÒĞ¢çv†W&R†æB€Ğ¢W†æ÷F–f–6F–öä÷WF&÷‚æ–BÂæ÷F–f–6F–öä–B’ÀĞ¢W†æ÷F–f–6F–öä÷WF&÷‚çW6W$–BÂW6W$–BĞ¢’Ğ¢ç&WGW&æ–ær‡²–C¢æ÷F–f–6F–öä÷WF&÷‚æ–BÒ“°Ğ¢&WGW&â&W7VÇBæÆVæwF‚â°Ğ¢ĞĞ Ğ¢7–æ2Ö&´ÆÄæ÷F–f–6F–öç5&VB‡W6W$–C¢çVÖ&W"“¢&öÖ—6SÇfö–Câ°Ğ¢v—BF"çWFFR†æ÷F–f–6F–öä÷WF&÷‚Ğ¢ç6WB‡²&VDC¢æWrFFR‚’ÒĞ¢çv†W&R†æB€Ğ¢W†æ÷F–f–6F–öä÷WF&÷‚çW6W$–BÂW6W$–B’ÀĞ¢7ÆG¶æ÷F–f–6F–öä÷WF&÷‚ç&VDGÒ•2åTÄÆ Ğ¢’“°Ğ¢ĞĞ Ğ¢7–æ2vWDæ÷F–f–6F–öä'”FVGWT¶W’†FVGWT¶W“¢7G&–ær“¢&öÖ—6SÄæ÷F–f–6F–öä÷WF&÷‚ÂVæFVf–æVCâ°Ğ¢6öç7B¶æ÷F–f–6F–öåÒÒv—BF"ç6VÆV7B‚Ğ¢æg&öÒ†æ÷F–f–6F–öä÷WF&÷‚Ğ¢çv†W&R†W†æ÷F–f–6F–öä÷WF&÷‚æFVGWT¶W’ÂFVGWT¶W’’Ğ¢æÆ–Ö—Bƒ“°Ğ¢&WGW&âæ÷F–f–6F–öâÇÂVæFVf–æVC°Ğ¢ĞĞ Ğ¢òò6ö6‚&VfW&Væ6W2†VÇW'0Ğ¢7–æ2vWE&VÖ—VÕW6W'4f÷$6ö6†–ær‚“¢&öÖ—6SÅW6W%µÓâ°Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ‡W6W'2Ğ¢çv†W&R†æB€Ğ¢W‡W6W'2ç7V'67&—F–öåÆâÂ'&VÖ—VÒ"’ÀĞ¢W‡W6W'2ç7G&f6öææV7FVBÂG'VR’ÀĞ¢W‡W6W'2æ6ö6„öæ&ö&F–æt6ö×ÆWFVBÂG'VRĞ¢’“°Ğ¢ĞĞ Ğ¢7–æ2vWEW6W'4æVVF–æt6ö6…7–æ2‡6–æ6TF—2Ò“¢&öÖ—6SÅW6W%µÓâ°Ğ¢6öç7B7WFöfbÒæWrFFR‚“°Ğ¢7WFöfbç6WDFFR†7WFöfbævWDFFR‚’Ò6–æ6TF—2“°Ğ¢ Ğ¢&WGW&âF"ç6VÆV7B‚Ğ¢æg&öÒ‡W6W'2Ğ¢çv†W&R†æB€Ğ¢W‡W6W'2ç7V'67&—F–öåÆâÂ'&VÖ—VÒ"’ÀĞ¢W‡W6W'2ç7G&f6öææV7FVBÂG'VR’ÀĞ¢W‡W6W'2æ6ö6„öæ&ö&F–æt6ö×ÆWFVBÂG'VR’ÀĞ¢7Æ‚G·W6W'2æÆ7D6ö6…7–æ4GÒ•2åTÄÂõ"G·W6W'2æÆ7D6ö6…7–æ4GÒÂG¶7WFöfgÒ– Ğ¢’“°Ğ¢ĞĞ§ĞĞ Ğ¢òò–æ—F–Æ—¦Rv—F‚FVÖòFFĞ¦6Æ72FF&6U7F÷&vUv—F„FVÖòW‡FVæG2FF&6U7F÷&vR°Ğ¢&—fFR–æ—F–Æ—¦VBÒfÇ6S°Ğ Ğ¢&—fFR7–æ2–æ—F–Æ—¦TFVÖõW6W"‚’°Ğ¢–b‡F†—2æ–æ—F–Æ—¦VB’&WGW&ã°Ğ Ğ¢òò6†V6²–bFVÖòW6W"Ç&VG’W†—7G2W6–ærF—&V7BFF&6R6ÆÂFòfö–B&V7W'6–öàĞ¢6öç7B¶W†—7F–æuW6W%ÒÒv—BF"ç6VÆV7B‚’æg&öÒ‡W6W'2’çv†W&R†W‡W6W'2çW6W&æÖRÂ&FVÖõ÷'VææW""’“°Ğ¢–b†W†—7F–æuW6W"’°Ğ¢F†—2æ–æ—F–Æ—¦VBÒG'VS°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢òò7&VFRFVÖòW6W"v—F‚†6†VB77v÷&@Ğ¢6öç7B†6†VE77v÷&BÒv—B&7'—Bæ†6‚‚&FVÖó#2"Â“°Ğ¢6öç7BFVÖõW6W"Òv—BF†—2æ7&VFUW6W"‡°Ğ¢VÖ–Ã¢&FVÖôW†×ÆRæ6öÒ"ÀĞ¢77v÷&C¢†6†VE77v÷&BÀĞ¢f—'7DæÖS¢$FVÖò"ÀĞ¢Æ7DæÖS¢%'VææW""ÀĞ¢W6W&æÖS¢&FVÖõ÷'VææW""ÀĞ¢Væ—E&VfW&Væ6S¢&¶Ò Ğ¢Ò“°Ğ Ğ¢òòFBFVÖò7F—f—F–W0Ğ¢6öç7BFVÖô7F—f—F–W2Ò°Ğ¢°Ğ¢W6W$–C¢FVÖõW6W"æ–BÀĞ¢7G&f–C¢&FVÖõó"ÀĞ¢æÖS¢$Ö÷&æ–ær'Vâ"ÀĞ¢F—7Fæ6S¢S#ÀĞ¢Ö÷f–æuF–ÖS¢ScÀĞ¢F÷FÄVÆWfF–öäv–ã¢CRÀĞ¢fW&vU7VVC¢2ã32ÀĞ¢Ö…7VVC¢BãRÀĞ¢fW&vT†V'G&FS¢cRÀĞ¢Ö„†V'G&FS¢ƒÀĞ¢7F'DFFS¢æWrFFR„FFRææ÷r‚’Ò"¢#B¢c¢c¢’ÀĞ¢G—S¢%'Vâ Ğ¢ÒÀĞ¢°Ğ¢W6W$–C¢FVÖõW6W"æ–BÀĞ¢7G&f–C¢&FVÖõó""ÀĞ¢æÖS¢$V7’&V6÷fW'’'Vâ"ÀĞ¢F—7Fæ6S¢3ƒÀĞ¢Ö÷f–æuF–ÖS¢3#ÀĞ¢F÷FÄVÆWfF–öäv–ã¢#ÀĞ¢fW&vU7VVC¢"ãƒ‚ÀĞ¢Ö…7VVC¢2ã"ÀĞ¢fW&vT†V'G&FS¢CRÀĞ¢Ö„†V'G&FS¢cÀĞ¢7F'DFFS¢æWrFFR„FFRææ÷r‚’ÒB¢#B¢c¢c¢’ÀĞ¢G—S¢%'Vâ Ğ¢ÒÀĞ¢°Ğ¢W6W$–C¢FVÖõW6W"æ–BÀĞ¢7G&f–C¢&FVÖõó2"ÀĞ¢æÖS¢%FV×ò'Vâ"ÀĞ¢F—7Fæ6S¢ƒÀĞ¢Ö÷f–æuF–ÖS¢#CÀĞ¢F÷FÄVÆWfF–öäv–ã¢ƒÀĞ¢fW&vU7VVC¢2ã32ÀĞ¢Ö…7VVC¢BãÀĞ¢fW&vT†V'G&FS¢sRÀĞ¢Ö„†V'G&FS¢ƒRÀĞ¢7F'DFFS¢æWrFFR„FFRææ÷r‚’Òb¢#B¢c¢c¢’ÀĞ¢G—S¢%'Vâ Ğ¢ĞĞ¢Ó°Ğ Ğ¢f÷"†6öç7B7F—f—G”FFöbFVÖô7F—f—F–W2’°Ğ¢v—BF†—2æ7&VFT7F—f—G’†7F—f—G”FF“°Ğ¢ĞĞ Ğ¢F†—2æ–æ—F–Æ—¦VBÒG'VS°Ğ¢ĞĞ Ğ¢7–æ2vWEW6W"†–C¢çVÖ&W"“¢&öÖ—6SÅW6W"ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"ævWEW6W"†–B“°Ğ¢ĞĞ Ğ¢7–æ2vWEW6W$'•W6W&æÖR‡W6W&æÖS¢7G&–ær“¢&öÖ—6SÅW6W"ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"ævWEW6W$'•W6W&æÖR‡W6W&æÖR“°Ğ¢ĞĞ Ğ¢7–æ27&VFUG&–æ–æuÆâ†–ç6W'EÆã¢–ç6W'EG&–æ–æuÆâ“¢&öÖ—6SÅG&–æ–æuÆãâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"æ7&VFUG&–æ–æuÆâ†–ç6W'EÆâ“°Ğ¢ĞĞ Ğ¢7–æ2vWDÆFW7EG&–æ–æuÆâ‡W6W$–C¢çVÖ&W"“¢&öÖ—6SÅG&–æ–æuÆâÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"ævWDÆFW7EG&–æ–æuÆâ‡W6W$–B“°Ğ¢ĞĞ Ğ¢7–æ2WFFT7F—f—G’†7F—f—G”–C¢çVÖ&W"ÂWFFW3¢'F–ÃÄ7F—f—G“â“¢&öÖ—6SÄ7F—f—G’ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"çWFFT7F—f—G’†7F—f—G”–BÂWFFW2“°Ğ¢ĞĞ Ğ¢7–æ2vWDFÖ–å7FG2‚“¢&öÖ—6SÇ°Ğ¢F÷FÅW6W'3¢çVÖ&W#°Ğ¢6öææV7FVEW6W'3¢çVÖ&W#°Ğ¢F÷FÄ7F—f—F–W3¢çVÖ&W#°Ğ¢&V6VçEW6W'3¢W6W%µÓ°Ğ¢&V6VçD7F—f—F–W3¢7F—f—G•µÓ°Ğ¢Óâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"ævWDFÖ–å7FG2‚“°Ğ¢ĞĞ Ğ¢7–æ2vWDÆÅW6W'2†Æ–Ö—BÒ“¢&öÖ—6SÅW6W%µÓâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"ævWDÆÅW6W'2†Æ–Ö—B“°Ğ¢ĞĞ Ğ¢7–æ2WFFU7G&—T7W7FöÖW$–B‡W6W$–C¢çVÖ&W"Â7G&—T7W7FöÖW$–C¢7G&–ær“¢&öÖ—6SÅW6W"ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"çWFFU7G&—T7W7FöÖW$–B‡W6W$–BÂ7G&—T7W7FöÖW$–B“°Ğ¢ĞĞ Ğ¢7–æ2WFFU7G&—U7V'67&—F–öä–B‡W6W$–C¢çVÖ&W"Â7G&—U7V'67&—F–öä–C¢7G&–ær“¢&öÖ—6SÅW6W"ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"çWFFU7G&—U7V'67&—F–öä–B‡W6W$–BÂ7G&—U7V'67&—F–öä–B“°Ğ¢ĞĞ Ğ¢7–æ2WFFU7V'67&—F–öå7FGW2‡W6W$–C¢çVÖ&W"Â7FGW3¢7G&–ærÂÆãó¢7G&–ær“¢&öÖ—6SÅW6W"ÂVæFVf–æVCâ°Ğ¢v—BF†—2æ–æ—F–Æ—¦TFVÖõW6W"‚“°Ğ¢&WGW&â7WW"çWFFU7V'67&—F–öå7FGW2‡W6W$–BÂ7FGW2ÂÆâ“°Ğ¢ĞĞ§ĞĞ Ğ¦W‡÷'B6öç7B7F÷&vRÒæWrFF&6U7F÷&vUv—F„FVÖò‚“°Ğ