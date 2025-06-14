import { users, activities, aiInsights, type User, type InsertUser, type Activity, type InsertActivity, type AIInsight, type InsertAIInsight } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByUserId(userId: number, limit?: number): Promise<Activity[]>;
  getActivityByStravaId(stravaId: string): Promise<Activity | undefined>;
  
  createAIInsight(insight: InsertAIInsight): Promise<AIInsight>;
  getAIInsightsByUserId(userId: number, type?: string): Promise<AIInsight[]>;
  deleteOldAIInsights(userId: number, type: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private activities: Map<number, Activity>;
  private aiInsights: Map<number, AIInsight>;
  private currentUserId: number;
  private currentActivityId: number;
  private currentInsightId: number;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.aiInsights = new Map();
    this.currentUserId = 1;
    this.currentActivityId = 1;
    this.currentInsightId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaAthleteId: null,
      stravaConnected: false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const activity: Activity = {
      ...insertActivity,
      id,
      createdAt: new Date(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getActivitiesByUserId(userId: number, limit = 50): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, limit);
  }

  async getActivityByStravaId(stravaId: string): Promise<Activity | undefined> {
    return Array.from(this.activities.values()).find(
      activity => activity.stravaId === stravaId
    );
  }

  async createAIInsight(insertInsight: InsertAIInsight): Promise<AIInsight> {
    const id = this.currentInsightId++;
    const insight: AIInsight = {
      ...insertInsight,
      id,
      createdAt: new Date(),
    };
    this.aiInsights.set(id, insight);
    return insight;
  }

  async getAIInsightsByUserId(userId: number, type?: string): Promise<AIInsight[]> {
    return Array.from(this.aiInsights.values())
      .filter(insight => insight.userId === userId && (!type || insight.type === type))
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async deleteOldAIInsights(userId: number, type: string): Promise<void> {
    const toDelete = Array.from(this.aiInsights.entries())
      .filter(([_, insight]) => insight.userId === userId && insight.type === type);
    
    toDelete.forEach(([id]) => this.aiInsights.delete(id));
  }
}

export const storage = new MemStorage();
