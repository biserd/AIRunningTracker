import { users, activities, aiInsights, trainingPlans, feedback, goals, performanceLogs, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type TrainingPlan, type InsertTrainingPlan, type Feedback, type InsertFeedback, type Goal, type InsertGoal, type PerformanceLog, type InsertPerformanceLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gte, gt, lt } from "drizzle-orm";
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
  
  // Stripe subscription methods
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined>;
  updateStripeSubscriptionId(userId: number, stripeSubscriptionId: string): Promise<User | undefined>;
  updateSubscriptionStatus(userId: number, status: string, plan?: string): Promise<User | undefined>;
  
  createActivity(activity: InsertActivity): Promise<Activity>;
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
  getActivityByStravaId(stravaId: string): Promise<Activity | undefined>;
  getActivityByStravaIdAndUser(stravaId: string, userId: number): Promise<Activity | undefined>;
  updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  
  createAIInsight(insight: InsertAIInsight): Promise<AIInsight>;
  getAIInsightsByUserId(userId: number, type?: string): Promise<AIInsight[]>;
  deleteOldAIInsights(userId: number, type: string): Promise<void>;
  cleanupOldAIInsights(userId: number, type: string, keepCount?: number): Promise<void>;
  getHistoricalAIInsights(userId: number, limit?: number): Promise<AIInsight[]>;
  
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getLatestTrainingPlan(userId: number): Promise<TrainingPlan | undefined>;
  
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
  
  // User account management
  deleteAccount(userId: number): Promise<void>;
  
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
      conditions.push(gte(activities.startDate, startDate));
    }
    if (endDate) {
      // Add one day to endDate to include activities on that day
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(lt(activities.startDate, endDateTime));
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

  async createAIInsight(insertInsight: InsertAIInsight): Promise<AIInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  async getAIInsightsByUserId(userId: number, type?: string): Promise<AIInsight[]> {
    const conditions = [eq(aiInsights.userId, userId)];
    if (type) {
      conditions.push(eq(aiInsights.type, type));
    }

    const userInsights = await db
      .select()
      .from(aiInsights)
      .where(and(...conditions))
      .orderBy(desc(aiInsights.createdAt));
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

  async updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    const [activity] = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, activityId))
      .returning();
    return activity || undefined;
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
    
    // Finally, delete the user record
    await db.delete(users).where(eq(users.id, userId));
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
