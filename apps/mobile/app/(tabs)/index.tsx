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
import { Link } from "expo-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from "../../lib/format";
import type { Activity, DashboardData } from "../../types";

export default function HomeScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";

  const dashboard = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => api<DashboardData>(`/api/dashboard/${user!.id}`),
    enabled: !!user?.id,
  });

  const activities = useQuery({
    queryKey: ["activities"],
    queryFn: () => api<Activity[]>("/api/activities?limit=30"),
  });

  const onRefresh = useCallback(() => {
    dashboard.refetch();
    activities.refetch();
  }, [dashboard, activities]);

  const stats = dashboard.data?.quickStats;
  const isLoading = activities.isLoading;
  const isRefreshing = activities.isRefetching || dashboard.isRefetching;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fc4c02" />
        </View>
      ) : (
        <FlatList
          data={activities.data || []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#fc4c02"
            />
          }
          ListHeaderComponent={
            <View className="mb-2">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                Hi {user?.firstName || user?.username || "Runner"} 👋
              </Text>
              {stats ? (
                <View className="mt-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
                    This week
                  </Text>
                  <View className="flex-row gap-4">
                    <BigStat
                      label="Distance"
                      value={formatDistance((stats.thisWeekDistance || 0) * 1000, unit)}
                    />
                    <BigStat label="Runs" value={String(stats.thisWeekRuns ?? 0)} />
                    <BigStat
                      label="Streak"
                      value={`${stats.currentStreak ?? 0}d`}
                    />
                  </View>
                  <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                  <View className="flex-row gap-4">
                    <SmallStat
                      label="This month"
                      value={formatDistance((stats.thisMonthDistance || 0) * 1000, unit)}
                    />
                    <SmallStat
                      label="Weekly avg"
                      value={formatDistance((stats.weeklyAverage || 0) * 1000, unit)}
                    />
                  </View>
                </View>
              ) : null}
              <Text className="text-sm text-slate-500 mt-5 mb-1">
                Recent activities
              </Text>
            </View>
          }
          ListEmptyComponent={
            activities.error ? (
              <View className="items-center mt-12">
                <Text className="text-base text-slate-600 dark:text-slate-400 text-center px-6">
                  {(activities.error as Error).message}
                </Text>
                <Pressable
                  onPress={() => activities.refetch()}
                  className="mt-4 bg-strava px-5 py-3 rounded-lg active:opacity-80"
                >
                  <Text className="text-white font-medium">Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View className="items-center mt-12">
                <Text className="text-base text-slate-500">No activities yet.</Text>
                <Text className="text-sm text-slate-400 mt-1">
                  Connect Strava on the web to sync runs.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => <ActivityCard activity={item} unit={unit} />}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityCard({ activity, unit }: { activity: Activity; unit: "km" | "miles" }) {
  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 active:opacity-80">
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
          <Text className="text-slate-400 text-lg">›</Text>
        </View>
        <View className="flex-row mt-3 gap-4">
          <Stat label="Distance" value={formatDistance(activity.distance, unit)} />
          <Stat label="Time" value={formatDuration(activity.movingTime)} />
          <Stat label="Pace" value={formatPace(activity.averageSpeed, unit)} />
        </View>
      </Pressable>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-xl font-bold text-slate-900 dark:text-white mt-1">{value}</Text>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
        {value}
      </Text>
    </View>
  );
}
