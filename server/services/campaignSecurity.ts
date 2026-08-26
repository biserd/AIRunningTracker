import crypto from "crypto";

type MarketingTokenKind = "click" | "unsubscribe" | "attribution";

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
): string {
  const complete = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(complete), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyMarketingToken(token: unknown, expectedKind: MarketingTokenKind): MarketingTokenPayload | null {
  if (typeof token !== "string") return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  try {
    const expected = sign(encoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MarketingTokenPayload;
    if (payload.kind !== expectedKind || !Number.isInteger(payload.userId) || payload.userId <= 0) return null;
    if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (expectedKind === "click" && (!Number.isInteger(payload.jobId) || Number(payload.jobId) <= 0)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildMarketingUrl(path: string, token: string): string {
  const base = (process.env.PUBLIC_APP_URL || "https://aitracker.run").replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
