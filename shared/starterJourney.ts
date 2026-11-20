import { z } from "zod";
import { normalizePreferredRunDays } from "./trainingPlanSafety";

export const STARTER_SOURCE = "dashboard_starter";
export const STARTER_COACH_PROMPT = "I can run three days this week. What should I do?";
export const STARTER_WEEK_URL = "/training-plans?starter=1";
export const STARTER_GOALS = {
  general_fitness: "General Fitness", "5k": "5K", "10k": "10K",
  half_marathon: "Half Marathon", marathon: "Marathon", "50k": "50K Ultra",
  "50_mile": "50 Mile Ultra", "100k": "100K Ultra", "100_mile": "100 Mile Ultra",
} as const;
export const starterWeekSchema = z.object({
  goalType: z.enum(["general_fitness", "5k", "10k", "half_marathon", "marathon", "50k", "50_mile", "100k", "100_mile"]),
  raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }).nullable(),
  preferredDays: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).min(2).max(7)
    .transform(normalizePreferredRunDays).refine(days => days.length >= 2),
  includeSpeedwork: z.boolean(),
  includeLongRuns: z.boolean(),
});
export type StarterWeek = z.infer<typeof starterWeekSchema>;
export type SavedStarterWeek = StarterWeek & { savedAt: string };

export function starterWeekWorkouts(days: string[], includeSpeedwork: boolean, includeLongRuns: boolean) {
  return days.map((day, i) => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    workout: i === days.length - 1 && includeLongRuns ? "Long easy run"
      : i === 1 && includeSpeedwork ? "Controlled quality session" : "Easy aerobic run",
  }));
}

export const STARTER_ACTIONS = ["dashboard_started", "dashboard_return", "run_opened", "prediction_completed", "week_previewed", "week_saved", "coach_replied"] as const;
export type StarterAction = typeof STARTER_ACTIONS[number];
