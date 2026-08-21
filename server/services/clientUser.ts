import type { User } from "@shared/schema";

// Explicit allowlist for runner data that may cross the API boundary. New
// database columns are private by default until intentionally added here.
export const CLIENT_USER_FIELDS = [
  "id",
  "email",
  "firstName",
  "lastName",
  "username",
  "stravaConnected",
  "stravaHasWriteScope",
  "stravaBrandingEnabled",
  "stravaBrandingTemplate",
  "unitPreference",
  "activityViewMode",
  "isAdmin",
  "lastSyncAt",
  "syncStatus",
  "syncProgress",
  "syncTotal",
  "stravaWebhookPausedAt",
  "subscriptionStatus",
  "subscriptionPlan",
  "trialEndsAt",
  "subscriptionEndsAt",
  "monthlyInsightCount",
  "insightCountResetAt",
  "coachOnboardingCompleted",
  "coachGoal",
  "coachRaceDate",
  "coachTargetTime",
  "coachDaysAvailable",
  "coachWeeklyMileageCap",
  "coachTone",
  "coachNotifyRecap",
  "coachNotifyWeeklySummary",
  "notifyPostRun",
  "postRunEmailFrequency",
  "coachQuietHoursStart",
  "coachQuietHoursEnd",
  "coachEnabled",
  "coachTimezone",
  "coachDailyBriefingEnabled",
  "coachDailyBriefingHour",
  "coachWeatherEnabled",
  "coachWeatherLocation",
  "coachPreferredChannel",
  "coachSnoozedUntil",
  "coachDailyAvailability",
  "coachDailyAvailabilityDate",
  "marketingOptOut",
  "onboardingGoal",
  "onboardingStruggle",
  "onboardingDays",
  "onboardingCompletedAt",
  "premiumPreview",
  "premiumPreviewCreatedAt",
  "createdAt",
] as const satisfies readonly (keyof User)[];

export type ClientUser = Pick<User, (typeof CLIENT_USER_FIELDS)[number]>;

export function toClientUser(user: User): ClientUser {
  const result: Partial<ClientUser> = {};
  for (const field of CLIENT_USER_FIELDS) {
    (result as Record<string, unknown>)[field] = user[field];
  }
  return result as ClientUser;
}
