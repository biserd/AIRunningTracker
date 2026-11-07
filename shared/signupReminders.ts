import type { LifecycleUserState } from "./lifecycleCampaigns";

export const SIGNUP_REMINDER_CAMPAIGN = "signup_unpaid" as const;
export const SIGNUP_REMINDER_VERSION = 3;
const DAY = 86400000;
export const SIGNUP_REMINDER_STEPS = [
  { step: "DAY1", offsetHours: 24, subject: "A clearer next run starts here", previewText: "Explore your running history and coaching options", body: "Thanks for joining Run Analytics. Connect Strava to bring your running history into your dashboard. When you want more guidance, Premium adds deeper run analysis, training plans and a personal coach in the app and on WhatsApp. Review the available plans and any trial eligibility before deciding.", ctaText: "Explore Run Analytics", ctaPath: "/pricing?source=signup_day1", ctaKey: "signup_day1" },
  { step: "DAY7", offsetHours: 168, subject: "One week in: what would you ask your running coach?", previewText: "Get more from the runs you already do", body: "Should tomorrow be an easy run? How should you pace your long run? Premium coaching uses your running history to help with questions like these, alongside training plans and progress insights. If you are still exploring, you can review the features, current pricing and any trial eligibility without committing.", ctaText: "Review Premium Coaching", ctaPath: "/pricing?source=signup_day7", ctaKey: "signup_day7" },
  { step: "DAY14", offsetHours: 336, subject: "Still exploring Run Analytics?", previewText: "Your final signup follow-up", body: "This is the last reminder in your signup sequence. If you would like deeper analysis, training plans and coaching based on your running history, take another look at Premium. If now is not the right time, no action is needed. You can also unsubscribe below.", ctaText: "See What Premium Includes", ctaPath: "/pricing?source=signup_day14", ctaKey: "signup_day14" },
] as const;

export type SignupReminderUser = LifecycleUserState & { subscriptionEndsAt?: Date | string | null; isAdmin?: boolean | null };
export function signupReminderExclusion(user: SignupReminderUser, now = Date.now()): string | null {
  if (!user.email) return "missing_email";
  if (user.marketingOptOut || user.marketingConsentStatus === "unsubscribed") return "unsubscribed";
  if (user.marketingConsentStatus === "suppressed") return "delivery_suppressed";
  // Owner-selected audience: unknown is eligible, but never override an
  // unsubscribe, explicit opt-out or delivery suppression. Do not rewrite
  // anyone's recorded consent to make them eligible.
  if (!["consented", "unknown"].includes(user.marketingConsentStatus ?? "unknown")) return "consent_missing";
  if (user.isAdmin) return "internal_account";
  if (!["free", "pro", "premium"].includes(user.subscriptionPlan || "")) return "unknown_subscription";
  if (user.subscriptionPlan !== "free" && user.subscriptionStatus === "active") return "paid";
  // Billing-recovery messages are a different flow. Never pitch a new purchase
  // to an active trial, a paid-through cancellation or a delinquent customer.
  if (["trialing", "past_due", "unpaid"].includes(user.subscriptionStatus || "")) return "existing_subscription";
  if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt).getTime() > now) return "paid";
  if (!["free", "active", "canceled"].includes(user.subscriptionStatus || "")) return "unknown_subscription";
  const created = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  if (!Number.isFinite(created) || created > now) return "invalid_signup_date";
  if (now >= created + 17 * DAY) return "sequence_expired";
  return null;
}
export function signupReminderWindow(createdAt: Date | string, index: number) {
  const step = SIGNUP_REMINDER_STEPS[index];
  if (!step) throw new Error("Invalid signup reminder step");
  const start = new Date(createdAt).getTime() + step.offsetHours * 3600000;
  return { start, end: start + 3 * DAY };
}
export const signupRemindersEnabled = () => process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS === "true";
