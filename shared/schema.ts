import { pgTable, text, serial, integer, boolean, real, timestamp, json, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const GOAL_TYPES = ["5k", "10k", "half_marathon", "marathon", "50k", "50_mile", "100k", "100_mile", "general_fitness"] as const;
export type GoalType = typeof GOAL_TYPES[number];

export const PHASE_TYPES = ["base", "build", "build2_specific", "peak", "taper", "recovery"] as const;
export type PhaseType = typeof PHASE_TYPES[number];

export const TERRAIN_TYPES = ["road", "trail", "mountain"] as const;
export type TerrainType = typeof TERRAIN_TYPES[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username").unique(),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaAthleteId: text("strava_athlete_id"),
  stravaConnected: boolean("strava_connected").default(false),
  stravaHasWriteScope: boolean("strava_has_write_scope").default(false),
  stravaBrandingEnabled: boolean("strava_branding_enabled").default(false),
  stravaBrandingTemplate: text("strava_branding_template").default("ğŸƒ Runner Score: {score} | {insight} â€” Analyzed with RunAnalytics"),
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
  // Free accounts are paused after 30 days without an app visit. While
  // paused, Strava webhook activities are acknowledged but not fetched,
  // stored, analyzed, or emailed. Paid and trial accounts are exempt.
  stravaWebhookPausedAt: timestamp("strava_webhook_paused_at"),
  dormancyNoticeSentAt: timestamp("dormancy_notice_sent_at"),
  // Set true when a free user upgrades to a paid plan (trial or active) so the
  // next time they load the app we automatically backfill their full Strava
  // history beyond the original 20-activity free-tier cap.
  needsHistoricalBackfill: boolean("needs_historical_backfill").default(false),
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
    enum: [...GOAL_TYPES] 
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
  notifyPostRun: boolean("notify_post_run").default(true),
  postRunEmailFrequency: text("post_run_email_frequency", {
    enum: ["every_run", "weekly"]
  }).default("every_run"),
  lastPostRunEmailAt: timestamp("last_post_run_email_at"),
  coachQuietHoursStart: integer("coach_quiet_hours_start"), // 0-23 hour
  coachQuietHoursEnd: integer("coach_quiet_hours_end"), // 0-23 hour
  coachEnabled: boolean("coach_enabled").default(true),
  coachTimezone: text("coach_timezone").default("UTC"),
  coachDailyBriefingEnabled: boolean("coach_daily_briefing_enabled").default(true),
  coachDailyBriefingHour: integer("coach_daily_briefing_hour").default(7),
  coachWeatherEnabled: boolean("coach_weather_enabled").default(false),
  coachWeatherLocation: jsonb("coach_weather_location").$type<{
    label: string;
    latitude: number;
    longitude: number;
  }>(),
  coachPreferredChannel: text("coach_preferred_channel", {
    enum: ["email", "push", "in_app"]
  }).default("email"),
  coachSnoozedUntil: timestamp("coach_snoozed_until"),
  coachDailyAvailability: text("coach_daily_availability", {
    enum: ["available", "limited", "unavailable"]
  }),
  coachDailyAvailabilityDate: text("coach_daily_availability_date"),
  lastCoachSyncAt: timestamp("last_coach_sync_at"),
  // Recovery state caching (24hr TTL, invalidated on sync)
  cachedRecoveryState: jsonb("cached_recovery_state"),
  recoveryCalculatedAt: timestamp("recovery_calculated_at"),
  // Lifecycle/drip campaign tracking
  activationAt: timestamp("activation_at"), // When user first hits aha moment (snapshot/story/coach)
  lastSeenAt: timestamp("last_seen_at"), // Last app interaction
  marketingOptOut: boolean("marketing_opt_out").default(false), // User opted out of lifecycle emails
  coachQuestionsCount7d: integer("coach_questions_count_7d").default(0), // Rolling 7-day coach question count
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"), // When the welcome campaign email was sent
  onboardingGoal: text("onboarding_goal", { 
    enum: ["race", "faster", "endurance", "injury_free"] 
  }),
  onboardingStruggle: text("onboarding_struggle", { 
    enum: ["plateau", "burnout", "inconsistency", "guesswork"] 
  }),
  onboardingDays: text("onboarding_days", { 
    enum: ["3", "4", "5+"] 
  }),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  // One-time Premium Preview generated after the user's first successful
  // Strava sync. Small JSON payload (two findings, one next action, source
  // data). Written exactly once via a compare-and-set update.
  premiumPreview: jsonb("premium_preview"),
  premiumPreviewCreatedAt: timestamp("premium_preview_created_at"),
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
  // True when the activity was ingested via webhook for a free-tier user.
  // The activity is stored for training-context accuracy, but hidden from
  // the activities list / dashboard and rendered behind a blur + upgrade
  // CTA on the detail page. Cleared (logically ignored) once the user upgrades.
  lockedForFree: boolean("locked_for_free").default(false),
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
    enum: [...GOAL_TYPES] 
  }).notNull(),
  raceDate: timestamp("race_date"),
  targetTime: text("target_time"),
  terrainType: text("terrain_type", {
    enum: [...TERRAIN_TYPES]
  }).default("road"),
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
  generationPrompt: te×]ùŞÚ$z{-®éÜj×'Ev÷&¶÷WD66†U66†VÖÒ7&VFT–ç6W'E66†VÖ‡v÷&¶÷WD66†R’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢Æ7EW6VDC¢G'VRÀĞ¢†—D6÷VçC¢G'VRÀĞ§Ò“°Ğ Ğ¢òò&÷WFRæB6ö×&—6öâ66†VÖ0Ğ¦W‡÷'B6öç7B–ç6W'E&÷WFU66†VÖÒ7&VFT–ç6W'E66†VÖ‡&÷WFW2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢'Vä6÷VçC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'D7F—f—G•&÷WFTÖ66†VÖÒ7&VFT–ç6W'E66†VÖ†7F—f—G•&÷WFTÖ’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'D7F—f—G”fVGW&W566†VÖÒ7&VFT–ç6W'E66†VÖ†7F—f—G”fVGW&W2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢6ö×WFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'E6–Ö–Æ%'Vç466†U66†VÖÒ7&VFT–ç6W'E66†VÖ‡6–Ö–Æ%'Vç466†R’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢6ö×WFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¢òò’6ö6‚vVçB66†VÖ0Ğ¦W‡÷'B6öç7B–ç6W'D6ö6…&V666†VÖÒ7&VFT–ç6W'E66†VÖ†6ö6…&V62’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢æ÷F–f–6F–öå6VçC¢G'VRÀĞ¢f–WvVDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'DvVçE'Vå66†VÖÒ7&VFT–ç6W'E66†VÖ†vVçE'Vç2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢&WG'”6÷VçC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'Dæ÷F–f–6F–öä÷WF&÷…66†VÖÒ7&VFT–ç6W'E66†VÖ†æ÷F–f–6F–öä÷WF&÷‚’æöÖ—B‡°¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢7FGW3¢G'VRÀĞ¢6VçDC¢G'VRÀĞ¢&WG'”6÷VçC¢G'VRÀ¢&ö6W76–æu7F'FVDC¢G'VRÀ§Ò“° Ğ¢òòW6‚7V'67&—F–öç2Òf÷"vV"W6‚…t’âæF—fRÖö&–ÆRW6‚v–ÆÂ&RFFVBv—F‚F†RW‡òàĞ¦W‡÷'B6öç7BW6…7V'67&—F–öç2ÒuF&ÆR‚'W6…÷7V'67&—F–öç2"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢W6W$–C¢–çFVvW"‚'W6W%ö–B"’ææ÷DçVÆÂ‚’ÀĞ¢ÆFf÷&Ó¢FW‡B‚'ÆFf÷&Ò"Â²VçVÓ¢²'vV""Â&–÷2"Â&æG&ö–B%ÒÒ’ææ÷DçVÆÂ‚’æFVfVÇB‚'vV""’ÀĞ¢òòvV"W6‚f–VÆG0Ğ¢VæGö–çC¢FW‡B‚&VæGö–çB"’ÀĞ¢#SfFƒ¢FW‡B‚'#SfF‚"’ÀĞ¢WFƒ¢FW‡B‚&WF‚"’ÀĞ¢òòæF—fRW6‚Fö¶Vâ‡&W6W'fVBf÷"gWGW&RW‡òç2ôd4Ò–çFVw&F–öâĞ¢æF—fUFö¶Vã¢FW‡B‚&æF—fU÷Fö¶Vâ"’ÀĞ¢òòÖWFFFĞ¢W6W$vVçC¢FW‡B‚'W6W%övVçB"’ÀĞ¢Væ&ÆVC¢&ööÆVâ‚&Væ&ÆVB"’æFVfVÇB‡G'VR’ÀĞ¢Æ7EW6VDC¢F–ÖW7F×‚&Æ7E÷W6VEöB"’ÀĞ¢7&VFVDC¢F–ÖW7F×‚&7&VFVEöB"’æFVfVÇDæ÷r‚’ÀĞ§ÒÂ‡F&ÆR’Óâ‡°Ğ¢W6W$–D–Gƒ¢–æFW‚‚'W6…÷7V'67&—F–öç5÷W6W%ö–Eö–G‚"’æöâ‡F&ÆRçW6W$–B’ÀĞ¢VæGö–çD–Gƒ¢–æFW‚‚'W6…÷7V'67&—F–öç5öVæGö–çEö–G‚"’æöâ‡F&ÆRæVæGö–çB’ÀĞ¢æF—fUFö¶Vä–Gƒ¢–æFW‚‚'W6…÷7V'67&—F–öç5öæF—fU÷Fö¶Våö–G‚"’æöâ‡F&ÆRææF—fUFö¶Vâ’ÀĞ§Ò’“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'EW6…7V'67&—F–öå66†VÖÒ7&VFT–ç6W'E66†VÖ‡W6…7V'67&—F–öç2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢Æ7EW6VDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'BG—R–ç6W'EW6…7V'67&—F–öâÒ¢æ–æfW#ÇG—Vöb–ç6W'EW6…7V'67&—F–öå66†VÖã°Ğ¦W‡÷'BG—RW6…7V'67&—F–öâÒG—VöbW6…7V'67&—F–öç2âF–æfW%6VÆV7C°Ğ Ğ¢òò6ö6‚&VfW&Væ6W2WFFR66†VÖ†f÷"W6W"6WGF–æw2Ğ¦W‡÷'B6öç7BWFFT6ö6…&VfW&Væ6W566†VÖÒ¢æö&¦V7B‡°¢6ö6„vöÃ¢¢æVçVÒ„tôÅõE•U2’æ÷F–öæÂ‚’ÀĞ¢6ö6…&6TFFS¢¢ç7G&–ær‚’æFFWF–ÖR‚’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’ÀĞ¢6ö6…F&vWEF–ÖS¢¢ç7G&–ær‚’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’ÀĞ¢6ö6„F—4f–Æ&ÆS¢¢æ'&’‡¢ç7G&–ær‚’’æ÷F–öæÂ‚’ÀĞ¢6ö6…vVV¶Ç”Ö–ÆVvT6¢¢æçVÖ&W"‚’ç÷6—F—fR‚’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’ÀĞ¢6ö6…FöæS¢¢æVçVÒ…²&vVçFÆR"Â&F—&V7B"Â&FFöæW&B%Ò’æ÷F–öæÂ‚’ÀĞ¢6ö6„æ÷F–g•&V6¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’ÀĞ¢6ö6„æ÷F–g•vVV¶Ç•7VÖÖ'“¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’ÀĞ¢6ö6…V–WD†÷W'57F'C¢¢æçVÖ&W"‚’æÖ–âƒ’æÖ‚ƒ#2’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’ÀĞ¢6ö6…V–WD†÷W'4VæC¢¢æçVÖ&W"‚’æÖ–âƒ’æÖ‚ƒ#2’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’À¢6ö6„Væ&ÆVC¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’À¢6ö6…F–ÖW¦öæS¢¢ç7G&–ær‚’æÖ–âƒ’æÖ‚ƒ’æ÷F–öæÂ‚’À¢6ö6„F–Ç”'&–Vf–ætVæ&ÆVC¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’À¢6ö6„F–Ç”'&–Vf–æt†÷W#¢¢æçVÖ&W"‚’æ–çB‚’æÖ–âƒ’æÖ‚ƒ#2’æ÷F–öæÂ‚’À¢6ö6…vVF†W$Væ&ÆVC¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’À¢6ö6…vVF†W$Æö6F–öã¢¢æö&¦V7B‡°¢Æ&VÃ¢¢ç7G&–ær‚’æÖ–âƒ’æÖ‚ƒ#’À¢ÆF—GVFS¢¢æçVÖ&W"‚’æÖ–â‚Ó“’æÖ‚ƒ“’À¢Æöæv—GVFS¢¢æçVÖ&W"‚’æÖ–â‚Óƒ’æÖ‚ƒƒ’À¢Ò’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’À¢6ö6…&VfW'&VD6†ææVÃ¢¢æVçVÒ…²&VÖ–Â"Â'W6‚"Â&–åö%Ò’æ÷F–öæÂ‚’À¢6ö6…6æö÷¦VEVçF–Ã¢¢ç7G&–ær‚’æFFWF–ÖR‚’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’À¢6ö6„F–Ç”f–Æ&–Æ—G“¢¢æVçVÒ…²&f–Æ&ÆR"Â&Æ–Ö—FVB"Â'Væf–Æ&ÆR%Ò’æ÷F–öæÂ‚’æçVÆÆ&ÆR‚’À¢6ö6„öæ&ö&F–æt6ö×ÆWFVC¢¢æ&ööÆVâ‚’æ÷F–öæÂ‚’À§Ò“° Ğ¢òòFVÆWF–öâfVVF&6²F&ÆRÒG&6·2v‡’W6W'2FVÆWFRF†V—"66÷VçG0Ğ¦W‡÷'B6öç7BFVÆWF–öäfVVF&6²ÒuF&ÆR‚&FVÆWF–öåöfVVF&6²"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢W6W$–C¢–çFVvW"‚'W6W%ö–B"’ÂòòçVÆÆ&ÆR6–æ6RW6W"v–ÆÂ&RFVÆWFV@Ğ¢W6W$VÖ–Ã¢FW‡B‚'W6W%öVÖ–Â"’ÂòòçVÆÆ&ÆRf÷"7G&fÖöæÇ’W6W'2v—F‚æòVÖ–ÀĞ¢&V6öã¢FW‡B‚'&V6öâ"Â² Ğ¢VçVÓ¢²'FöõöW‡Vç6—fR"Â&æ÷E÷W6–ær"Â&Ö—76–æuöfVGW&W2"Â&f÷VæEöÇFW&æF—fR"Â'FV6†æ–6Åö—77VW2"Â'&—f7•ö6öæ6W&ç2"Â&÷F†W"%Ò Ğ¢Ò’ææ÷DçVÆÂ‚’ÀĞ¢FWF–Ç3¢FW‡B‚&FWF–Ç2"’Âòò÷F–öæÂFF—F–öæÂFWF–Ç0Ğ¢v5&WF–æVC¢&ööÆVâ‚'v5÷&WF–æVB"’æFVfVÇB†fÇ6R’ÂòòF–BF†W’7F’gFW"6VV–ær&WFVçF–öâöffW#ğĞ¢7V'67&—F–öåÆã¢FW‡B‚'7V'67&—F–öå÷Æâ"’Âòòv†BÆâvW&RF†W’öãğĞ¢66÷VçDvT–äF—3¢–çFVvW"‚&66÷VçEövUö–åöF—2"’Âòò†÷rÆöærvW&RF†W’W6W#ğĞ¢7&VFVDC¢F–ÖW7F×‚&7&VFVEöB"’æFVfVÇDæ÷r‚’ÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'DFVÆWF–öäfVVF&6µ66†VÖÒ7&VFT–ç6W'E66†VÖ†FVÆWF–öäfVVF&6²’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÒE$•4Õ”tâ5•5DTÒÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¢òòW6W"6×–vç2ÒG&6·2v†–6‚6×–vâW6W"—2–âæBF†V—"&öw&W70Ğ¦W‡÷'B6öç7BW6W$6×–vç2ÒuF&ÆR‚'W6W%ö6×–vç2"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢W6W$–C¢–çFVvW"‚'W6W%ö–B"’ææ÷DçVÆÂ‚’ÀĞ¢6×–vã¢FW‡B‚&6×–vâ"Â² Ğ¢VçVÓ¢²'6VvÖVçEö"Â'6VvÖVçEö""Â'6VvÖVçEö2"Â'6VvÖVçEöB%Ò Ğ¢Ò’ææ÷DçVÆÂ‚’ÀĞ¢7FFS¢FW‡B‚'7FFR"Â² Ğ¢VçVÓ¢²&7F—fR"Â&6ö×ÆWFVB"Â&W†—FVB"Â&6æ6VÆÆVB%Ò Ğ¢Ò’æFVfVÇB‚&7F—fR"’ÀĞ¢7W'&VçE7FW¢–çFVvW"‚&7W'&VçE÷7FW"’æFVfVÇBƒ’ÂòòÓÂ#Ó"Â#ÓÂ##Ó"ÂWF2àĞ¢VçFW&VDC¢F–ÖW7F×‚&VçFW&VEöB"’æFVfVÇDæ÷r‚’ÀĞ¢W†—FVDC¢F–ÖW7F×‚&W†—FVEöB"’ÀĞ¢W†—E&V6öã¢FW‡B‚&W†—E÷&V6öâ"’Âòò&6öçfW'FVB"Â'7V'67&–&VB"Â'Vç7V'67&–&VB"Â&6ö×ÆWFVB"Â'6VvÖVçEö6†ævR Ğ¢Æ7DVÖ–Å6VçDC¢F–ÖW7F×‚&Æ7EöVÖ–Å÷6VçEöB"’ÀĞ¢WFFVDC¢F–ÖW7F×‚'WFFVEöB"’æFVfVÇDæ÷r‚’ÀĞ§ÒÂ‡F&ÆR’Óâ‡°Ğ¢W6W$–D–Gƒ¢–æFW‚‚'W6W%ö6×–vç5÷W6W%ö–Eö–G‚"’æöâ‡F&ÆRçW6W$–B’ÀĞ¢6×–vä–Gƒ¢–æFW‚‚'W6W%ö6×–vç5ö6×–våö–G‚"’æöâ‡F&ÆRæ6×–vâ’ÀĞ¢7FFT–Gƒ¢–æFW‚‚'W6W%ö6×–vç5÷7FFUö–G‚"’æöâ‡F&ÆRç7FFR’ÀĞ¢W6W$6×–våVæ—VT–Gƒ¢–æFW‚‚'W6W%ö6×–vç5÷W6W%ö6×–vå÷Væ—VUö–G‚"’æöâ‡F&ÆRçW6W$–BÂF&ÆRæ6×–vâ’ÀĞ§Ò’“°Ğ Ğ¢òòVÖ–Â¦ö'2Ò66†VGVÆVBVÖ–Ç2v—F‚FVGWÆ–6F–öàĞ¦W‡÷'B6öç7BVÖ–Ä¦ö'2ÒuF&ÆR‚&VÖ–Åö¦ö'2"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢W6W$–C¢–çFVvW"‚'W6W%ö–B"’ææ÷DçVÆÂ‚’ÀĞ¢¦ö%G—S¢FW‡B‚&¦ö%÷G—R"Â² Ğ¢VçVÓ¢²&G&—"Â'G&ç67F–öæÂ"Â&7F—f—G•÷&VG’%Ò Ğ¢Ò’ææ÷DçVÆÂ‚’ÀĞ¢6×–vã¢FW‡B‚&6×–vâ"’Âòò6VvÖVçEöÂ6VvÖVçEö"ÂWF2àĞ¢7FW¢FW‡B‚'7FW"’ÂòòÂ"Â#Â#"ÂWF2àĞ¢66†VGVÆVDC¢F–ÖW7F×‚'66†VGVÆVEöB"’ææ÷DçVÆÂ‚’ÀĞ¢7FGW3¢FW‡B‚'7FGW2"Â² Ğ¢VçVÓ¢²'VæF–ær"Â'6VçB"Â&6æ6VÆÆVB"Â&f–ÆVB%Ò Ğ¢Ò’æFVfVÇB‚'VæF–ær"’ÀĞ¢FVGWT¶W“¢FW‡B‚&FVGWUö¶W’"’ææ÷DçVÆÂ‚’ÂòòW6W%ö–B²6×–vâ²7FW Ğ¢ÖWFFF¢§6öâ‚&ÖWFFF"’âGG—SÇ°Ğ¢7FW&Ãó¢7G&–æs°Ğ¢7F—f—G”–Có¢çVÖ&W#°Ğ¢6ö×&Tó¢çVÖ&W#°Ğ¢6ö×&T#ó¢çVÖ&W#°Ğ¢7V&¦V7Có¢7G&–æs°Ğ¢&Wf–WuFW‡Có¢7G&–æs°Ğ¢Óâ‚’ÀĞ¢6VçDC¢F–ÖW7F×‚'6VçEöB"’ÀĞ¢W'&÷$ÖW76vS¢FW‡B‚&W'&÷%öÖW76vR"’ÀĞ¢&WG'”6÷VçC¢–çFVvW"‚'&WG'•ö6÷VçB"’æFVfVÇBƒ’ÀĞ¢7&VFVDC¢F–ÖW7F×‚&7&VFVEöB"’æFVfVÇDæ÷r‚’ÀĞ§ÒÂ‡F&ÆR’Óâ‡°Ğ¢W6W$–D–Gƒ¢–æFW‚‚&VÖ–Åö¦ö'5÷W6W%ö–Eö–G‚"’æöâ‡F&ÆRçW6W$–B’ÀĞ¢7FGW4–Gƒ¢–æFW‚‚&VÖ–Åö¦ö'5÷7FGW5ö–G‚"’æöâ‡F&ÆRç7FGW2’ÀĞ¢66†VGVÆVDD–Gƒ¢–æFW‚‚&VÖ–Åö¦ö'5÷66†VGVÆVEöEö–G‚"’æöâ‡F&ÆRç66†VGVÆVDB’ÀĞ¢FVGWT¶W”–Gƒ¢–æFW‚‚&VÖ–Åö¦ö'5öFVGWUö¶W•ö–G‚"’æöâ‡F&ÆRæFVGWT¶W’’ÀĞ§Ò’“°Ğ Ğ¢òòVÖ–Â6Æ–6²G&6¶–ærÒf÷"6×–vâæÇ—F–70Ğ¦W‡÷'B6öç7BVÖ–Ä6Æ–6·2ÒuF&ÆR‚&VÖ–Åö6Æ–6·2"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢W6W$–C¢–çFVvW"‚'W6W%ö–B"’ææ÷DçVÆÂ‚’ÀĞ¢6×–vã¢FW‡B‚&6×–vâ"’ÀĞ¢7FW¢FW‡B‚'7FW"’ÀĞ¢7F¶W“¢FW‡B‚&7Fö¶W’"’Âòò&6öææV7E÷7G&f"Â'f–Wu÷6æ6†÷B"Â'Ww&FR"ÂWF2àĞ¢6Æ–6¶VDC¢F–ÖW7F×‚&6Æ–6¶VEöB"’æFVfVÇDæ÷r‚’ÀĞ¢6÷W&6S¢FW‡B‚'6÷W&6R"’Âòòg&öÒU$Â&Ò÷6÷W&6SÔ#Ğ§ÒÂ‡F&ÆR’Óâ‡°Ğ¢W6W$–D–Gƒ¢–æFW‚‚&VÖ–Åö6Æ–6·5÷W6W%ö–Eö–G‚"’æöâ‡F&ÆRçW6W$–B’ÀĞ¢6×–vå7FW–Gƒ¢–æFW‚‚&VÖ–Åö6Æ–6·5ö6×–vå÷7FWö–G‚"’æöâ‡F&ÆRæ6×–vâÂF&ÆRç7FW’ÀĞ§Ò’“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'EW6W$6×–vå66†VÖÒ7&VFT–ç6W'E66†VÖ‡W6W$6×–vç2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢VçFW&VDC¢G'VRÀĞ¢WFFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'DVÖ–Ä¦ö%66†VÖÒ7&VFT–ç6W'E66†VÖ†VÖ–Ä¦ö'2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢7&VFVDC¢G'VRÀĞ¢7FGW3¢G'VRÀĞ¢6VçDC¢G'VRÀĞ¢&WG'”6÷VçC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'DVÖ–Ä6Æ–6µ66†VÖÒ7&VFT–ç6W'E66†VÖ†VÖ–Ä6Æ–6·2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢6Æ–6¶VDC¢G'VRÀĞ§Ò“°Ğ Ğ¢òò7—7FVÒ6WGF–æw2ÒvÆö&Â¶W’×fÇVR6öæf–wW&F–öàĞ¦W‡÷'B6öç7B7—7FVÕ6WGF–æw2ÒuF&ÆR‚'7—7FVÕ÷6WGF–æw2"Â°Ğ¢¶W“¢FW‡B‚&¶W’"’ç&–Ö'”¶W’‚’ÀĞ¢fÇVS¢FW‡B‚'fÇVR"’ææ÷DçVÆÂ‚’ÀĞ¢WFFVDC¢F–ÖW7F×‚'WFFVEöB"’æFVfVÇDæ÷r‚’ÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'E7—7FVÕ6WGF–æu66†VÖÒ7&VFT–ç6W'E66†VÖ‡7—7FVÕ6WGF–æw2’æöÖ—B‡°Ğ¢WFFVDC¢G'VRÀĞ§Ò“°Ğ Ğ¦W‡÷'B6öç7B7G&fvV&†öö´Æöw2ÒuF&ÆR‚'7G&f÷vV&†ööµöÆöw2"Â°Ğ¢–C¢6W&–Â‚&–B"’ç&–Ö'”¶W’‚’ÀĞ¢WfVçD–C¢FW‡B‚&WfVçEö–B"’ÀĞ¢WfVçEG—S¢FW‡B‚&WfVçE÷G—R"’ææ÷DçVÆÂ‚’ÀĞ¢ö&¦V7EG—S¢FW‡B‚&ö&¦V7E÷G—R"’ææ÷DçVÆÂ‚’ÀĞ¢ö&¦V7D–C¢FW‡B‚&ö&¦V7Eö–B"’ææ÷DçVÆÂ‚’ÀĞ¢F†ÆWFT–C¢FW‡B‚&F†ÆWFUö–B"’ææ÷DçVÆÂ‚’ÀĞ¢7V'67&—F–öä–C¢–çFVvW"‚'7V'67&—F–öåö–B"’ÀĞ¢7FGW3¢FW‡B‚'7FGW2"’ææ÷DçVÆÂ‚’æFVfVÇB‚'&V6V—fVB"’ÀĞ¢W'&÷$ÖW76vS¢FW‡B‚&W'&÷%öÖW76vR"’ÀĞ¢&u–ÆöC¢FW‡B‚'&u÷–ÆöB"’ÀĞ¢&V6V—fVDC¢F–ÖW7F×‚'&V6V—fVEöB"’æFVfVÇDæ÷r‚’ÀĞ¢&ö6W76VDC¢F–ÖW7F×‚'&ö6W76VEöB"’ÀĞ§ÒÂ‡F&ÆR’Óâ‡°Ğ¢F†ÆWFT–Gƒ¢–æFW‚‚'7G&f÷v…öÆöw5öF†ÆWFUö–G‚"’æöâ‡F&ÆRæF†ÆWFT–B’ÀĞ¢7FGW4–Gƒ¢–æFW‚‚'7G&f÷v…öÆöw5÷7FGW5ö–G‚"’æöâ‡F&ÆRç7FGW2’ÀĞ¢&V6V—fVD–Gƒ¢–æFW‚‚'7G&f÷v…öÆöw5÷&V6V—fVEö–G‚"’æöâ‡F&ÆRç&V6V—fVDB’ÀĞ§Ò’“°Ğ Ğ¦W‡÷'B6öç7B–ç6W'E7G&fvV&†öö´Æöu66†VÖÒ7&VFT–ç6W'E66†VÖ‡7G&fvV&†öö´Æöw2’æöÖ—B‡°Ğ¢–C¢G'VRÀĞ¢&V6V—fVDC¢G'VRÀĞ¢&ö6W76VDC¢G'VRÀĞ§Ò“°Ğ Ğ¢òòÆöv–â66†VÖf÷"WF†VçF–6F–öàĞ¦W‡÷'B6öç7BÆöv–å66†VÖÒ¢æö&¦V7B‡°Ğ¢VÖ–Ã¢¢ç7G&–ær‚’æVÖ–Â‚$–çfÆ–BVÖ–ÂFG&W72"’ÀĞ¢77v÷&C¢¢ç7G&–ær‚’æÖ–âƒbÂ%77v÷&B×W7B&RBÆV7Bb6†&7FW'2"’ÀĞ§Ò“°Ğ Ğ¢òò&Vv—7G&F–öâ66†VÖĞ¦W‡÷'B6öç7B&Vv—7FW%66†VÖÒ¢æö&¦V7B‡°Ğ¢VÖ–Ã¢¢ç7G&–ær‚’æVÖ–Â‚$–çfÆ–BVÖ–ÂFG&W72"’ÀĞ¢77v÷&C¢¢ç7G&–ær‚’æÖ–âƒbÂ%77v÷&B×W7B&RBÆV7Bb6†&7FW'2"’ÀĞ¢f—'7DæÖS¢¢ç7G&–ær‚’æÖ–âƒÂ$f—'7BæÖR—2&WV—&VB"’ÀĞ¢Æ7DæÖS¢¢ç7G&–ær‚’æÖ–âƒÂ$Æ7BæÖR—2&WV—&VB"’ÀĞ§Ò“°Ğ Ğ¦W‡÷'BG—R–ç6W'EW6W"Ò¢æ–æfW#ÇG—Vöb–ç6W'EW6W%66†VÖã°Ğ¦W‡÷'BG—RW6W"ÒG—VöbW6W'2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D7F—f—G’Ò¢æ–æfW#ÇG—Vöb–ç6W'D7F—f—G•66†VÖã°Ğ¦W‡÷'BG—R7F—f—G’ÒG—Vöb7F—f—F–W2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D”–ç6–v‡BÒ¢æ–æfW#ÇG—Vöb–ç6W'D”–ç6–v‡E66†VÖã°Ğ¦W‡÷'BG—R”–ç6–v‡BÒG—Vöb”–ç6–v‡G2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EG&–æ–æuÆâÒ¢æ–æfW#ÇG—Vöb–ç6W'EG&–æ–æuÆå66†VÖã°Ğ¦W‡÷'BG—RG&–æ–æuÆâÒG—VöbG&–æ–æuÆç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DVÖ–Åv—FÆ—7BÒ¢æ–æfW#ÇG—Vöb–ç6W'DVÖ–Åv—FÆ—7E66†VÖã°Ğ¦W‡÷'BG—RVÖ–Åv—FÆ—7BÒG—VöbVÖ–Åv—FÆ—7BâF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DfVVF&6²Ò¢æ–æfW#ÇG—Vöb–ç6W'DfVVF&6µ66†VÖã°Ğ¦W‡÷'BG—RfVVF&6²ÒG—VöbfVVF&6²âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DvöÂÒ¢æ–æfW#ÇG—Vöb–ç6W'DvöÅ66†VÖã°Ğ¦W‡÷'BG—RvöÂÒG—VöbvöÇ2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EW&f÷&Öæ6TÆörÒ¢æ–æfW#ÇG—Vöb–ç6W'EW&f÷&Öæ6TÆöu66†VÖã°Ğ¦W‡÷'BG—RW&f÷&Öæ6TÆörÒG—VöbW&f÷&Öæ6TÆöw2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D”6öçfW'6F–öâÒ¢æ–æfW#ÇG—Vöb–ç6W'D”6öçfW'6F–öå66†VÖã°Ğ¦W‡÷'BG—R”6öçfW'6F–öâÒG—Vöb”6öçfW'6F–öç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D”ÖW76vRÒ¢æ–æfW#ÇG—Vöb–ç6W'D”ÖW76vU66†VÖã°Ğ¦W‡÷'BG—R”ÖW76vRÒG—Vöb”ÖW76vW2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E'Vææ–æu6†öRÒ¢æ–æfW#ÇG—Vöb–ç6W'E'Vææ–æu6†öU66†VÖã°Ğ¦W‡÷'BG—R'Vææ–æu6†öRÒG—Vöb'Vææ–æu6†öW2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E6†öT6ö×&—6öâÒ¢æ–æfW#ÇG—Vöb–ç6W'E6†öT6ö×&—6öå66†VÖã°Ğ¦W‡÷'BG—R6†öT6ö×&—6öâÒG—Vöb6†öT6ö×&—6öç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D”¶W’Ò¢æ–æfW#ÇG—Vöb–ç6W'D”¶W•66†VÖã°Ğ¦W‡÷'BG—R”¶W’ÒG—Vöb”¶W—2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E&Vg&W6…Fö¶VâÒ¢æ–æfW#ÇG—Vöb–ç6W'E&Vg&W6…Fö¶Vå66†VÖã°Ğ¦W‡÷'BG—R&Vg&W6…Fö¶VâÒG—Vöb&Vg&W6…Fö¶Vç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DF†ÆWFU&öf–ÆRÒ¢æ–æfW#ÇG—Vöb–ç6W'DF†ÆWFU&öf–ÆU66†VÖã°Ğ¦W‡÷'BG—RF†ÆWFU&öf–ÆRÒG—VöbF†ÆWFU&öf–ÆW2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EÆåvVV²Ò¢æ–æfW#ÇG—Vöb–ç6W'EÆåvVVµ66†VÖã°Ğ¦W‡÷'BG—RÆåvVV²ÒG—VöbÆåvVV·2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EÆäF’Ò¢æ–æfW#ÇG—Vöb–ç6W'EÆäF•66†VÖã°Ğ¦W‡÷'BG—RÆäF’ÒG—VöbÆäF—2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'Ev÷&¶÷WD66†RÒ¢æ–æfW#ÇG—Vöb–ç6W'Ev÷&¶÷WD66†U66†VÖã°Ğ¦W‡÷'BG—Rv÷&¶÷WD66†RÒG—Vöbv÷&¶÷WD66†RâF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E&÷WFRÒ¢æ–æfW#ÇG—Vöb–ç6W'E&÷WFU66†VÖã°Ğ¦W‡÷'BG—R&÷WFRÒG—Vöb&÷WFW2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D7F—f—G•&÷WFTÖÒ¢æ–æfW#ÇG—Vöb–ç6W'D7F—f—G•&÷WFTÖ66†VÖã°Ğ¦W‡÷'BG—R7F—f—G•&÷WFTÖÒG—Vöb7F—f—G•&÷WFTÖâF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D7F—f—G”fVGW&W2Ò¢æ–æfW#ÇG—Vöb–ç6W'D7F—f—G”fVGW&W566†VÖã°Ğ¦W‡÷'BG—R7F—f—G”fVGW&W2ÒG—Vöb7F—f—G”fVGW&W2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E6–Ö–Æ%'Vç466†RÒ¢æ–æfW#ÇG—Vöb–ç6W'E6–Ö–Æ%'Vç466†U66†VÖã°Ğ¦W‡÷'BG—R6–Ö–Æ%'Vç466†RÒG—Vöb6–Ö–Æ%'Vç466†RâF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'D6ö6…&V6Ò¢æ–æfW#ÇG—Vöb–ç6W'D6ö6…&V666†VÖã°Ğ¦W‡÷'BG—R6ö6…&V6ÒG—Vöb6ö6…&V62âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DvVçE'VâÒ¢æ–æfW#ÇG—Vöb–ç6W'DvVçE'Vå66†VÖã°Ğ¦W‡÷'BG—RvVçE'VâÒG—VöbvVçE'Vç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'Dæ÷F–f–6F–öä÷WF&÷‚Ò¢æ–æfW#ÇG—Vöb–ç6W'Dæ÷F–f–6F–öä÷WF&÷…66†VÖã°¦W‡÷'BG—Ræ÷F–f–6F–öä÷WF&÷‚ÒG—Vöbæ÷F–f–6F–öä÷WF&÷‚âF–æfW%6VÆV7C°¦W‡÷'BG—R6ö6„ÖW76vTfVVF&6²ÒG—Vöb6ö6„ÖW76vTfVVF&6²âF–æfW%6VÆV7C°¦W‡÷'BG—RWFFT6ö6…&VfW&Væ6W2Ò¢æ–æfW#ÇG—VöbWFFT6ö6…&VfW&Væ6W566†VÖã°¦W‡÷'BG—RÆöv–äFFÒ¢æ–æfW#ÇG—VöbÆöv–å66†VÖã°Ğ¦W‡÷'BG—R&Vv—7FW$FFÒ¢æ–æfW#ÇG—Vöb&Vv—7FW%66†VÖã°Ğ¦W‡÷'BG—R–ç6W'DFVÆWF–öäfVVF&6²Ò¢æ–æfW#ÇG—Vöb–ç6W'DFVÆWF–öäfVVF&6µ66†VÖã°Ğ¦W‡÷'BG—RFVÆWF–öäfVVF&6²ÒG—VöbFVÆWF–öäfVVF&6²âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EW6W$6×–vâÒ¢æ–æfW#ÇG—Vöb–ç6W'EW6W$6×–vå66†VÖã°Ğ¦W‡÷'BG—RW6W$6×–vâÒG—VöbW6W$6×–vç2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DVÖ–Ä¦ö"Ò¢æ–æfW#ÇG—Vöb–ç6W'DVÖ–Ä¦ö%66†VÖã°Ğ¦W‡÷'BG—RVÖ–Ä¦ö"ÒG—VöbVÖ–Ä¦ö'2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'DVÖ–Ä6Æ–6²Ò¢æ–æfW#ÇG—Vöb–ç6W'DVÖ–Ä6Æ–6µ66†VÖã°Ğ¦W‡÷'BG—RVÖ–Ä6Æ–6²ÒG—VöbVÖ–Ä6Æ–6·2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E7—7FVÕ6WGF–ærÒ¢æ–æfW#ÇG—Vöb–ç6W'E7—7FVÕ6WGF–æu66†VÖã°Ğ¦W‡÷'BG—R7—7FVÕ6WGF–ærÒG—Vöb7—7FVÕ6WGF–æw2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'E7G&fvV&†öö´ÆörÒ¢æ–æfW#ÇG—Vöb–ç6W'E7G&fvV&†öö´Æöu66†VÖã°Ğ¦W‡÷'BG—R7G&fvV&†öö´ÆörÒG—Vöb7G&fvV&†öö´Æöw2âF–æfW%6VÆV7C°Ğ¦W‡÷'BG—R–ç6W'EÆävöÂÒ¢æ–æfW#ÇG—Vöb–ç6W'EÆävöÅ66†VÖã°Ğ¦W‡÷'BG—RÆävöÂÒG—VöbÆävöÇ2âF–æfW%6VÆV7C°Ğ