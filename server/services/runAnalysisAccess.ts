import { canAccessCapability, hasPremiumAccess, type EntitlementSubject } from "@shared/entitlements";

type Runner = EntitlementSubject & {
  id: number;
  stravaConnected?: boolean | null;
  premiumPreview?: unknown;
  coachEnabled?: boolean | null;
  coachOnboardingCompleted?: boolean | null;
};
type Run = { id: number; userId: number; stravaId?: string | null; type?: string | null };

/** The original saved preview is authoritative; a URL or user preference cannot nominate a run. */
export function savedPreviewRunId(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const preview = value as { activityId?: unknown; sourceData?: {activityId?: unknown} };
  const id = preview.sourceData?.activityId ?? preview.activityId;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  return preview.activityId != null && preview.activityId !== id ? null : id;
}

export function isFreeAnalysisRun(runner: Runner, run: Run): boolean {
  return runner.id === run.userId && runner.stravaConnected === true &&
    !hasPremiumAccess(runner) &&
    (runner.subscriptionPlan == null || runner.subscriptionPlan === "free") &&
    Boolean(run.stravaId) && /^(run|trail\s?run|virtual\s?run)$/i.test(run.type?.trim() || "") &&
    savedPreviewRunId(runner.premiumPreview) === run.id;
}

export function canViewRunAnalysis(runner: Runner, run: Run): boolean {
  return runner.id === run.userId && (canAccessCapability(runner, "activity_deep_dive") || isFreeAnalysisRun(runner, run));
}

export function canGenerateRunCoachRecap(runner: Runner, run: Run): boolean {
  return runner.id === run.userId && runner.coachEnabled !== false && (
    isFreeAnalysisRun(runner, run) ||
    (Boolean(runner.coachOnboardingCompleted) && canAccessCapability(runner, "ai_coach"))
  );
}
