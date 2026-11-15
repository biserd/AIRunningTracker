import crypto from "node:crypto";
import { SIGNUP_VALUE_LINKS } from "../../shared/dayOneCoach";

export type SignupEmailStep = keyof typeof SIGNUP_VALUE_LINKS;
export const SIGNUP_EMAIL_TTL_SECONDS = 14 * 86400;
export const SIGNUP_EMAIL_SOURCES = { DAY1: "signup_day1", DAY7: "signup_day7", DAY14: "signup_day14" } as const;
const steps = Object.keys(SIGNUP_EMAIL_SOURCES) as SignupEmailStep[];
const aad = Buffer.from("signup-email-metrics:v1");

export function signupEmailStep(source: unknown): SignupEmailStep | undefined {
  return steps.find(step => SIGNUP_EMAIL_SOURCES[step] === source);
}

function key() {
  const secret = process.env.MARKETING_LINK_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("Signup email tracking requires the marketing signing secret");
  return crypto.createHmac("sha256", secret).update(aad).digest();
}

/** An encrypted measurement reference, deliberately unrelated to authentication. */
export function createSignupEmailReference(jobId: number, step: SignupEmailStep, now = Date.now()): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(JSON.stringify([jobId, step, now + SIGNUP_EMAIL_TTL_SECONDS * 1000])), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function parseSignupEmailReference(ref: unknown, now = Date.now()): { jobId: number; step: SignupEmailStep } | null {
  if (typeof ref !== "string" || !/^[A-Za-z0-9_-]{48,160}$/.test(ref)) return null;
  try {
    const bytes = Buffer.from(ref, "base64url");
    if (bytes.toString("base64url") !== ref) return null;
    const cipher = crypto.createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    cipher.setAAD(aad);
    cipher.setAuthTag(bytes.subarray(12, 28));
    const [jobId, step, until] = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
    if (!Number.isSafeInteger(jobId) || jobId <= 0 || !steps.includes(step) || !Number.isSafeInteger(until) || until <= now) return null;
    return { jobId, step };
  } catch { return null; }
}

export function signupEmailCookie(step: SignupEmailStep): string {
  return `ra_signup_${step.toLowerCase()}`;
}

export function signupEmailResultMatches(step: SignupEmailStep, capability: unknown): boolean {
  return step === "DAY1" ? capability === "ai_coach" || capability === "race_prediction"
    : step === "DAY7" ? capability === "race_prediction" : capability === "fueling_plan";
}

export function signupEmailCtaPath(jobId: number, step: SignupEmailStep, now = Date.now()): string {
  return `${SIGNUP_VALUE_LINKS[step]}#signup_ref=${createSignupEmailReference(jobId, step, now)}`;
}
