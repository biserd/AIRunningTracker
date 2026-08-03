export interface BasicRecoveryData {
  daysSinceLastRun: number;
  readyToRun: boolean;
}

export interface TodayRunDecisionInput {
  isStravaConnected: boolean;
  recentRuns: number;
  latestRunAt?: string | Date | null;
  recoveryData?: BasicRecoveryData;
  now?: Date;
}

export type TodayRunDecisionKind =
  | "connect"
  | "waiting"
  | "return"
  | "easy"
  | "recovery"
  | "recent_data_only";

export interface TodayRunDecisionCopy {
  kind: TodayRunDecisionKind;
  title: string;
  action: string;
}

function daysSince(date: string | Date | null | undefined, now: Date): number | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return null;
  const elapsed = now.getTime() - parsed.getTime();
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / (24 * 60 * 60 * 1000));
}

export function getTodayRunDecision(input: TodayRunDecisionInput): TodayRunDecisionCopy {
  if (!input.isStravaConnected) {
    return {
      kind: "connect",
      title: "Connect Strava to get your first recommendation",
      action: "Once your runs arrive, this card will turn recent training into one clear next step.",
    };
  }

  if (input.recentRuns === 0) {
    return {
      kind: "waiting",
      title: "Your first recommendation is on the way",
      action: "Strava is connected. Complete or sync a run and this card will turn it into one practical next step.",
    };
  }

  if (input.recoveryData) {
    if (input.recoveryData.daysSinceLastRun >= 14) {
      return {
        kind: "return",
        title: "Ease back into running",
        action: "Start with 20–30 minutes at a conversational effort. Finish feeling like you could comfortably continue.",
      };
    }
    if (input.recoveryData.readyToRun) {
      return {
        kind: "easy",
        title: "An easy run is reasonable today",
        action: "Keep the first 10 minutes relaxed, then stay conversational. Save hard work for a planned session.",
      };
    }
    return {
      kind: "recovery",
      title: "Make today a recovery day",
      action: "Skip intensity. Choose rest, a walk, or easy mobility, then reassess how you feel tomorrow.",
    };
  }

  const gapDays = daysSince(input.latestRunAt, input.now ?? new Date());
  if (gapDays !== null && gapDays >= 14) {
    return {
      kind: "return",
      title: "Ease back into running",
      action: "Start with 20–30 minutes at a conversational effort. Finish feeling like you could comfortably continue.",
    };
  }

  return {
    kind: "recent_data_only",
    title: "Use your latest run as today’s reference",
    action: "If you run today, start easy and adjust from how you feel. Recent running data cannot account for sleep, soreness, illness, or injury.",
  };
}
