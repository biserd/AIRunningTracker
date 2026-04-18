import { useCallback, useState } from "react";
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
import { MiniBarChart } from "../../components/MiniBarChart";
import type {
  Activity,
  DashboardData,
  RunnerScore,
  ChartResponse,
} from "../../types";

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
    queryFn: async () => {
      const res = await api<{ activities: Activity[] } | Activity[]>(
        "/api/activities?page=1&pageSize=30",
      );
      return Array.isArray(res) ? res : (res.activities ?? []);
    },
  });

  const score = useQuery({
    queryKey: ["runner-score", user?.id],
    queryFn: () => api<RunnerScore>(`/api/runner-score/${user!.id}`),
    enabled: !!user?.id,
  });

  const chart = useQuery({
    queryKey: ["chart", user?.id, "30days"],
    queryFn: () =>
      api<ChartResponse>(`/api/chart/${user!.id}?range=30days`),
    enabled: !!user?.id,
  });

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setSyncError(null);
    setSyncing(true);
    try {
      await api(`/api/strava/sync/${user.id}`, {
        method: "POST",
        body: JSON.stringify({ maxActivities: 30 }),
      });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
      await Promise.all([
        dashboard.refetch(),
        activities.refetch(),
        score.refetch(),
        chart.refetch(),
      ]);
    }
  }, [user?.id, dashboard, activities, score, chart]);

  const stats = dashboard.data?.stats;
  const isInitialLoading = activities.isLoading && !activities.data;
  const isRefreshing =
    syncing ||
    activities.isRefetching ||
    dashboard.isRefetching ||
    score.isRefetching ||
    chart.isRefetching;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      {isInitialLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fc4c02" />
        </View>
      ) : (
        <FlatList
          data={activities.data || []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#fc4c02" />
          }
          ListHeaderComponent={
            <View className="gap-3 mb-2">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                Hi {user?.firstName || user?.username || "Runner"} 👋
              </Text>

              {score.data ? <RunnerScoreCard score={score.data} /> : null}

              {stats ? <StatsSummary stats={stats} unit={unit} /> : null}

              {chart.data?.chartData?.length ? (
                <Card title="Distance trend (last 30 days)">
                  <MiniBarChart
                    data={chart.data.chartData.map((c) => ({
                      label: c.week,
                      value: c.distance,
                    }))}
                    unitSuffix={` ${unit === "miles" ? "mi" : "km"}`}
                  />
                </Card>
              ) : null}

              <View className="flex-row items-center justify-between mt-3 mb-1">
                <Text className="text-sm text-slate-500">
                  Recent activities ({activities.data?.length ?? 0})
                </Text>
                <Text className="text-[11px] text-slate-400">Pull down to sync</Text>
              </View>
              {syncError ? (
                <Text className="text-xs text-red-500 mt-1">Sync: {syncError}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            activities.error ? (
              <ErrorState
                message={(activities.error as Error).message}
                onRetry={() => activities.refetch()}
              />
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

function RunnerScoreCard({ score }: { score: RunnerScore }) {
  const trend = score.trends.weeklyChange;
  const trendColor =
    trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-slate-400";
  const trendArrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  return (
    <View className="bg-gradient-to-br from-strava to-orange-600 bg-strava rounded-2xl p-5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xs uppercase tracking-wide text-white/80">
            Runner Score
          </Text>
          <View className="flex-row items-baseline gap-2 mt-1">
            <Text className="text-5xl font-bold text-white">{score.totalScore}</Text>
            <Text className="text-xl font-semibold text-white/90">{score.grade}</Text>
          </View>
          <Text className="text-xs text-white/80 mt-1">
            Top {Math.max(1, 100 - Math.round(score.percentile))}% of runners
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-sm font-semibold ${trendColor}`}>
            {trendArrow} {Math.abs(trend).toFixed(1)}
          </Text>
          <Text className="text-[10px] text-white/70">vs last week</Text>
        </View>
      </View>
      <View className="flex-row gap-2 mt-4">
        <Component label="Consistency" value={score.components.consistency} />
        <Component label="Performance" value={score.components.performance} />
        <Component label="Volume" value={score.components.volume} />
        <Component label="Improvement" value={score.components.improvement} />
      </View>
    </View>
  );
}

function Component({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 bg-white/15 rounded-lg p-2">
      <Text className="text-[9px] uppercase text-white/70" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-base font-bold text-white mt-0.5">
        {Math.round(value)}<Text className="text-xs text-white/60">/25</Text>
      </Text>
    </View>
  );
}

function StatsSummary({
  stats,
  unit,
}: {
  stats: NonNullable<DashboardData["stats"]>;
  unit: "km" | "miles";
}) {
  const u = unit === "miles" ? "mi" : "km";
  const recColor =
    stats.recovery === "Good"
      ? "bg-green-100 text-green-700"
      : stats.recovery === "Moderate"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

  return (
    <Card title="This week">
      <View className="flex-row gap-4">
        <BigStat
          label="Distance"
          value={`${stats.weeklyTotalDistance} ${u}`}
          change={stats.weeklyDistanceChange}
        />
        <BigStat
          label="Runs"
          value={String(stats.weeklyTotalActivities)}
          change={stats.weeklyActivitiesChange}
        />
        <BigStat label="Avg pace" value={`${stats.weeklyAvgPace}/${u}`} />
      </View>
      <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[11px] uppercase tracking-wide text-slate-400">
            Recovery
          </Text>
          <Text className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full self-start ${recColor}`}>
            {stats.recovery}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] uppercase tracking-wide text-slate-400">
            This month
          </Text>
          <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {stats.monthlyTotalDistance} {u} • {stats.monthlyTotalActivities} runs
          </Text>
        </View>
      </View>
    </Card>
  );
}

function BigStat({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number | null;
}) {
  const showChange = change !== null && change !== undefined;
  const positive = (change ?? 0) > 0;
  const arrow = positive ? "↑" : (change ?? 0) < 0 ? "↓" : "";
  const color = positive
    ? "text-green-500"
    : (change ?? 0) < 0
      ? "text-red-500"
      : "text-slate-400";

  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-lg font-bold text-slate-900 dark:text-white mt-1" numberOfLines={1}>
        {value}
      </Text>
      {showChange ? (
        <Text className={`text-[10px] font-medium mt-0.5 ${color}`}>
          {arrow} {Math.abs(change!)}%
        </Text>
      ) : null}
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
      <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">{title}</Text>
      {children}
    </View>
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
          <Mini label="Distance" value={formatDistance(activity.distance, unit)} />
          <Mini label="Time" value={formatDuration(activity.movingTime)} />
          <Mini label="Pace" value={formatPace(activity.averageSpeed, unit)} />
        </View>
      </Pressable>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center mt-12">
      <Text className="text-base text-slate-600 dark:text-slate-400 text-center px-6">
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        className="mt-4 bg-strava px-5 py-3 rounded-lg active:opacity-80"
      >
        <Text className="text-white font-medium">Try again</Text>
      </Pressable>
    </View>
  );
}
