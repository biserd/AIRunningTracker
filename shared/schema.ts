import { pgTable, text, serial, integer, boolean, real, timestamp, json, index } from "drizzle-orm/pg-core";
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
  unitPreference: text("unit_preference", { enum: ["km", "miles"] }).default("miles"),
  isAdmin: boolean("is_admin").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  // Password reset fields
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status", { 
    enum: ["trialing", "active", "past_due", "canceled", "unpaid"] 
  }).default("active"),
  subscriptionPlan: text("subscription_plan", { 
    enum: ["free", "pro", "premium"] 
  }).default("pro"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
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
  polyline: text("polyline"), // Encoded polyline from Strava
  detailedPolyline: text("detailed_polyline"), // Higher resolution polyline
  streamsData: text("streams_data"), // JSON string of Strava streams data (HR, cadence, power, etc.)
  lapsData: text("laps_data"), // JSON string of Strava laps/splits data
  averageTemp: real("average_temp"), // celsius
  hasHeartrate: boolean("has_heartrate").default(false),
  deviceWatts: boolean("device_watts").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("activities_user_id_idx").on(table.userId),
  startDateIdx: index("activities_start_date_idx").on(table.startDate),
  userIdStartDateIdx: index("activities_user_id_start_date_idx").on(table.userId, table.startDate),
}));

export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'performance', 'pattern', 'recovery', 'recommendation'
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: real("confidence").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ai_insights_user_id_idx").on(table.userId),
  createdAtIdx: index("ai_insights_created_at_idx").on(table.createdAt),
  userIdTypeIdx: index("ai_insights_user_id_type_idx").on(table.userId, table.type),
}));

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weeks: integer("weeks").notNull(),
  planData: json("plan_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  type: text("type", { enum: ["bug", "feature"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["new", "in_progress", "resolved", "closed"] }).default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'speed', 'endurance', 'distance', 'hills', etc.
  targetValue: text("target_value"), // What they're aiming for (e.g., "Complete 3 speed workouts")
  currentProgress: real("current_progress").default(0), // Current progress toward goal
  status: text("status", { enum: ["active", "completed"] }).default("active"),
  source: text("source", { enum: ["recommendation", "manual"] }).default("recommendation"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const performanceLogs = pgTable("performance_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Nullable for unauthenticated requests
  endpoint: text("endpoint").notNull(), // e.g., "/api/dashboard/2"
  method: text("method").notNull(), // GET, POST, PUT, DELETE, etc.
  statusCode: integer("status_code").notNull(), // 200, 400, 500, etc.
  elapsedTime: integer("elapsed_time").notNull(), // milliseconds
  userAgent: text("user_agent"), // Browser/client user agent string
  errorMessage: text("error_message"), // Error message if request failed
  errorDetails: text("error_details"), // Stack trace or additional error context
  requestBody: text("request_body"), // Request body (POST/PUT data), truncated if >5KB
  responseBody: text("response_body"), // Response body, truncated if >5KB
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title"), // Auto-generated from first message or user-provided
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ai_conversations_user_id_idx").on(table.userId),
  updatedAtIdx: index("ai_conversations_updated_at_idx").on(table.updatedAt),
}));

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdIdx: index("ai_messages_conversation_id_idx").on(table.conversationId),
  createdAtIdx: index("ai_messages_created_at_idx").on(table.createdAt),
}));

export const runningShoes = pgTable("running_shoes", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(), // Nike, Brooks, Hoka, Asics, New Balance, Saucony, On, Altra
  model: text("model").notNull(), // Pegasus 41, Glycerin 21, Bondi 8, etc.
  slug: text("slug").unique(), // URL-friendly identifier: nike-pegasus-41
  seriesName: text("series_name"), // Shoe family: "Pegasus", "Bondi", "Ghost"
  versionNumber: integer("version_number"), // Iteration: 41, 21, 8
  category: text("category", { 
    enum: ["daily_trainer", "racing", "long_run", "recovery", "speed_training", "trail"] 
  }).notNull(),
  weight: real("weight").notNull(), // weight in ounces
  heelStackHeight: real("heel_stack_height").notNull(), // heel stack in mm
  forefootStackHeight: real("forefoot_stack_height").notNull(), // forefoot stack in mm
  heelToToeDrop: real("heel_to_toe_drop").notNull(), // drop in mm
  cushioningLevel: text("cushioning_level", { 
    enum: ["soft", "medium", "firm"] 
  }).notNull(),
  stability: text("stability", { 
    enum: ["neutral", "mild_stability", "motion_control"] 
  }).notNull(),
  hasCarbonPlate: boolean("has_carbon_plate").default(false),
  hasSuperFoam: boolean("has_super_foam").default(false), // ZoomX, PEBA, FF Turbo, etc.
  price: real("price").notNull(), // MSRP in USD
  bestFor: text("best_for").array().notNull(), // ["speed_work", "racing", "long_runs", "easy_runs", "tempo"]
  minRunnerWeight: integer("min_runner_weight"), // min recommended weight in lbs
  maxRunnerWeight: integer("max_runner_weight"), // max recommended weight in lbs
  durabilityRating: real("durability_rating").notNull(), // 1-5 scale
  responsivenessRating: real("responsiveness_rating").notNull(), // 1-5 scale
  comfortRating: real("comfort_rating").notNull(), // 1-5 scale
  releaseYear: integer("release_year").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  // AI-generated content for SEO and user insights
  aiResilienceScore: real("ai_resilience_score"), // 1-100 score based on durability + materials
  aiMileageEstimate: text("ai_mileage_estimate"), // e.g., "300-400 miles"
  aiTargetUsage: text("ai_target_usage"), // e.g., "Daily training and easy runs"
  aiNarrative: text("ai_narrative"), // Detailed AI-written description for SEO
  aiFaq: text("ai_faq"), // JSON string of FAQ Q&A pairs for schema markup
  // Data sourcing metadata for tracking data freshness and accuracy
  sourceUrl: text("source_url"), // URL of the source (manufacturer website, RunRepeat, etc.)
  dataSource: text("data_source", {
    enum: ["manufacturer", "runrepeat", "doctors_of_running", "running_warehouse", "user_submitted", "curated"]
  }).default("curated"), // Where the data came from
  lastVerified: timestamp("last_verified"), // When the data was last verified against sources
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  brandIdx: index("running_shoes_brand_idx").on(table.brand),
  categoryIdx: index("running_shoes_category_idx").on(table.category),
  slugIdx: index("running_shoes_slug_idx").on(table.slug),
  seriesIdx: index("running_shoes_series_idx").on(table.seriesName),
}));

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyHash: text("key_hash").notNull(), // bcrypt hash of the API key
  keyHint: text("key_hint").notNull(), // last 4 chars for identification (e.g., "...a1b2")
  name: text("name").notNull(),
  scopes: text("scopes").array().notNull(), // ["activities", "insights", "training_plans", "goals"]
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("api_keys_user_id_idx").on(table.userId),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull(), // bcrypt hash of the refresh token
  deviceName: text("device_name"), // e.g., "iPhone 15 Pro", "iPad Air"
  deviceId: text("device_id"), // unique device identifier
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
  tokenHashIdx: index("refresh_tokens_token_hash_idx").on(table.tokenHash),
}));

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

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  currentProgress: true,
});

export const insertPerformanceLogSchema = createInsertSchema(performanceLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAIConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertRunningShoeSchema = createInsertSchema(runningShoes).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  isActive: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  isRevoked: true,
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
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertPerformanceLog = z.infer<typeof insertPerformanceLogSchema>;
export type PerformanceLog = typeof performanceLogs.$inferSelect;
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIMessage = z.infer<typeof insertAIMessageSchema>;
export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertRunningShoe = z.infer<typeof insertRunningShoeSchema>;
export type RunningShoe = typeof runningShoes.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
