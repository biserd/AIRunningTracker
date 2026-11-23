import { z } from "zod";
import { DAY_SEVEN_RACE_SOURCE, SIGNUP_VALUE_LINKS } from "./dayOneCoach";
import type { RacePredictionResult } from "./racePrediction";

export const DAY_SEVEN_RACE_REVIEW = SIGNUP_VALUE_LINKS.DAY7 + "&mode=review";
export const LATEST_RACE_ESTIMATE = "/api/race-predictor/latest";
export const RACE_GOALS = {
  "5k": { distance: 5000, label: "5K" },
  "10k": { distance: 10000, label: "10K" },
  half_marathon: { distance: 21097, label: "half marathon" },
  marathon: { distance: 42195, label: "marathon" },
} as const;
const raceGoalSchema = z.enum(["5k", "10k", "half_marathon", "marathon"]);
export type RaceGoal = z.infer<typeof raceGoalSchema>;

export const raceEstimateSchema = z.object({
  goal: raceGoalSchema,
  seconds: z.number().int().min(1).max(172800),
  lower: z.number().int().min(1).max(172800),
  upper: z.number().int().min(1).max(172800),
}).strict().refine(v => v.lower <= v.seconds && v.seconds <= v.upper);
export type RaceEstimate = z.infer<typeof raceEstimateSchema>;

export function raceEstimate(distance: number, result: RacePredictionResult): RaceEstimate | null {
  const goal = Object.keys(RACE_GOALS).find(key => RACE_GOALS[key as RaceGoal].distance === distance);
  const parsed = raceEstimateSchema.safeParse({ goal, seconds: Math.round(result.predictedTime),
    lower: Math.round(result.confidenceLower), upper: Math.round(result.confidenceUpper) });
  return parsed.success ? parsed.data : null;
}

export function daySevenPlanPath(goal: RaceGoal): string {
  return `/training-plans?source=${DAY_SEVEN_RACE_SOURCE}&raceGoal=${goal}`;
}

/** Only this exact same-site shape can bypass the legacy Strava checkout handoff. */
export function daySevenPlanGoal(path: unknown): RaceGoal | null {
  if (typeof path !== "string") return null;
  const parsed = raceGoalSchema.safeParse(path.match(/^\/training-plans\?source=signup_day7&raceGoal=([a-z0-9_]+)$/)?.[1]);
  return parsed.success ? parsed.data : null;
}

export function raceWeekTip(goal?: RaceGoal): string {
  return goal === "half_marathon" || goal === "marathon"
    ? "Put your usual long run on the calendar and keep it conversational. Use the predicted pace to plan race day, not as this week’s long-run pace."
    : "Pick one easy run this week and keep it conversational. Treat the predicted pace as a race-day reference, not a pace you need to hit on every run.";
}
