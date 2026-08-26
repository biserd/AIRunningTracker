import crypto from "crypto";
import { eq } from "drizzle-orm";
import { emailJobs } from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";
import { dripCampaignService } from "./dripCampaign";

function verifySignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean {
  const id = Array.isArray(headers["svix-id"]) ? headers["svix-id"]![0] : headers["svix-id"];
  const timestamp = Array.isArray(headers["svix-timestamp"]) ? headers["svix-timestamp"]![0] : headers["svix-timestamp"];
  const signatures = Array.isArray(headers["svix-signature"]) ? headers["svix-signature"]!.join(" ") : headers["svix-signature"];
  const configured = process.env.RESEND_WEBHOOK_SECRET;
  if (!id || !timestamp || !signatures || !configured) return false;
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() / 1000 - numericTimestamp) > 5 * 60) return false;
  const encodedSecret = configured.startsWith("whsec_") ? configured.slice(6) : configured;
  let secret: Buffer;
  try { secret = Buffer.from(encodedSecret, "base64"); } catch { return false; }
  const expected = crypto.createHmac("sha256", secret).update(`${id}.${timestamp}.${rawBody.toString("utf8")}`).digest("base64");
  return signatures.split(/\s+/).some((entry) => {
    const candidate = entry.startsWith("v1,") ? entry.slice(3) : entry;
    const a = Buffer.from(candidate); const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export async function handleResendWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<"ok" | "invalid"> {
  if (!verifySignature(rawBody, headers)) return "invalid";
  const event = JSON.parse(rawBody.toString("utf8")) as { type?: string; data?: { email_id?: string; to?: string[] | string } };
  const providerMessageId = event.data?.email_id;
  if (!providerMessageId || !event.type) return "ok";
  const [job] = await db.select().from(emailJobs).where(eq(emailJobs.providerMessageId, providerMessageId)).limit(1);
  if (!job) return "ok";
  if (event.type === "email.delivered") await storage.updateEmailJob(job.id, { deliveredAt: new Date() });
  if (event.type === "email.bounced" || event.type === "email.complained") {
    await storage.updateEmailJob(job.id, event.type === "email.bounced" ? { bouncedAt: new Date() } : { complainedAt: new Date() });
    await storage.updateUser(job.userId, { marketingOptOut: true, marketingConsentStatus: "suppressed", marketingSuppressionReason: event.type });
    await dripCampaignService.exitCampaignForUser(job.userId, event.type);
  }
  return "ok";
}
