import crypto from "crypto";
import { SIGNUP_VALUE_LINKS } from "../../shared/dayOneCoach";

type MarketingTokenKind = "click" | "unsubscribe" | "attribution";

export const CLICK_SIGN_IN_TTL_SECONDS = 72 * 60 * 60;

export function isRecentCampaignClick(sentAt: Date | string | null | undefined, nowMs = Date.now()): boolean {
  if (!sentAt) return false;
  const sentMs = new Date(sentAt).getTime();
  return Number.isFinite(sentMs) && sentMs <= nowMs && nowMs - sentMs <= CLICK_SIGN_IN_TTL_SECONDS * 1000;
}

interface MarketingTokenPayload {
  kind: MarketingTokenKind;
  userId: number;
  jobId?: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.MARKETING_LINK_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MARKETING_LINK_SIGNING_SECRET must contain at least 32 characters");
  }
  return secret;
}

function sign(encoded: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`lifecycle-v1:${encoded}`).digest("base64url");
}

export function createMarketingToken(
  payload: Omit<MarketingTokenPayload, "exp">,
  ttlSeconds: number,
  issuedAtSeconds = Math.floor(Date.now() / 1000),
): string {
  const complete = { ...payload, exp: issuedAtSeconds + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(complete), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function readMarketingToken(token: unknown, expectedKind: MarketingTokenKind, requireFresh: boolean): MarketingTokenPayload | null {
  if (typeof token !== "string" || token.length > 1024) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  try {
    const expected = sign(encoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MarketingTokenPayload;
    if (payload.kind !== expectedKind || !Number.isInteger(payload.userId) || payload.userId <= 0) return null;
    if (!Number.isFinite(payload.exp) || (requireFresh && payload.exp < Math.floor(Date.now() / 1000))) return null;
    if (expectedKind === "click" && (!Number.isInteger(payload.jobId) || Number(payload.jobId) <= 0)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyMarketingToken(token: unknown, expectedKind: MarketingTokenKind): MarketingTokenPayload | null {
  return readMarketingToken(token, expectedKind, true);
}

/** Legacy signup emails, even expired ones, can open a public page, never a session. */
export async function legacySignupValuePath(token: unknown,
  getJob: (id: number) => Promise<{userId: number; jobType: string; status: string | null; campaign: string | null; step: string | null} | null | undefined>,
): Promise<string | null> {
  const payload = readMarketingToken(token, "click", false);
  if (!payload?.jobId) return null;
  const job = await getJob(payload.jobId);
  if (!job || job.userId !== payload.userId || job.jobType !== "drip"
    || job.status !== "sent" || job.campaign !== "signup_unpaid" || !job.step
    || !Object.hasOwn(SIGNUP_VALUE_LINKS, job.step)) return null;
  return SIGNUP_VALUE_LINKS[job.step as keyof typeof SIGNUP_VALUE_LINKS];
}

export function buildMarketingUrl(path: string, token: string): string {
  const base = (process.env.PUBLIC_APP_URL || "https://aitracker.run").replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
