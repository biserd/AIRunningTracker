export const LIFECYCLE_SEGMENTS = [
  "signup_no_strava",
  "preview_ready_unseen",
  "preview_engaged_no_trial",
  "checkout_abandoned",
  "trial_needs_activation",
  "trial_engaged",
  "trial_ending",
  "trial_expired_winback",
  "inactive_free",
] as const;

export type LifecycleSegment = typeof LIFECYCLE_SEGMENTS[number];

export interface LifecycleUserState {
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | string | null;
  stravaConnected?: boolean | null;
  premiumPreviewCreatedAt?: Date | string | null;
  activationAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  createdAt?: Date | string | null;
  marketingOptOut?: boolean | null;
  marketingConsentStatus?: string | null;
  email?: string | null;
}

export interface LifecycleSignals {
  previewViewedAt?: Date | string | null;
  previewCtaClickedAt?: Date | string | null;
  checkoutStartedAt?: Date | string | null;
  trialStartedAt?: Date | string | null;
}

function dateValue(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function isLifecycleMessageable(user: LifecycleUserState): boolean {
  return Boolean(
    user.email &&
    user.marketingConsentStatus === "consented" &&
    !user.marketingOptOut
  );
}

export function resolveLifecycleSegment(
  user: LifecycleUserState,
  signals: LifecycleSignals = {},
  now = new Date(),
): LifecycleSegment | null {
  if (!isLifecycleMessageable(user)) return null;

  const isPaid = user.subscriptionPlan !== "free" && user.subscriptionStatus === "active";
  if (isPaid) return null;

  const nowMs = now.getTime();
  const trialEndsAt = dateValue(user.trialEndsAt);
  const isTrialing = user.subscriptionStatus === "trialing" && (!trialEndsAt || trialEndsAt > nowMs);
  if (isTrialing) {
    if (trialEndsAt && trialEndsAt - nowMs <= 72 * 60 * 60 * 1000) return "trial_ending";
    return user.activationAt ? "trial_engaged" : "trial_needs_activation";
  }

  if (["canceled", "past_due", "unpaid"].includes(user.subscriptionStatus || "")) {
    return "trial_expired_winback";
  }

  if (!user.stravaConnected) return "signup_no_strava";

  const checkoutAt = dateValue(signals.checkoutStartedAt);
  const trialAt = dateValue(signals.trialStartedAt);
  if (checkoutAt && checkoutAt <= nowMs - 30 * 60 * 1000 && (!trialAt || trialAt < checkoutAt)) {
    return "checkout_abandoned";
  }

  const previewCreatedAt = dateValue(user.premiumPreviewCreatedAt);
  if (previewCreatedAt) {
    if (signals.previewViewedAt || signals.previewCtaClickedAt) return "preview_engaged_no_trial";
    return "preview_ready_unseen";
  }

  const lastActiveAt = dateValue(user.lastSeenAt) || dateValue(user.createdAt);
  if (lastActiveAt && lastActiveAt <= nowMs - 30 * 24 * 60 * 60 * 1000) return "inactive_free";

  return null;
}

export function stableLifecycleBucket(userId: number, salt: string): number {
  let hash = 2166136261;
  const value = `${userId}:${salt}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
