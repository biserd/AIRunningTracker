import { users, activities, aiInsights, trainingPlans, feedback, goals, performanceLogs, aiConversations, aiMessages, runningShoes, apiKeys, refreshTokens, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type TrainingPlan, type InsertTrainingPlan, type Feedback, type InsertFeedback, type Goal, type InsertGoal, type PerformanceLog, type InsertPerformanceLog, type AIConversation, type InsertAIConversation, type AIMessage, type InsertAIMessage, type RunningShoe, type InsertRunningShoe, type ApiKey, type InsertApiKey, type RefreshToken, type InsertRefreshToken } from "@shared/schema";
import crypto from "crypto";
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
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
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
  getUserStravaIds(userId: number): Promise<string[]>;
  updateActivity(activityId: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  
  createAIInsight(insight: InsertAIInsight): Promise<AIInsight>;
  getAIInsightsByUserId(userId: number, type?: string, limit?: number): Promise<AIInsight[]>;
  deleteOldAIInsights(userId: number, type: string): Promise<void>;
  cleanupOldAIInsights(userId: number, type: string, keepCount?: number): Promise<void>;
  getHistoricalAIInsights(userId: number, limit?: number): Promise<AIInsight[]>;
  
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getLatestTrainingPlan(userId: number): Promise<TrainingPlan | undefined>;
  deleteTrainingPlans(userId: number): Promise<void>;
  
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
  createShoe(shoe: InsertRunningShoe): Promise<RunningShoe>;
  clearAllShoes(): Promise<void>;
  
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

  async getPlatformStats(): Promise<{
    totalInsights: number;
    totalActivities: number;
    totalDistance: number;
    totalUsers: number;
  }> {
    const [insightsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiInsights);
    
    const [activityCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities);
    
    const [distanceSum] = await db
      .select({ sum: sql<number>`COALESCE(sum(distance), 0)::numeric` })
      .from(activities);
    
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    return {
      totalInsights: insightsCount?.count || 0,
      totalActivities: activityCount?.count || 0,
      totalDistance: Number(distanceSum?.sum) || 0,
      totalUsers: userCount?.count || 0
    };
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
