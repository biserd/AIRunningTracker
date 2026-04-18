import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface RegisterPushResult {
  token: string | null;
  status: "registered" | "denied" | "unsupported" | "needs-eas-init" | "error";
  message?: string;
}

function getProjectId(): string | undefined {
  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  const fromEas = (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  return fromExtra || fromEas;
}

export async function registerForPushAsync(): Promise<RegisterPushResult> {
  if (!Device.isDevice) {
    return {
      token: null,
      status: "unsupported",
      message: "Push notifications only work on a physical device.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#fc4c02",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const ask = await Notifications.requestPermissionsAsync();
    status = ask.status;
  }
  if (status !== "granted") {
    return {
      token: null,
      status: "denied",
      message: "You denied notification permission. Enable it in Settings → RunAnalytics.",
    };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return {
      token: null,
      status: "needs-eas-init",
      message:
        "This Expo Go build is missing an EAS project ID. From apps/mobile run:\n\n  npx eas init\n\nThen restart Expo and try again.",
    };
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await api("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        platform: Platform.OS === "ios" ? "ios" : "android",
        nativeToken: token,
        userAgent: `Expo/${Constants.expoConfig?.version ?? "0.1.0"} ${Platform.OS}`,
      }),
    });
    return { token, status: "registered" };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    let friendly = raw;
    if (/projectId/i.test(raw)) {
      friendly =
        "Missing EAS project ID. From apps/mobile run `npx eas init`, then restart Expo.";
    } else if (/Firebase|FCM|google-services/i.test(raw)) {
      friendly =
        "Android push needs a Firebase config. Run an EAS build (not Expo Go) for full push support.";
    }
    return { token: null, status: "error", message: friendly };
  }
}

export async function unregisterPushAsync(token: string): Promise<void> {
  try {
    await api("/api/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ nativeToken: token }),
    });
  } catch {
    // best-effort
  }
}

export async function sendTestPush(): Promise<void> {
  await api("/api/push/test", { method: "POST" });
}
