import type { LifecycleUserState } from "./lifecycleCampaigns";
import { SIGNUP_VALUE_LINKS, DAY_ONE_COACH_SOURCE, DAY_SEVEN_RACE_SOURCE, DAY_FOURTEEN_FUELING_SOURCE } from "./dayOneCoach";

export const SIGNUP_REMINDER_CAMPAIGN = "signup_unpaid" as const;
export const SIGNUP_REMINDER_VERSION = 3;
const DAY = 86400000;
export const SIGNUP_REMINDER_STEPS = [
  { step: "DAY1", offsetHours: 24, subject: "Only three days to run next week?", previewText: "Ask what to run, or estimate a race time without signing in.", body: "When you only have three days to run, it helps to know what each run is for. Ask your Run Analytics coach what a three-run week could look like. You can start with a free message. Not signed in? Use a recent race time or hard effort to estimate your finish time with the free race predictor, no login needed.", ctaText: "Ask your running coach", ctaPath: SIGNUP_VALUE_LINKS.DAY1, ctaKey: DAY_ONE_COACH_SOURCE },
  { step: "DAY7", offsetHours: 168, subject: "What race pace could you aim for?", previewText: "Turn one recent effort into a finish-time estimate and pace range.", body: "Picking a goal pace can feel like guesswork. Enter the distance and time from a recent race or hard effort, then choose your next race distance. You’ll get a finish-time estimate and a pace range to start from. It’s free, with no login or connected watch needed.", ctaText: "Predict my race time", ctaPath: SIGNUP_VALUE_LINKS.DAY7, ctaKey: DAY_SEVEN_RACE_SOURCE },
  { step: "DAY14", offsetHours: 336, subject: "Know when to take your next gel", previewText: "Build a marathon fueling schedule you can practice on a long run.", body: "Race day isn’t the time to guess when to fuel. Enter your expected marathon finish time and the intake you’ve practiced. You’ll get a timed fueling schedule you can copy or print for your next long run. It’s free and doesn’t require a login. This is the last email in this signup series.", ctaText: "Build my fueling plan", ctaPath: SIGNUP_VALUE_LINKS.DAY14, ctaKey: DAY_FOURTEEN_FUELING_SOURCE },
] as const;

export type SignupReminderUser = LifecycleUserState & { subscriptionEndsAt?: Date | string | null; isAdmin?: boolean | null };
export const SIGNUP_FINAL_HOLDS_SETTING = "drip_campaigns_preserved_final_users";
export const SIGNUP_FALLBACK_TIMEZONE = "America/New_York";
type TimingUser = SignupReminderUser & { coachTimezone?: string | null; coachQuietHoursStart?: number | null; coachQuietHoursEnd?: number | null };
export function signupCampaignTimezone(user: TimingUser): string {
  try {
    const timezone = new Intl.DateTimeFormat("en-US", { timeZone: user.coachTimezone || "UTC" }).resolvedOptions().timeZone;
    // UTC is the existing schema default, not evidence of the runner's location.
    return ["UTC", "Etc/UTC", "GMT", "Etc/GMT"].includes(timezone) ? SIGNUP_FALLBACK_TIMEZONE : timezone;
  } catch { return SIGNUP_FALLBACK_TIMEZONE; }
}
export function nextSignupSendTime(user: TimingUser, requested: number): number | null {
  if (!Number.isFinite(requested)) return null;
  const timezone = signupCampaignTimezone(user);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" });
  const validHour = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23;
  const start = validHour(user.coachQuietHoursStart) ? user.coachQuietHoursStart : 20;
  const end = validHour(user.coachQuietHoursEnd) ? user.coachQuietHoursEnd : 8;
  const allowed = (at: number) => {
    const hour = Number(formatter.format(at));
    const quiet = start > end ? hour >= start || hour < end : hour >= start && hour < end;
    return hour >= 9 && hour < 18 && !quiet;
  };
  if (allowed(requested)) return requested;
  const quarterHour = 15 * 60000;
  const first = Math.ceil(requested / quarterHour) * quarterHour;
  for (let index = 0; index <= 72 * 4; index++) {
    const at = first + index * quarterHour;
    if (allowed(at)) return at;
  }
  return null; // Conflicting preferences must not bypass quiet hours.
}
export function signupDeliveryWindow(user: TimingUser, index: number) {
  const window = signupReminderWindow(user.createdAt!, index);
  const nextDaytime = nextSignupSendTime(user, window.end);
  // A deadline falling overnight lasts through the next daytime opening plus
  // one hour for the worker/cap. This is anchored, not a rolling extension.
  return { start: window.start, end: nextDaytime !== null && nextDaytime > window.end ? nextDaytime + 3600000 : window.end };
}
export function signupReminderExclusion(user: TimingUser, now = Date.now(), preservedFinal = false): string | null {
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
  if (!preservedFinal && now >= signupDeliveryWindow(user, 2).end) return "sequence_expired";
  return null;
}
export function signupReminderWindow(createdAt: Date | string, index: number) {
  const step = SIGNUP_REMINDER_STEPS[index];
  if (!step) throw new Error("Invalid signup reminder step");
  const start = new Date(createdAt).getTime() + step.offsetHours * 3600000;
  return { start, end: start + 3 * DAY };
}
export const signupRemindersEnabled = () => process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS === "true";
