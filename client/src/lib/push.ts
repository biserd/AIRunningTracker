// Unified push abstraction.
// On web → uses the browser Push API + service worker.
// Inside a Capacitor native build → uses @capacitor/push-notifications and
// registers the APNs/FCM token with the same backend endpoint.

import { apiRequest } from "./queryClient";

const SW_PATH = "/sw.js";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

export function isNative(): boolean {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export function isWebPushSupported(): boolean {
  if (isNative()) return true;
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPermissionState(): NotificationPermission | "unsupported" {
  if (isNative()) return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isNative()) return null;
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (isNative()) return "granted";
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  // Native (Capacitor) path
  if (isNative()) {
    try {
      const mod: any = await import("@capacitor/push-notifications");
      const PushNotifications = mod.PushNotifications;
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return { ok: false, reason: "permission_denied" };

      return new Promise((resolve) => {
        PushNotifications.addListener("registration", async (token: { value: string }) => {
          const platform = window.Capacitor?.getPlatform?.() === "ios" ? "ios" : "android";
          try {
            await apiRequest("/api/push/subscribe", "POST", {
              platform,
              nativeToken: token.value,
              userAgent: navigator.userAgent,
            });
            resolve({ ok: true });
          } catch (err: any) {
            resolve({ ok: false, reason: err?.message || "register_failed" });
          }
        });
        PushNotifications.addListener("registrationError", (err: any) => {
          resolve({ ok: false, reason: err?.error || "registration_error" });
        });
        PushNotifications.register();
      });
    } catch (err: any) {
      return { ok: false, reason: err?.message || "capacitor_unavailable" };
    }
  }

  // Web push path
  if (!isWebPushSupported()) return { ok: false, reason: "unsupported" };

  const perm = await requestPushPermission();
  if (perm !== "granted") return { ok: false, reason: "permission_denied" };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "no_sw" };

  // Wait for SW to activate
  if (!reg.active) {
    await new Promise<void>((resolve) => {
      const sw = reg.installing || reg.waiting;
      if (!sw) return resolve();
      sw.addEventListener("statechange", () => {
        if (sw.state === "activated") resolve();
      });
    });
  }

  const keyResp = await fetch("/api/push/vapid-public-key");
  if (!keyResp.ok) return { ok: false, reason: "no_vapid_key" };
  const { publicKey } = await keyResp.json();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await apiRequest("/api/push/subscribe", "POST", {
    platform: "web",
    endpoint: sub.endpoint,
    p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
    auth: arrayBufferToBase64(sub.getKey("auth")),
    userAgent: navigator.userAgent,
  });

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (isNative()) {
    try {
      const mod: any = await import("@capacitor/push-notifications");
      await mod.PushNotifications.removeAllListeners();
    } catch {}
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await apiRequest("/api/push/unsubscribe", "POST", { endpoint: sub.endpoint });
    } catch {}
    await sub.unsubscribe();
  }
}

export async function getCurrentSubscriptionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  native: boolean;
}> {
  const native = isNative();
  const supported = isWebPushSupported();
  const permission = getPermissionState();
  let subscribed = false;
  if (!native && supported) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    subscribed = !!sub;
  }
  return { supported, permission, subscribed, native };
}
