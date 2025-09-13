import { users, activities, aiInsights, emailWaitlist, trainingPlans, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type InsertEmailWaitlist, type TrainingPlan, type InsertTrainingPlan } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gte, gt, lt } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByUserId(userId: number, limit?: number): Promise<Activity[]>;
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
  
  addToEmailWaitlist(email: string): Promise<void>;
  
  // Admin methods
  getAdminStats(): Promise<{
    totalUsers: number;
    connectedUsers: number;
    totalActivities: number;
    totalWaitlistEmails: number;
    recentUsers: User[];
    recentActivities: Activity[];
  }>;
  getAllUsers(limit?: number): Promise<User[]>;
  getWaitlistEmails(limit?: number): Promise<{
    id: number;
    email: string;
    createdAt: string;
  }[]>;
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

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getActivitiesByUserId(userId: number, limit = 50): Promise<Activity[]> {
    const userActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.startDate))
      .limit(limit);
    return userActivities;
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

  async addToEmailWaitlist(email: string): Promise<void> {
    await db.insert(emailWaitlist).values({ email });
  }

  // Admin methods
  async getAdminStats(): Promise<{
    totalUsers: number;
    connectedUsers: number;
    totalActivities: number;
    totalWaitlistEmails: number;
    recentUsers: User[];
    recentActivities: Activity[];
  }> {
    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [connectedUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.stravaConnected, true));
    const [totalActivitiesResult] = await db.select({ count: sql<number>`count(*)` }).from(activities);
    const [totalWaitlistResult] = await db.select({ count: sql<number>`count(*)` }).from(emailWaitlist);

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
      totalWaitlistEmails: totalWaitlistResult.count,
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

  async getWaitlistEmails(limit = 100): Promise<{
    id: number;
    email: string;
    createdAt: string;
  }[]> {
    const waitlistEmails = await db
      .select()
      .from(emailWaitlist)
      .orderBy(desc(emailWaitlist.createdAt))
      .limit(limit);
    
    return waitlistEmails.map(item => ({
      id: item.id,
      email: item.email,
      createdAt: item.createdAt?.toISOString() || new Date().toISOString()
    }));
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
      .where(gte(activities.startDate, todayStart.toISOString()));

    const [weeklyActiveResult] = await db
      .select({ count: sql<number>`count(distinct ${activities.userId})` })
      .from(activities)
      .where(gte(activities.startDate, weekStart.toISOString()));

    const [monthlyActiveResult] = await db
      .select({ count: sql<number>`count(distinct ${activities.userId})` })
      .from(activities)
      .where(gte(activities.startDate, monthStart.toISOString()));

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
      .where(gte(users.createdAt, todayStart.toISOString()));

    const [newUsersWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, weekStart.toISOString()));

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
          gte(users.lastSyncAt, recentSyncCutoff.toISOString())
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
            gte(users.createdAt, date.toISOString()),
            lt(users.createdAt, nextDate.toISOString())
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
            gte(activities.startDate, date.toISOString()),
            lt(activities.startDate, nextDate.toISOString())
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
    totalWaitlistEmails: number;
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
}

export const storage = new DatabaseStorageWithDemo();
