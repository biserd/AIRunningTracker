import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Settings
        </Text>

        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <Text className="text-xs uppercase text-slate-400 tracking-wide">
            Account
          </Text>
          <Text className="text-base font-medium text-slate-900 dark:text-white mt-2">
            {user?.firstName || user?.username || "Runner"}
          </Text>
          <Text className="text-sm text-slate-500 mt-0.5">{user?.email || "—"}</Text>
          {user?.subscriptionTier ? (
            <Text className="text-xs text-strava font-semibold mt-2 uppercase">
              {user.subscriptionTier}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onSignOut}
          className="mt-6 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-red-200 dark:border-red-900 active:opacity-80"
        >
          <Text className="text-center text-red-600 font-semibold">Sign out</Text>
        </Pressable>

        <Text className="text-xs text-center text-slate-400 mt-8">
          Manage Strava connection, billing, and notifications on aitracker.run.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
