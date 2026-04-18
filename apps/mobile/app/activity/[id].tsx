import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
  formatTimeOnly,
  formatElevation,
} from "../../lib/format";
import type { Activity } from "../../types";

interface ActivityDetailResponse {
  activity: Activity & {
    formattedDistance?: string;
    formattedPace?: string;
    formattedDuration?: string;
    distanceUnit?: string;
    paceUnit?: string;
    speedUnit?: string;
    formattedSpeed?: string;
  };
}

interface PerformanceResponse {
  activity: Activity;
  streams: Record<string, unknown> | null;
  laps: Array<{
    lap_index: number;
    distance: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number | null;
    total_elevation_gain?: number | null;
  }> | null;
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";

  const detail = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api<ActivityDetailResponse>(`/api/activities/${id}`),
    enabled: !!id,
  });

  const perf = useQuery({
    queryKey: ["activity", id, "performance"],
    queryFn: () => api<PerformanceResponse>(`/api/activities/${id}/performance`),
    enabled: !!id,
  });

  const activity = detail.data?.activity;
  const laps = perf.data?.laps;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full active:opacity-60"
        >
          <Text className="text-2xl text-slate-700 dark:text-slate-200">‹</Text>
        </Pressable>
        <Text className="text-base font-semibold text-slate-900 dark:text-white">
          Activity
        </Text>
      </View>

      {detail.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fc4c02" />
        </View>
      ) : detail.error || !activity ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-slate-600 dark:text-slate-400 text-center">
            {(detail.error as Error)?.message || "Activity not found"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          <View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {activity.name}
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              {formatDate(activity.startDate)} • {formatTimeOnly(activity.startDate)}{" "}
              • {activity.type}
            </Text>
          </View>

          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <View className="flex-row gap-4 mb-4">
              <HeroStat
                label="Distance"
                value={formatDistance(activity.distance, unit)}
              />
              <HeroStat label="Time" value={formatDuration(activity.movingTime)} />
            </View>
            <View className="flex-row gap-4">
              <HeroStat label="Pace" value={formatPace(activity.averageSpeed, unit)} />
              <HeroStat
                label="Elevation"
                value={formatElevation(activity.totalElevationGain, unit)}
              />
            </View>
          </View>

          {(activity.averageHeartrate || activity.maxHeartrate || activity.averageCadence) && (
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
                Heart & cadence
              </Text>
              <View className="flex-row gap-4">
                <Stat
                  label="Avg HR"
                  value={
                    activity.averageHeartrate
                      ? `${Math.round(activity.averageHeartrate)} bpm`
                      : "—"
                  }
                />
                <Stat
                  label="Max HR"
                  value={
                    activity.maxHeartrate
                      ? `${Math.round(activity.maxHeartrate)} bpm`
                      : "—"
                  }
                />
                <Stat
                  label="Cadence"
                  value={
                    activity.averageCadence
                      ? `${Math.round(activity.averageCadence * 2)} spm`
                      : "—"
                  }
                />
              </View>
            </View>
          )}

          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              Splits
            </Text>
            {perf.isLoading ? (
              <ActivityIndicator color="#fc4c02" />
            ) : laps && laps.length > 0 ? (
              <View className="gap-2">
                <View className="flex-row pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Text className="w-8 text-xs text-slate-400">#</Text>
                  <Text className="flex-1 text-xs text-slate-400">Distance</Text>
                  <Text className="flex-1 text-xs text-slate-400">Time</Text>
                  <Text className="flex-1 text-xs text-slate-400 text-right">Pace</Text>
                </View>
                {laps.slice(0, 30).map((lap) => (
                  <View key={lap.lap_index} className="flex-row py-1">
                    <Text className="w-8 text-sm text-slate-500">{lap.lap_index}</Text>
                    <Text className="flex-1 text-sm text-slate-900 dark:text-white">
                      {formatDistance(lap.distance, unit)}
                    </Text>
                    <Text className="flex-1 text-sm text-slate-900 dark:text-white">
                      {formatDuration(lap.moving_time)}
                    </Text>
                    <Text className="flex-1 text-sm text-slate-900 dark:text-white text-right">
                      {formatPace(lap.average_speed, unit)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-slate-500">
                No splits available for this activity.
              </Text>
            )}
          </View>

          {activity.startLatitude && activity.startLongitude ? (
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <Text className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Start location
              </Text>
              <Text className="text-sm text-slate-700 dark:text-slate-200">
                {activity.startLatitude.toFixed(4)}, {activity.startLongitude.toFixed(4)}
              </Text>
              <Text className="text-xs text-slate-400 mt-2">
                Map view coming soon
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
        {value}
      </Text>
    </View>
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
