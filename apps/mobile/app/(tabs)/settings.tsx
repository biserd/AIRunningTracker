import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { registerForPushAsync, unregisterPushAsync, sendTestPush } from "../../lib/push";
import type { User } from "../../types";

const PUSH_TOKEN_KEY = "ra_push_token";

export default function SettingsScreen() {
  const { user, signOut, setUser } = useAuth();
  const qc = useQueryClient();

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PUSH_TOKEN_KEY).then(setPushToken);
  }, []);

  const updateUnits = useMutation({
    mutationFn: (unitPreference: "km" | "miles") =>
      api<{ user: User }>(`/api/users/${user!.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ unitPreference }),
      }),
    onSuccess: (res) => {
      setUser(res.user);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e) => Alert.alert("Couldn't update", (e as Error).message),
  });

  const togglePush = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      if (enabled) {
        const result = await registerForPushAsync();
        if (result.status === "registered" && result.token) {
          await SecureStore.setItemAsync(PUSH_TOKEN_KEY, result.token);
          setPushToken(result.token);
        } else {
          Alert.alert(
            "Push not enabled",
            result.message || "Could not enable notifications.",
          );
        }
      } else if (pushToken) {
        await unregisterPushAsync(pushToken);
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
        setPushToken(null);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const onTestPush = async () => {
    try {
      await sendTestPush();
      Alert.alert("Sent", "Test push fired. Watch for it on your device.");
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    }
  };

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const unit = user?.unitPreference || "km";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </Text>

        <Card title="Account">
          <Text className="text-base font-medium text-slate-900 dark:text-white">
            {user?.firstName || user?.username || "Runner"}
          </Text>
          <Text className="text-sm text-slate-500 mt-0.5">{user?.email || "—"}</Text>
          {user?.subscriptionTier ? (
            <Text className="text-xs text-strava font-semibold mt-2 uppercase">
              {user.subscriptionTier}
            </Text>
          ) : null}
        </Card>

        <Card title="Units">
          <View className="flex-row gap-2 mt-1">
            {(["km", "miles"] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => updateUnits.mutate(u)}
                disabled={updateUnits.isPending}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  unit === u
                    ? "bg-strava border-strava"
                    : "border-slate-300 dark:border-slate-600"
                } active:opacity-80`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    unit === u ? "text-white" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {u === "km" ? "Kilometers" : "Miles"}
                </Text>
              </Pressable>
            ))}
          </View>
          {updateUnits.isPending ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#fc4c02" />
              <Text className="text-xs text-slate-500">Saving…</Text>
            </View>
          ) : null}
        </Card>

        <Card title="Push notifications">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-medium text-slate-900 dark:text-white">
                Enable on this device
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Coach recaps and important alerts.
              </Text>
            </View>
            {pushBusy ? (
              <ActivityIndicator color="#fc4c02" />
            ) : (
              <Switch
                value={!!pushToken}
                onValueChange={togglePush}
                trackColor={{ true: "#fc4c02" }}
              />
            )}
          </View>
          {pushToken ? (
            <Pressable
              onPress={onTestPush}
              className="mt-4 bg-slate-100 dark:bg-slate-700 rounded-xl py-3 items-center active:opacity-80"
            >
              <Text className="text-sm font-medium text-slate-900 dark:text-white">
                Send test push
              </Text>
            </Pressable>
          ) : null}
        </Card>

        <Pressable
          onPress={onSignOut}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-red-200 dark:border-red-900 active:opacity-80"
        >
          <Text className="text-center text-red-600 font-semibold">Sign out</Text>
        </Pressable>

        <Text className="text-xs text-center text-slate-400 mt-2">
          Manage Strava connection and billing on aitracker.run.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
        {title}
      </Text>
      {children}
    </View>
  );
}
