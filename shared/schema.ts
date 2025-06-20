import { pgTable, text, serial, integer, boolean, real, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username").unique(),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaAthleteId: text("strava_athlete_id"),
  stravaConnected: boolean("strava_connected").default(false),
  unitPreference: text("unit_preference", { enum: ["km", "miles"] }).default("km"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailWaitlist = pgTable("email_waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stravaId: text("strava_id").notNull(),
  name: text("name").notNull(),
  distance: real("distance").notNull(), // in meters
  movingTime: integer("moving_time").notNull(), // in seconds
  totalElevationGain: real("total_elevation_gain").notNull(), // in meters
  averageSpeed: real("average_speed").notNull(), // in m/s
  maxSpeed: real("max_speed").notNull(), // in m/s
  averageHeartrate: real("average_heartrate"),
  maxHeartrate: real("max_heartrate"),
  startDate: timestamp("start_date").notNull(),
  type: text("type").notNull().default("Run"),
  // Additional Strava fields
  calories: real("calories"),
  averageCadence: real("average_cadence"), // steps per minute
  maxCadence: real("max_cadence"),
  averageWatts: real("average_watts"),
  maxWatts: real("max_watts"),
  sufferScore: integer("suffer_score"),
  commentsCount: integer("comments_count").default(0),
  kudosCount: integer("kudos_count").default(0),
  achievementCount: integer("achievement_count").default(0),
  startLatitude: real("start_latitude"),
  startLongitude: real("start_longitude"),
  endLatitude: real("end_latitude"),
  endLongitude: real("end_longitude"),
  averageTemp: real("average_temp"), // celsius
  hasHeartrate: boolean("has_heartrate").default(false),
  deviceWatts: boolean("device_watts").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'performance', 'pattern', 'recovery', 'recommendation'
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: real("confidence").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weeks: integer("weeks").notNull(),
  planData: json("plan_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  stravaConnected: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertAIInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  createdAt: true,
});

export const insertEmailWaitlistSchema = createInsertSchema(emailWaitlist).omit({
  id: true,
  createdAt: true,
});

// Login schema for authentication
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration schema
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertAIInsight = z.infer<typeof insertAIInsightSchema>;
export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertEmailWaitlist = z.infer<typeof insertEmailWaitlistSchema>;
export type EmailWaitlist = typeof emailWaitlist.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
