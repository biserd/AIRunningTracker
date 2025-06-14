import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaAthleteId: text("strava_athlete_id"),
  stravaConnected: boolean("strava_connected").default(false),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  stravaConnected: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertAIInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertAIInsight = z.infer<typeof insertAIInsightSchema>;
export type AIInsight = typeof aiInsights.$inferSelect;
