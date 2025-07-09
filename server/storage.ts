import { users, activities, aiInsights, emailWaitlist, trainingPlans, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight, type InsertEmailWaitlist, type TrainingPlan, type InsertTrainingPlan } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
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
