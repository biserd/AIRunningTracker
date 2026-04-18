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
  status: "registered" | "denied" | "unsupported" | "error";
  message?: string;
}

export async function registerForPushAsync(): Promise<RegisterPushResult> {
  if (!Device.isDevice) {
    return { token: null, status: "unsupported", message: "Push only works on a real device." };
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
    return { token: null, status: "denied", message: "Notifications permission denied." };
  }

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
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
    return {
      token: null,
      status: "error",
      message: e instanceof Error ? e.message : "Failed to register for push.",
    };
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
