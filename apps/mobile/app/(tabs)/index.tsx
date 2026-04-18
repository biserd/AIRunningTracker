import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDistance, formatDuration, formatPace, formatDate } from "../../lib/format";
import type { Activity } from "../../types";

export default function ActivitiesScreen() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api<Activity[]>("/api/activities?limit=30"),
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Hi {user?.firstName || user?.username || "Runner"} 👋
        </Text>
        <Text className="text-sm text-slate-500 mt-1">Recent activities</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fc4c02" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-slate-600 dark:text-slate-400 text-center">
            {(error as Error).message}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-strava px-5 py-3 rounded-lg active:opacity-80"
          >
            <Text className="text-white font-medium">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#fc4c02"
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-base text-slate-500">No activities yet.</Text>
              <Text className="text-sm text-slate-400 mt-1">
                Connect Strava on the web to sync runs.
              </Text>
            </View>
          }
          renderItem={({ item }) => <ActivityCard activity={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-base font-semibold text-slate-900 dark:text-white"
            numberOfLines={1}
          >
            {activity.name}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {formatDate(activity.startDate)} • {activity.type}
          </Text>
        </View>
      </View>
      <View className="flex-row mt-3 gap-4">
        <Stat label="Distance" value={formatDistance(activity.distance)} />
        <Stat label="Time" value={formatDuration(activity.movingTime)} />
        <Stat label="Pace" value={formatPace(activity.averageSpeed)} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}
