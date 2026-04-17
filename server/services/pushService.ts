// Web push service: VAPID setup, subscription persistence, and push delivery.
// Native mobile push (Expo) will be added as a separate dispatch branch later.

import webpush from "web-push";
import { storage } from "../storage";
import type { PushSubscription as DbPushSubscription } from "@shared/schema";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@aitracker.run";
const VAPID_SETTING_PUBLIC = "vapid_public_key";
const VAPID_SETTING_PRIVATE = "vapid_private_key";

let vapidReady = false;
let cachedPublicKey: string | null = null;

async function ensureVapid(): Promise<{ publicKey: string; privateKey: string }> {
  // 1) Env wins
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    if (!vapidReady) {
      webpush.setVapidDetails(VAPID_SUBJECT, envPub, envPriv);
      vapidReady = true;
      cachedPublicKey = envPub;
    }
    return { publicKey: envPub, privateKey: envPriv };
  }

  // 2) DB-stored keys (auto-generated on first run)
  let pub = await storage.getSystemSetting(VAPID_SETTING_PUBLIC);
  let priv = await storage.getSystemSetting(VAPID_SETTING_PRIVATE);

  if (!pub || !priv) {
    const generated = webpush.generateVAPIDKeys();
    pub = generated.publicKey;
    priv = generated.privateKey;
    await storage.setSystemSetting(VAPID_SETTING_PUBLIC, pub);
    await storage.setSystemSetting(VAPID_SETTING_PRIVATE, priv);
    console.log("[Push] Generated and stored new VAPID key pair");
  }

  if (!vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
    vapidReady = true;
    cachedPublicKey = pub;
  }
  return { publicKey: pub, privateKey: priv };
}

export async function getPublicVapidKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;
  const { publicKey } = await ensureVapid();
  return publicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SendResult {
  attempted: number;
  delivered: number;
  removed: number;
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<SendResult> {
  await ensureVapid();
  const subs = await storage.getPushSubscriptionsByUserId(userId);
  const result: SendResult = { attempted: 0, delivered: 0, removed: 0 };
  if (subs.length === 0) return result;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    data: { url: payload.url || "/dashboard", ...(payload.data || {}) },
  });

  for (const sub of subs) {
    if (!sub.enabled) continue;

    if (sub.platform === "web") {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
      result.attempted++;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json
        );
        result.delivered++;
        await storage.touchPushSubscription(sub.id);
      } catch (err: any) {
        const status = err?.statusCode;
        // 404/410 → subscription expired/unsubscribed → remove
        if (status === 404 || status === 410) {
          await storage.deletePushSubscription(sub.id);
          result.removed++;
          console.log(`[Push] Removed expired subscription ${sub.id} for user ${userId}`);
        } else {
          console.error(`[Push] Failed to send to subscription ${sub.id}:`, err?.message || err);
        }
      }
    } else {
      // Native mobile push (Expo) will land in a separate dispatch branch.
      console.log(`[Push] Skipping native ${sub.platform} subscription (no native provider configured yet)`);
    }
  }

  return result;
}

export const pushService = {
  ensureVapid,
  getPublicVapidKey,
  sendPushToUser,
};
