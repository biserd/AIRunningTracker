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
  stravaHasWriteScope: boolean("strava_has_write_scope").default(false),
  stravaBrandingEnabled: boolean("strava_branding_enabled").default(false),
  stravaBrandingTemplate: text("strava_branding_template").default("🏃 Runner Score: {score} | {insight} — Analyzed with AITracker.run"),
  unitPreference: text("unit_preference", { enum: ["km", "miles"] }).default("miles"),
  activityViewMode: text("activity_view_mode", { enum: ["story", "deep_dive"] }).default("story"),
  isAdmin: boolean("is_admin").default(false),
  // Strava sync state tracking
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status", { enum: ["idle", "running", "error"] }).default("idle"),
  syncProgress: integer("sync_progress").default(0),
  syncTotal: integer("sync_total").default(0),
  syncError: text("sync_error"),
  lastIncrementalSince: timestamp("last_incremental_since"),
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
  }).default("free"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Usage tracking for rate limits
  monthlyInsightCount: integer("monthly_insight_count").default(0),
  insightCountResetAt: timestamp("insight_count_reset_at"),
  // AI Coach Agent preferences (Premium feature)
  coachOnboardingCompleted: boolean("coach_onboarding_completed").default(false),
  coachGoal: text("coach_goal", { 
    enum: ["5k", "10k", "half_marathon", "marathon", "general_fitness"] 
  }),
  coachRaceDate: timestamp("coach_race_date"),
  coachTargetTime: text("coach_target_time"),
  coachDaysAvailable: text("coach_days_available").array(), // ["monday", "wednesday", "friday", "sunday"]
  coachWeeklyMileageCap: real("coach_weekly_mileage_cap"), // Optional max km/week
  coachTone: text("coach_tone", { 
    enum: ["gentle", "direct", "data_nerd"] 
  }).default("direct"),
  coachNotifyRecap: boolean("coach_notify_recap").default(true),
  coachNotifyWeeklySummary: boolean("coach_notify_weekly_summary").default(true),
  coachQuietHoursStart: integer("coach_quiet_hours_start"), // 0-23 hour
  coachQuietHoursEnd: integer("coach_quiet_hours_end"), // 0-23 hour
  lastCoachSyncAt: timestamp("last_coach_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailWaitlist = pgTable("email_waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  launchEmailSentAt: timestamp("launch_email_sent_at"),
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
  // New fields from Strava summary API
  elapsedTime: integer("elapsed_time"), // Total time including stops (seconds)
  workoutType: integer("workout_type"), // Strava workout type (0=default, 1=race, 2=long run, 3=workout, etc.)
  prCount: integer("pr_count").default(0), // Personal records achieved in this activity
  photoCount: integer("photo_count").default(0), // Number of photos attached
  athleteCount: integer("athlete_count").default(1), // Number of athletes (group runs)
  timezone: text("timezone"), // Activity timezone
  gearId: text("gear_id"), // Strava gear ID (for shoe tracking)
  elevHigh: real("elev_high"), // Highest elevation point (meters)
  elevLow: real("elev_low"), // Lowest elevation point (meters)
  // Hydration tracking - for streams/laps lazy loading
  hydrationStatus: text("hydration_status", { 
    enum: ["none", "pending", "partial", "complete", "not_available", "failed"] 
  }).default("none"),
  hydrationMissing: json("hydration_missing").$type<{ streams?: boolean; laps?: boolean; detail?: boolean }>(),
  hydratedAt: timestamp("hydrated_at"),
  hydrateAttempts: integer("hydrate_attempts").default(0),
  lastHydrateError: text("last_hydrate_error"),
  cachedGrade: text("cached_grade", { enum: ["A", "B", "C", "D", "F"] }),
  cachedGradeUpdatedAt: timestamp("cached_grade_updated_at"),
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

// Legacy training plans - kept for backward compatibility
export const trainingPlansLegacy = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weeks: integer("weeks").notNull(),
  planData: json("plan_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============== NEW TRAINING PLAN SYSTEM ==============

// Athlete profiles - computed from Strava history
export const athleteProfiles = pgTable("athlete_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sport: text("sport", { enum: ["run", "cycle", "swim"] }).default("run").notNull(),
  // Mileage baseline
  baselineWeeklyMileageKm: real("baseline_weekly_mileage_km"),
  weeklyMileageLast12Weeks: json("weekly_mileage_last_12_weeks").$type<number[]>(),
  longestRecentRunKm: real("longest_recent_run_km"),
  avgRunsPerWeek: real("avg_runs_per_week"),
  // Pace data (min/km)
  typicalEasyPaceMin: real("typical_easy_pace_min"),
  typicalEasyPaceMax: real("typical_easy_pace_max"),
  typicalTempoPace: real("typical_tempo_pace"),
  typicalIntervalPace: real("typical_interval_pace"),
  // Heart rate
  hrZones: json("hr_zones").$type<{ zone1?: { min: number; max: number }; zone2?: { min: number; max: number }; zone3?: { min: number; max: number }; zone4?: { min: number; max: number }; zone5?: { min: number; max: number } }>(),
  maxHr: integer("max_hr"),
  restingHr: integer("resting_hr"),
  // Terrain & preferences
  avgElevationGainPerKm: real("avg_elevation_gain_per_km"),
  preferredRunDays: text("preferred_run_days").array(),
  // Constraints / flags
  injuryFlags: text("injury_flags").array(),
  maxDaysPerWeek: integer("max_days_per_week"),
  // Estimated fitness
  estimatedVdot: real("estimated_vdot"),
  estimatedRaceTimes: json("estimated_race_times").$type<{ fiveK?: string; tenK?: string; halfMarathon?: string; marathon?: string }>(),
  // Metadata
  lastComputedAt: timestamp("last_computed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSportIdx: index("athlete_profiles_user_sport_idx").on(table.userId, table.sport),
}));

// Training plans - normalized version
export const trainingPlans = pgTable("training_plans_v2", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // Goal configuration
  goalType: text("goal_type", { 
    enum: ["5k", "10k", "half_marathon", "marathon", "general_fitness"] 
  }).notNull(),
  raceDate: timestamp("race_date"),
  targetTime: text("target_time"),
  // Plan configuration
  daysPerWeek: integer("days_per_week").notNull().default(4),
  preferredLongRunDay: text("preferred_long_run_day").default("sunday"),
  preferredDays: text("preferred_days").array(),
  allowCrossTraining: boolean("allow_cross_training").default(true),
  paceBasedWorkouts: boolean("pace_based_workouts").default(true),
  // Status
  status: text("status", { 
    enum: ["draft", "active", "completed", "archived"] 
  }).default("draft"),
  // Metrics
  totalWeeks: integer("total_weeks").notNull(),
  currentWeek: integer("current_week").default(1),
  // Coach notes
  coachNotes: text("coach_notes"),
  generationPrompt: text("generation_prompt"),
  // AI enrichment tracking
  enrichmentStatus: text("enrichment_status", {
    enum: ["pending", "enriching", "complete", "partial", "failed"]
  }).default("pending"),
  enrichedWeeks: integer("enriched_weeks").default(0),
  enrichmentError: text("enrichment_error"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("training_plans_v2_user_id_idx").on(table.userId),
  statusIdx: index("training_plans_v2_status_idx").on(table.status),
}));

// Plan weeks
export const planWeeks = pgTable("plan_weeks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  // Planned totals
  plannedDistanceKm: real("planned_distance_km").notNull(),
  plannedDurationMins: integer("planned_duration_mins"),
  weekType: text("week_type", { 
    enum: ["base", "build", "peak", "recovery", "taper"] 
  }).notNull(),
  // Completed metrics
  completedDistanceKm: real("completed_distance_km").default(0),
  completedDurationMins: integer("completed_duration_mins").default(0),
  adherenceScore: real("adherence_score"),
  // Coach notes
  coachNotes: text("coach_notes"),
  wasAdjusted: boolean("was_adjusted").default(false),
  adjustmentReason: text("adjustment_reason", {
    enum: ["tired", "strong", "manual"]
  }),
  adjustedAt: timestamp("adjusted_at"),
  enriched: boolean("enriched").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  planIdIdx: index("plan_weeks_plan_id_idx").on(table.planId),
  weekStartIdx: index("plan_weeks_week_start_idx").on(table.weekStartDate),
}));

// Plan days - individual workouts
export const planDays = pgTable("plan_days", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull(),
  planId: integer("plan_id").notNull(),
  date: timestamp("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  // Workout details
  workoutType: text("workout_type", { 
    enum: ["easy", "tempo", "intervals", "long_run", "recovery", "rest", "cross_training", "race", "fartlek", "hills", "progression"] 
  }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // Planned metrics
  plannedDistanceKm: real("planned_distance_km"),
  plannedDurationMins: integer("planned_duration_mins"),
  targetPace: text("target_pace"),
  targetHrZone: text("target_hr_zone"),
  intensity: text("intensity", { enum: ["low", "moderate", "high"] }).default("low"),
  // Structure for intervals/tempo
  workoutStructure: json("workout_structure").$type<{ warmup?: string; main?: string; cooldown?: string; intervals?: { reps: number; distance: string; pace: string; rest: string }[] }>(),
  // Completion status
  status: text("status", { 
    enum: ["pending", "completed", "partial", "missed", "skipped"] 
  }).default("pending"),
  linkedActivityId: integer("linked_activity_id"),
  // Actual metrics
  actualDistanceKm: real("actual_distance_km"),
  actualDurationMins: integer("actual_duration_mins"),
  actualPace: text("actual_pace"),
  // User feedback
  userNotes: text("user_notes"),
  perceivedEffort: integer("perceived_effort"),
  // Adjustment tracking
  wasAdjusted: boolean("was_adjusted").default(false),
  originalWorkoutType: text("original_workout_type"),
  originalDistanceKm: real("original_distance_km"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  weekIdIdx: index("plan_days_week_id_idx").on(table.weekId),
  planIdIdx: index("plan_days_plan_id_idx").on(table.planId),
  dateIdx: index("plan_days_date_idx").on(table.date),
  linkedActivityIdx: index("plan_days_linked_activity_idx").on(table.linkedActivityId),
}));

// Workout cache - stores AI-generated workout content by fingerprint
export const workoutCache = pgTable("workout_cache", {
  id: serial("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  goalType: text("goal_type").notNull(),
  workoutType: text("workout_type").notNull(),
  qualityLevel: integer("quality_level").notNull(),
  weekType: text("week_type").notNull(),
  distanceBucket: integer("distance_bucket").notNull(),
  vdotBucket: integer("vdot_bucket"),
  title: text("title").notNull(),
  descriptionTemplate: text("description_template").notNull(),
  mainSetTemplate: text("main_set_template").notNull(),
  intervalsTemplate: json("intervals_template").$type<{ reps: number; distance: string; paceMultiplier: number; rest: string }[]>(),
  intensity: text("intensity", { enum: ["moderate", "high"] }).notNull(),
  hitCount: integer("hit_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
}, (table) => ({
  fingerprintIdx: index("workout_cache_fingerprint_idx").on(table.fingerprint),
  goalTypeIdx: index("workout_cache_goal_type_idx").on(table.goalType, table.workoutType),
}));

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
  feedback: text("feedback", { enum: ["positive", "negative"] }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdIdx: index("ai_messages_conversation_id_idx").on(table.conversationId),
  createdAtIdx: index("ai_messages_created_at_idx").on(table.createdAt),
}));

// ============== AI COACH AGENT TABLES ==============

// Coach recaps - post-activity coaching outputs
export const coachRecaps = pgTable("coach_recaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  activityId: integer("activity_id").notNull(),
  stravaActivityId: text("strava_activity_id").notNull(),
  // Coaching outputs
  recapBullets: json("recap_bullets").$type<string[]>().notNull(), // 3-6 bullet summary
  coachingCue: text("coaching_cue").notNull(), // Single focus item for next run
  nextStep: text("next_step", { 
    enum: ["rest", "easy", "workout", "long_run", "recovery"] 
  }).notNull(),
  nextStepRationale: text("next_step_rationale").notNull(), // Why this next step
  confidenceFlags: json("confidence_flags").$type<string[]>(), // e.g., ["low_confidence_no_hr", "missing_pace_data"]
  // Activity context snapshot
  activityName: text("activity_name").notNull(),
  activityDate: timestamp("activity_date").notNull(),
  distanceKm: real("distance_km").notNull(),
  durationMins: integer("duration_mins").notNull(),
  // Coach tone used
  coachTone: text("coach_tone", { 
    enum: ["gentle", "direct", "data_nerd"] 
  }).notNull(),
  // Adherence matching
  linkedPlanDayId: integer("linked_plan_day_id"),
  adherenceNote: text("adherence_note"), // e.g., "planned easy, did tempo"
  // Versioning for audit
  promptVersion: text("prompt_version").notNull(),
  modelVersion: text("model_version").notNull(),
  // Status
  notificationSent: boolean("notification_sent").default(false),
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("coach_recaps_user_id_idx").on(table.userId),
  activityIdIdx: index("coach_recaps_activity_id_idx").on(table.activityId),
  userActivityIdx: index("coach_recaps_user_activity_idx").on(table.userId, table.activityId),
  createdAtIdx: index("coach_recaps_created_at_idx").on(table.createdAt),
}));

// Agent runs - audit log for every coach interaction
export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  runType: text("run_type", { 
    enum: ["activity_recap", "weekly_summary", "plan_adjustment", "manual_chat"] 
  }).notNull(),
  // Trigger info
  triggeredBy: text("triggered_by", { 
    enum: ["sync", "app_open", "scheduled", "manual"] 
  }).notNull(),
  activityId: integer("activity_id"), // For activity-triggered runs
  // Deduplication key
  dedupeKey: text("dedupe_key").notNull().unique(), // e.g., "recap:user_123:activity_456:v1.0"
  // Pipeline stages
  status: text("status", { 
    enum: ["pending", "running", "completed", "failed", "skipped"] 
  }).default("pending"),
  stagesCompleted: json("stages_completed").$type<string[]>(), // ["fetch", "metrics", "coaching", "persist", "notify"]
  // Inputs snapshot (for debugging)
  inputSnapshot: json("input_snapshot").$type<Record<string, unknown>>(),
  // Outputs
  outputRecapId: integer("output_recap_id"),
  outputNotificationIds: json("output_notification_ids").$type<number[]>(),
  // Versioning
  promptVersion: text("prompt_version"),
  metricsVersion: text("metrics_version"),
  // Performance
  durationMs: integer("duration_ms"),
  tokensUsed: integer("tokens_used"),
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("agent_runs_user_id_idx").on(table.userId),
  dedupeKeyIdx: index("agent_runs_dedupe_key_idx").on(table.dedupeKey),
  statusIdx: index("agent_runs_status_idx").on(table.status),
  createdAtIdx: index("agent_runs_created_at_idx").on(table.createdAt),
}));

// Notification outbox - reliable delivery pattern
export const notificationOutbox = pgTable("notification_outbox", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // Notification type
  type: text("type", { 
    enum: ["activity_recap", "next_step", "weekly_summary", "plan_reminder", "trial_reminder", "trial_expired"] 
  }).notNull(),
  channel: text("channel", { 
    enum: ["in_app", "email", "push"] 
  }).notNull(),
  // Content
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: json("data").$type<Record<string, unknown>>(), // Additional data for rendering
  // Scheduling
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  // Delivery status
  status: text("status", { 
    enum: ["pending", "sent", "failed", "cancelled"] 
  }).default("pending"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  // Deduplication
  dedupeKey: text("dedupe_key"), // e.g., "recap:user_123:activity_456"
  // User preferences check
  respectQuietHours: boolean("respect_quiet_hours").default(true),
  // Read tracking for in-app notifications
  readAt: timestamp("read_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("notification_outbox_user_id_idx").on(table.userId),
  statusIdx: index("notification_outbox_status_idx").on(table.status),
  scheduledForIdx: index("notification_outbox_scheduled_for_idx").on(table.scheduledFor),
  dedupeKeyIdx: index("notification_outbox_dedupe_key_idx").on(table.dedupeKey),
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

// Route clustering and comparison tables
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  routeKey: text("route_key").notNull(), // Hash of start/end cells + path cells
  name: text("name"), // Auto-generated or user-provided name
  startGeohash: text("start_geohash").notNull(), // Geohash of start point
  endGeohash: text("end_geohash").notNull(), // Geohash of end point
  pathCells: text("path_cells").array(), // Array of geohash cells along the route
  representativePolyline: text("representative_polyline"), // Best polyline for display
  avgDistance: real("avg_distance"), // Average distance of runs on this route (meters)
  avgElevationGain: real("avg_elevation_gain"), // Average elevation gain (meters)
  runCount: integer("run_count").default(0), // Number of activities on this route
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("routes_user_id_idx").on(table.userId),
  routeKeyIdx: index("routes_route_key_idx").on(table.routeKey),
}));

export const activityRouteMap = pgTable("activity_route_map", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  routeId: integer("route_id").notNull(),
  matchConfidence: real("match_confidence").default(1.0), // 0-1 confidence in route match
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activityIdIdx: index("activity_route_map_activity_id_idx").on(table.activityId),
  routeIdIdx: index("activity_route_map_route_id_idx").on(table.routeId),
}));

export const activityFeatures = pgTable("activity_features", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  // Efficiency metrics
  aerobicDecoupling: real("aerobic_decoupling"), // HR drift percentage
  paceAtHrEfficiency: real("pace_at_hr_efficiency"), // Pace per HR unit
  pacingStability: real("pacing_stability"), // 0-100 score
  cadenceVariability: real("cadence_variability"), // CV of cadence
  powerVariability: real("power_variability"), // CV of power
  // Quality metrics
  qualityScore: real("quality_score"), // 0-100 overall data quality
  qualityFlags: json("quality_flags").$type<string[]>(), // Array of quality issues
  // Classification
  runType: text("run_type"), // easy, tempo, interval, long_run, race, recovery
  effortBucket: text("effort_bucket"), // low, moderate, high, max
  // Computed at
  computedAt: timestamp("computed_at").defaultNow(),
}, (table) => ({
  activityIdIdx: index("activity_features_activity_id_idx").on(table.activityId),
  userIdIdx: index("activity_features_user_id_idx").on(table.userId),
}));

export const similarRunsCache = pgTable("similar_runs_cache", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  similarActivityIds: json("similar_activity_ids").$type<number[]>().notNull(), // Top N similar activity IDs
  similarityScores: json("similarity_scores").$type<number[]>().notNull(), // Corresponding scores
  // Baseline metrics (median of comparable set)
  baselinePace: real("baseline_pace"), // m/s
  baselineHr: real("baseline_hr"),
  baselineDrift: real("baseline_drift"),
  baselinePacingStability: real("baseline_pacing_stability"),
  // Deltas vs baseline
  paceVsBaseline: real("pace_vs_baseline"), // % difference
  hrVsBaseline: real("hr_vs_baseline"),
  driftVsBaseline: real("drift_vs_baseline"),
  pacingVsBaseline: real("pacing_vs_baseline"),
  // Cache metadata
  computedAt: timestamp("computed_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  activityIdIdx: index("similar_runs_cache_activity_id_idx").on(table.activityId),
  userIdIdx: index("similar_runs_cache_user_id_idx").on(table.userId),
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

// New training plan system schemas
export const insertAthleteProfileSchema = createInsertSchema(athleteProfiles).omit({
  id: true,
  createdAt: true,
  lastComputedAt: true,
});

export const insertPlanWeekSchema = createInsertSchema(planWeeks).omit({
  id: true,
  createdAt: true,
  completedDistanceKm: true,
  completedDurationMins: true,
  adherenceScore: true,
  wasAdjusted: true,
  adjustedAt: true,
});

export const insertPlanDaySchema = createInsertSchema(planDays).omit({
  id: true,
  createdAt: true,
  status: true,
  linkedActivityId: true,
  actualDistanceKm: true,
  actualDurationMins: true,
  actualPace: true,
});

export const insertWorkoutCacheSchema = createInsertSchema(workoutCache).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  hitCount: true,
});

// Route and comparison schemas
export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  runCount: true,
});

export const insertActivityRouteMapSchema = createInsertSchema(activityRouteMap).omit({
  id: true,
  createdAt: true,
});

export const insertActivityFeaturesSchema = createInsertSchema(activityFeatures).omit({
  id: true,
  computedAt: true,
});

export const insertSimilarRunsCacheSchema = createInsertSchema(similarRunsCache).omit({
  id: true,
  computedAt: true,
});

// AI Coach Agent schemas
export const insertCoachRecapSchema = createInsertSchema(coachRecaps).omit({
  id: true,
  createdAt: true,
  notificationSent: true,
  viewedAt: true,
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
  status: true,
  retryCount: true,
});

export const insertNotificationOutboxSchema = createInsertSchema(notificationOutbox).omit({
  id: true,
  createdAt: true,
  status: true,
  sentAt: true,
  retryCount: true,
});

// Coach preferences update schema (for user settings)
export const updateCoachPreferencesSchema = z.object({
  coachGoal: z.enum(["5k", "10k", "half_marathon", "marathon", "general_fitness"]).optional(),
  coachRaceDate: z.string().datetime().optional().nullable(),
  coachTargetTime: z.string().optional().nullable(),
  coachDaysAvailable: z.array(z.string()).optional(),
  coachWeeklyMileageCap: z.number().positive().optional().nullable(),
  coachTone: z.enum(["gentle", "direct", "data_nerd"]).optional(),
  coachNotifyRecap: z.boolean().optional(),
  coachNotifyWeeklySummary: z.boolean().optional(),
  coachQuietHoursStart: z.number().min(0).max(23).optional().nullable(),
  coachQuietHoursEnd: z.number().min(0).max(23).optional().nullable(),
  coachOnboardingCompleted: z.boolean().optional(),
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
export type InsertAthleteProfile = z.infer<typeof insertAthleteProfileSchema>;
export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type InsertPlanWeek = z.infer<typeof insertPlanWeekSchema>;
export type PlanWeek = typeof planWeeks.$inferSelect;
export type InsertPlanDay = z.infer<typeof insertPlanDaySchema>;
export type PlanDay = typeof planDays.$inferSelect;
export type InsertWorkoutCache = z.infer<typeof insertWorkoutCacheSchema>;
export type WorkoutCache = typeof workoutCache.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertActivityRouteMap = z.infer<typeof insertActivityRouteMapSchema>;
export type ActivityRouteMap = typeof activityRouteMap.$inferSelect;
export type InsertActivityFeatures = z.infer<typeof insertActivityFeaturesSchema>;
export type ActivityFeatures = typeof activityFeatures.$inferSelect;
export type InsertSimilarRunsCache = z.infer<typeof insertSimilarRunsCacheSchema>;
export type SimilarRunsCache = typeof similarRunsCache.$inferSelect;
export type InsertCoachRecap = z.infer<typeof insertCoachRecapSchema>;
export type CoachRecap = typeof coachRecaps.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertNotificationOutbox = z.infer<typeof insertNotificationOutboxSchema>;
export type NotificationOutbox = typeof notificationOutbox.$inferSelect;
export type UpdateCoachPreferences = z.infer<typeof updateCoachPreferencesSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
