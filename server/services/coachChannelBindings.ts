import crypto from "node:crypto";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  coachAgentCallbackEvents,
  coachChannelBindings,
  coachChannelLinkTokens,
  users,
  type User,
} from "@shared/schema";
import { canAccessCapability } from "@shared/entitlements";
import { isStrongApplicationSecret } from "../config/security";
import {
  issueCoachAgentRunnerGrant,
  revokeAllCoachAgentRunnerGrants,
} from "../mcp/oauthService";
import { MCP_ISSUER, MCP_RESOURCE } from "../mcp/contract";

const LINK_TTL_MS = 10 * 60 * 1000;
const CALLBACK_TOLERANCE_SECONDS = 5 * 60;
const WEBHOOK_TIMEOUT_MS = 5_000;
const LINK_COOLDOWN_MS = 30 * 1000;

export class CoachChannelError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CoachChannelError";
  }
}

const telegramBindingSchema = z.object({
  event_type: z.literal("telegram.binding.complete"),
  link_token: z.string().regex(/^ra_tg_link_[A-Za-z0-9_-]{43}$/),
  telegram_user_id: z.string().regex(/^\d{1,20}$/),
  telegram_chat_id: z.string().regex(/^-?\d{1,20}$/),
  telegram_chat_type: z.literal("private"),
}).strict();

export type TelegramBindingCallback = z.infer<typeof telegramBindingSchema>;

export function isMultiRunnerCoachEnabled(): boolean {
  // Public launch default: enabled unless operations explicitly uses the
  // emergency kill switch. The existing variable name is retained so current
  // Replit deployments do not need a coordinated secret rename.
  return process.env.COACH_MULTI_RUNNER_PILOT_ENABLED !== "false";
}

function requireStrongSecret(name: string): string {
  const value = process.env[name];
  if (!isStrongApplicationSecret(value)) {
    throw new CoachChannelError("service_unavailable", `${name} is not configured`, 503);
  }
  return value;
}

export function hashCoachLinkToken(rawToken: string): string {
  return crypto.createHash("sha256").update(`coach-link-v1:${rawToken}`).digest("hex");
}

export function hashCoachProviderIdentity(kind: "user" | "chat", rawIdentity: string): string {
  return crypto
    .createHmac("sha256", requireStrongSecret("CHANNEL_IDENTITY_HASH_SECRET"))
    .update(`telegram:${kind}:v1:${rawIdentity}`)
    .digest("hex");
}

function safeEqualHex(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyHermesBindingSignature(input: {
  rawBody: Buffer;
  timestampHeader?: string;
  signatureHeader?: string;
  nowSeconds?: number;
}): void {
  const timestamp = input.timestampHeader || "";
  const timestampNumber = Number(timestamp);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!/^\d{10}$/.test(timestamp) || !Number.isSafeInteger(timestampNumber) || Math.abs(nowSeconds - timestampNumber) > CALLBACK_TOLERANCE_SECONDS) {
    throw new CoachChannelError("invalid_signature", "Callback timestamp is invalid or expired", 401);
  }
  const signature = input.signatureHeader?.match(/^v1=([a-f0-9]{64})$/i)?.[1] || "";
  const expected = crypto
    .createHmac("sha256", requireStrongSecret("COACH_BINDING_CALLBACK_SECRET"))
    .update(`${timestamp}.`)
    .update(input.rawBody)
    .digest("hex");
  if (!safeEqualHex(signature, expected)) {
    throw new CoachChannelError("invalid_signature", "Callback signature is invalid", 401);
  }
}

export async function getCoachChannelStatus(user: User) {
  const featureEnabled = isMultiRunnerCoachEnabled();
  const hasPremiumAccess = canAccessCapability(user, "ai_coach");
  const available = featureEnabled && hasPremiumAccess;
  // Always surface an existing binding so a runner can disconnect even after
  // their subscription changes or operations activates the kill switch.
  const [binding] = await db.select({
    bindingId: coachChannelBindings.bindingId,
    status: coachChannelBindings.status,
    linkedAt: coachChannelBindings.linkedAt,
  }).from(coachChannelBindings).where(and(
    eq(coachChannelBindings.userId, user.id),
    eq(coachChannelBindings.channel, "telegram"),
    isNull(coachChannelBindings.revokedAt),
  )).limit(1);
  return {
    available,
    accessReason: !featureEnabled
      ? "feature_disabled"
      : hasPremiumAccess
        ? "available"
        : "premium_required",
    telegram: {
      connected: binding?.status === "active",
      status: binding?.status || "not_connected",
      linkedAt: binding?.linkedAt?.toISOString() || null,
    },
  };
}

export async function createTelegramLink(user: User) {
  if (!isMultiRunnerCoachEnabled()) {
    throw new CoachChannelError("feature_disabled", "Telegram coach connections are temporarily unavailable", 503);
  }
  if (!canAccessCapability(user, "ai_coach")) {
    throw new CoachChannelError("premium_required", "AI Coach is a Premium feature", 403);
  }
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!botUsername || !/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) {
    throw new CoachChannelError("service_unavailable", "Telegram coach is not configured", 503);
  }

  const [recentLink] = await db.select({ id: coachChannelLinkTokens.id }).from(coachChannelLinkTokens).where(and(
    eq(coachChannelLinkTokens.userId, user.id),
    eq(coachChannelLinkTokens.channel, "telegram"),
    gt(coachChannelLinkTokens.createdAt, new Date(Date.now() - LINK_COOLDOWN_MS)),
  )).limit(1);
  if (recentLink) throw new CoachChannelError("rate_limited", "Please wait 30 seconds before creating another link", 429);

  const rawToken = `ra_tg_link_${crypto.randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  await db.transaction(async (tx) => {
    await tx.update(coachChannelLinkTokens).set({ revokedAt: new Date() }).where(and(
      eq(coachChannelLinkTokens.userId, user.id),
      eq(coachChannelLinkTokens.channel, "telegram"),
      isNull(coachChannelLinkTokens.consumedAt),
      isNull(coachChannelLinkTokens.revokedAt),
    ));
    await tx.insert(coachChannelLinkTokens).values({
      userId: user.id,
      channel: "telegram",
      tokenHash: hashCoachLinkToken(rawToken),
      expiresAt,
    });
  });
  return {
    deepLink: `https://t.me/${botUsername}?start=${encodeURIComponent(rawToken)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function completeTelegramBinding(input: {
  rawBody: Buffer;
  timestampHeader?: string;
  signatureHeader?: string;
  deliveryId?: string;
}) {
  if (!isMultiRunnerCoachEnabled()) {
    throw new CoachChannelError("feature_disabled", "Telegram coach connections are temporarily unavailable", 503);
  }
  verifyHermesBindingSignature(input);
  if (!input.deliveryId || !/^[A-Za-z0-9:_-]{16,128}$/.test(input.deliveryId)) {
    throw new CoachChannelError("invalid_delivery", "A valid delivery ID is required", 400);
  }
  let payload: TelegramBindingCallback;
  try {
    payload = telegramBindingSchema.parse(JSON.parse(input.rawBody.toString("utf8")));
  } catch {
    throw new CoachChannelError("invalid_payload", "Telegram binding payload is invalid", 400);
  }

  try {
    await db.insert(coachAgentCallbackEvents).values({ deliveryId: input.deliveryId });
  } catch (error: any) {
    if (error?.code === "23505") throw new CoachChannelError("duplicate_delivery", "Callback was already processed", 409);
    throw error;
  }

  const tokenHash = hashCoachLinkToken(payload.link_token);
  const providerUserHash = hashCoachProviderIdentity("user", payload.telegram_user_id);
  const providerChatHash = hashCoachProviderIdentity("chat", payload.telegram_chat_id);
  const bindingId = `ra_binding_${crypto.randomBytes(24).toString("base64url")}`;
  const now = new Date();

  const provisioned = await db.transaction(async (tx) => {
    const [link] = await tx.select().from(coachChannelLinkTokens).where(and(
      eq(coachChannelLinkTokens.tokenHash, tokenHash),
      eq(coachChannelLinkTokens.channel, "telegram"),
      isNull(coachChannelLinkTokens.consumedAt),
      isNull(coachChannelLinkTokens.revokedAt),
      gt(coachChannelLinkTokens.expiresAt, now),
    )).limit(1);
    if (!link) throw new CoachChannelError("invalid_link", "Link is invalid, expired, or already used", 400);

    const [runner] = await tx.select().from(users).where(eq(users.id, link.userId)).limit(1);
    if (!runner || !canAccessCapability(runner, "ai_coach")) {
      throw new CoachChannelError("premium_required", "AI Coach access is no longer active", 403);
    }

    const [identityConflict] = await tx.select({ userId: coachChannelBindings.userId }).from(coachChannelBindings).where(and(
      eq(coachChannelBindings.channel, "telegram"),
      eq(coachChannelBindings.providerUserHash, providerUserHash),
      isNull(coachChannelBindings.revokedAt),
      ne(coachChannelBindings.userId, link.userId),
    )).limit(1);
    const [chatConflict] = await tx.select({ userId: coachChannelBindings.userId }).from(coachChannelBindings).where(and(
      eq(coachChannelBindings.channel, "telegram"),
      eq(coachChannelBindings.providerChatHash, providerChatHash),
      isNull(coachChannelBindings.revokedAt),
      ne(coachChannelBindings.userId, link.userId),
    )).limit(1);
    if (identityConflict || chatConflict) {
      throw new CoachChannelError("identity_already_linked", "This Telegram account is already linked", 409);
    }

    await tx.update(coachChannelBindings).set({ status: "revoked", revokedAt: now }).where(and(
      eq(coachChannelBindings.userId, link.userId),
      eq(coachChannelBindings.channel, "telegram"),
      isNull(coachChannelBindings.revokedAt),
    )).returning({ tokenId: coachChannelBindings.mcpTokenId });
    const consumed = await tx.update(coachChannelLinkTokens).set({ consumedAt: now }).where(and(
      eq(coachChannelLinkTokens.id, link.id),
      isNull(coachChannelLinkTokens.consumedAt),
      isNull(coachChannelLinkTokens.revokedAt),
    )).returning({ id: coachChannelLinkTokens.id });
    if (consumed.length !== 1) throw new CoachChannelError("invalid_link", "Link was already used", 409);

    const [binding] = await tx.insert(coachChannelBindings).values({
      bindingId,
      userId: link.userId,
      channel: "telegram",
      providerUserHash,
      providerChatHash,
      status: "provisioning",
    }).returning({ id: coachChannelBindings.id, userId: coachChannelBindings.userId });
    return { binding };
  });

  // Revoke all token generations, not only the original token ID recorded on
  // the binding, because OAuth refresh rotates into a new database row.
  await revokeAllCoachAgentRunnerGrants(provisioned.binding.userId);

  try {
    const grant = await issueCoachAgentRunnerGrant(provisioned.binding.userId);
    await db.update(coachChannelBindings).set({
      mcpTokenId: grant.tokenId,
      status: "active",
      linkedAt: new Date(),
    }).where(and(
      eq(coachChannelBindings.id, provisioned.binding.id),
      eq(coachChannelBindings.userId, provisioned.binding.userId),
      eq(coachChannelBindings.status, "provisioning"),
      isNull(coachChannelBindings.revokedAt),
    ));
    const { tokenId: _tokenId, ...publicGrant } = grant;
    return {
      binding_id: bindingId,
      status: "active",
      token_endpoint: `${MCP_ISSUER}/mcp/oauth/token`,
      ...publicGrant,
    };
  } catch (error) {
    await db.update(coachChannelBindings).set({ status: "provisioning_failed", revokedAt: new Date() }).where(and(
      eq(coachChannelBindings.id, provisioned.binding.id),
      eq(coachChannelBindings.userId, provisioned.binding.userId),
    ));
    throw error;
  }
}

async function deliverSignedCoachEvent(bindingId: string, payload: Record<string, unknown>, eventId: string): Promise<boolean> {
  const url = process.env.COACH_AGENT_WEBHOOK_URL;
  const secret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  if (!url || !isStrongApplicationSecret(secret)) return false;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ event_id: eventId, occurred_at: new Date().toISOString(), binding_id: bindingId, ...payload });
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RunAnalytics-Signature": `v1=${signature}`,
        "X-RunAnalytics-Timestamp": timestamp,
        "X-RunAnalytics-Delivery": eventId,
      },
      body,
      signal: controller.signal,
    });
    return response.ok || response.status === 409;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function emitBoundCoachActivityEvent(userId: number, activityId: number): Promise<boolean> {
  if (!isMultiRunnerCoachEnabled()) return false;
  const [binding] = await db.select({ bindingId: coachChannelBindings.bindingId, runner: users })
    .from(coachChannelBindings)
    .innerJoin(users, eq(users.id, coachChannelBindings.userId))
    .where(and(
    eq(coachChannelBindings.userId, userId),
    eq(coachChannelBindings.channel, "telegram"),
    eq(coachChannelBindings.status, "active"),
    isNull(coachChannelBindings.revokedAt),
  )).limit(1);
  if (!binding || !canAccessCapability(binding.runner, "ai_coach")) return false;
  const secret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  if (!isStrongApplicationSecret(secret)) return false;
  const eventId = crypto.createHmac("sha256", secret).update(`activity.ready:${binding.bindingId}:${activityId}`).digest("hex");
  return deliverSignedCoachEvent(binding.bindingId, { event_type: "activity.ready", activityId }, eventId);
}

export async function disconnectTelegram(userId: number) {
  const now = new Date();
  const revoked = await db.transaction(async (tx) => {
    await tx.update(coachChannelLinkTokens).set({ revokedAt: now }).where(and(
      eq(coachChannelLinkTokens.userId, userId),
      eq(coachChannelLinkTokens.channel, "telegram"),
      isNull(coachChannelLinkTokens.consumedAt),
      isNull(coachChannelLinkTokens.revokedAt),
    ));
    return tx.update(coachChannelBindings).set({ status: "revoked", revokedAt: now }).where(and(
      eq(coachChannelBindings.userId, userId),
      eq(coachChannelBindings.channel, "telegram"),
      isNull(coachChannelBindings.revokedAt),
    )).returning({ bindingId: coachChannelBindings.bindingId });
  });
  for (const binding of revoked) {
    const secret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
    if (isStrongApplicationSecret(secret)) {
      const eventId = crypto.createHmac("sha256", secret).update(`binding.revoked:${binding.bindingId}`).digest("hex");
      await deliverSignedCoachEvent(binding.bindingId, { event_type: "binding.revoked" }, eventId);
    }
  }
  return { disconnected: revoked.length > 0 };
}

export const coachChannelContract = {
  resource: MCP_RESOURCE,
  linkTtlSeconds: LINK_TTL_MS / 1000,
  callbackToleranceSeconds: CALLBACK_TOLERANCE_SECONDS,
};
