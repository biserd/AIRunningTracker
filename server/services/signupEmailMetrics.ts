import type { EmailJob } from "@shared/schema";
import { SIGNUP_REMINDER_CAMPAIGN, SIGNUP_REMINDER_VERSION } from "@shared/signupReminders";
import { buildFunnelDedupeKey } from "@shared/funnelEvents";
import { storage } from "../storage";
import { recordFunnelEvent } from "./funnelAnalytics";
import { parseSignupEmailReference, signupEmailCookie, signupEmailStep, SIGNUP_EMAIL_SOURCES, type SignupEmailStep } from "./signupEmailReference";

export function isSentSignupEmail(job: EmailJob | undefined | null, step: SignupEmailStep): job is EmailJob {
  return !!job && job.jobType === "drip" && job.campaign === SIGNUP_REMINDER_CAMPAIGN &&
    job.campaignVersion === SIGNUP_REMINDER_VERSION && job.status === "sent" && job.step === step;
}

export async function resolveSignupEmailReference(ref: unknown, source: unknown, getJob = storage.getEmailJob.bind(storage)): Promise<EmailJob | null> {
  const parsed = parseSignupEmailReference(ref), step = signupEmailStep(source);
  if (!step || !parsed || step !== parsed.step) return null;
  const job = await getJob(parsed.jobId);
  return isSentSignupEmail(job, step) ? job : null;
}

export async function signupEmailFromCookie(header: string | undefined, source: unknown, userId?: number | null): Promise<EmailJob | null> {
  const step = signupEmailStep(source);
  if (!step) return null;
  const prefix = signupEmailCookie(step) + "=";
  const ref = header?.split(";").map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length);
  try {
    const job = await resolveSignupEmailReference(ref, source);
    return job && (userId == null || job.userId === userId) ? job : null;
  } catch {
    // A metrics read must never prevent checkout or a free result.
    return null;
  }
}

/**
 * Call only with a Stripe-confirmed trial and the account that owns it.
 * Guest checkout resolves ownership from the email on the completed Stripe session.
 * The unique subscription key prevents retries and webhook overlap from adding rows.
 */
export async function recordSignupEmailTrial(subscriptionId: string, metadata: Record<string, string> | null | undefined, userId: number,
  getJob = storage.getEmailJob.bind(storage), record = recordFunnelEvent): Promise<void> {
  const raw = metadata?.signupEmailJobId, step = signupEmailStep(metadata?.signupEmailSource);
  if (!step || !raw || !/^[1-9]\d{0,14}$/.test(raw)) return;
  try {
    const job = await getJob(Number(raw));
    if (!isSentSignupEmail(job, step) || job.userId !== userId) return;
    await record({
      event: "signup_email_trial_started", userId,
      dedupeKey: buildFunnelDedupeKey("signup_email_trial_started", [subscriptionId]),
      props: { subscriptionId, signupEmailJobId: String(job.id), source: SIGNUP_EMAIL_SOURCES[step] },
    });
  } catch {
    console.warn("[funnel] Could not look up signup email trial attribution");
  }
}

export function signupEmailStripeMetadata(job: EmailJob | null, source: unknown): Record<string, string> {
  return job && typeof source === "string" ? { signupEmailJobId: String(job.id), signupEmailSource: source } : {};
}
