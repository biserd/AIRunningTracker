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
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
  formatTimeOnly,
  formatElevation,
} from "../../lib/format";
import type {
  Activity,
  CoachVerdict,
  DataQuality,
  EfficiencyMetrics,
  CoachRecap,
} from "../../types";

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

const GRADE_COLOR: Record<string, string> = {
  A: "#10b981",
  B: "#22c55e",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

const DECOUPLING_LABEL: Record<string, string> = {
  excellent: "Excellent aerobic fitness",
  good: "Good aerobic shape",
  moderate: "Some aerobic drift",
  concerning: "High cardiac drift",
  unknown: "—",
};

const PACING_LABEL: Record<string, string> = {
  very_stable: "Very stable pacing",
  stable: "Stable pacing",
  variable: "Variable pacing",
  erratic: "Erratic pacing",
};

const NEXT_STEP_LABEL: Record<string, string> = {
  rest: "🛌 Rest day",
  easy: "🚶 Easy run",
  workout: "💪 Workout",
  long_run: "🏃 Long run",
  recovery: "🧘 Recovery run",
};

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

  const verdict = useQuery<CoachVerdict, Error>({
    queryKey: ["activity", id, "verdict"],
    queryFn: () => api<CoachVerdict>(`/api/activities/${id}/verdict`),
    enabled: !!id,
    retry: (failure, err) =>
      err instanceof ApiError && err.status === 403 ? false : failure < 1,
  });

  const quality = useQuery<DataQuality>({
    queryKey: ["activity", id, "quality"],
    queryFn: () => api<DataQuality>(`/api/activities/${id}/quality`),
    enabled: !!id,
  });

  const efficiency = useQuery<EfficiencyMetrics>({
    queryKey: ["activity", id, "efficiency"],
    queryFn: () => api<EfficiencyMetrics>(`/api/activities/${id}/efficiency`),
    enabled: !!id,
  });

  const recap = useQuery<{ recap: CoachRecap | null }, Error>({
    queryKey: ["activity", id, "coach-recap"],
    queryFn: () => api<{ recap: CoachRecap | null }>(`/api/activities/${id}/coach-recap`),
    enabled: !!id,
    retry: (failure, err) =>
      err instanceof ApiError && err.status === 403 ? false : failure < 1,
  });

  const activity = detail.data?.activity;
  const laps = perf.data?.laps;

  const verdictPremiumGate =
    verdict.error instanceof ApiError && verdict.error.status === 403;
  const recapPremiumGate =
    recap.error instanceof ApiError && recap.error.status === 403;

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

          {/* COACH VERDICT */}
          {verdict.isLoading ? (
            <Card>
              <ActivityIndicator color="#fc4c02" />
            </Card>
          ) : verdict.data ? (
            <View className="rounded-2xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <View className="flex-row items-center gap-4">
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: GRADE_COLOR[verdict.data.grade] || "#94a3b8" }}
                >
                  <Text className="text-3xl font-bold text-white">
                    {verdict.data.grade}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-wide text-slate-400">
                    Coach verdict
                  </Text>
                  <Text className="text-lg font-bold text-slate-900 dark:text-white">
                    {verdict.data.gradeLabel}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Effort {verdict.data.effortScore}/100 ·{" "}
                    {verdict.data.consistencyDescription}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-slate-700 dark:text-slate-200 mt-3 leading-5">
                {verdict.data.summary}
              </Text>

              {verdict.data.evidenceBullets?.length ? (
                <View className="mt-3 gap-1">
                  {verdict.data.evidenceBullets.map((b, i) => (
                    <View key={i} className="flex-row gap-2">
                      <Text>
                        {b.type === "positive"
                          ? "✅"
                          : b.type === "negative"
                            ? "⚠️"
                            : "•"}
                      </Text>
                      <Text className="flex-1 text-sm text-slate-700 dark:text-slate-200 leading-5">
                        {b.text}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {verdict.data.nextSteps?.length ? (
                <View className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                    Next steps
                  </Text>
                  {verdict.data.nextSteps.map((s, i) => (
                    <Text
                      key={i}
                      className="text-sm text-slate-700 dark:text-slate-200 leading-5"
                    >
                      → {s}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : verdictPremiumGate ? (
            <PremiumGate label="Coach Verdict" />
          ) : null}

          {/* COACH RECAP */}
          {recap.data?.recap ? (
            <View className="rounded-2xl p-5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
              <Text className="text-xs uppercase tracking-wide text-orange-700 dark:text-orange-300 mb-2">
                Coach recap
              </Text>
              {(recap.data.recap.recapBullets || []).map((b, i) => (
                <View key={i} className="flex-row gap-2 py-0.5">
                  <Text className="text-strava">•</Text>
                  <Text className="flex-1 text-sm text-slate-800 dark:text-slate-100 leading-5">
                    {b}
                  </Text>
                </View>
              ))}
              {recap.data.recap.coachingCue ? (
                <View className="mt-3 bg-white dark:bg-slate-800 rounded-lg p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                    Cue for next run
                  </Text>
                  <Text className="text-sm text-slate-900 dark:text-white">
                    {recap.data.recap.coachingCue}
                  </Text>
                </View>
              ) : null}
              <View className="mt-3 flex-row items-center gap-2">
                <Text className="text-[11px] text-slate-500">Next:</Text>
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {NEXT_STEP_LABEL[recap.data.recap.nextStep] || recap.data.recap.nextStep}
                </Text>
              </View>
              {recap.data.recap.nextStepRationale ? (
                <Text className="text-[11px] text-slate-500 mt-1 leading-4">
                  {recap.data.recap.nextStepRationale}
                </Text>
              ) : null}
            </View>
          ) : recapPremiumGate ? null /* gate already shown for verdict if premium */ : null}

          {/* HERO STATS */}
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

          {/* EFFICIENCY */}
          {efficiency.data ? (
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
                Efficiency
              </Text>
              <View className="flex-row gap-3">
                <Stat
                  label="Decoupling"
                  value={
                    efficiency.data.aerobicDecoupling != null
                      ? `${efficiency.data.aerobicDecoupling.toFixed(1)}%`
                      : "—"
                  }
                />
                <Stat
                  label="Pacing"
                  value={`${Math.round(efficiency.data.pacingStability)}/100`}
                />
                <Stat
                  label="Cadence drift"
                  value={
                    efficiency.data.cadenceDrift != null
                      ? `${efficiency.data.cadenceDrift.toFixed(1)}%`
                      : "—"
                  }
                />
              </View>
              <View className="mt-3 gap-1">
                <Text className="text-xs text-slate-500">
                  • {DECOUPLING_LABEL[efficiency.data.decouplingLabel]}
                </Text>
                <Text className="text-xs text-slate-500">
                  • {PACING_LABEL[efficiency.data.pacingLabel]}
                </Text>
                {efficiency.data.firstHalfPace != null &&
                efficiency.data.secondHalfPace != null ? (
                  <Text className="text-xs text-slate-500">
                    • Negative split:{" "}
                    {(
                      efficiency.data.firstHalfPace - efficiency.data.secondHalfPace
                    ).toFixed(1)}
                    s/{unit === "miles" ? "mi" : "km"}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* DATA QUALITY */}
          {quality.data && quality.data.totalDataPoints > 0 ? (
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs uppercase tracking-wide text-slate-400">
                  Data quality
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{
                    color:
                      quality.data.score >= 80
                        ? "#10b981"
                        : quality.data.score >= 60
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {Math.round(quality.data.score)}/100
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Stat label="HR" value={`${Math.round(quality.data.hrQuality)}%`} />
                <Stat label="GPS" value={`${Math.round(quality.data.gpsQuality)}%`} />
                <Stat label="Pauses" value={`${Math.round(quality.data.pauseQuality)}%`} />
              </View>
              {quality.data.flags?.length ? (
                <View className="mt-3 gap-1">
                  {quality.data.flags.slice(0, 3).map((f, i) => (
                    <Text key={i} className="text-xs text-orange-500">
                      ⚠️ {f}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* SPLITS */}
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
              <Text className="text-xs text-slate-400 mt-2">Map view coming soon</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PremiumGate({ label }: { label: string }) {
  return (
    <View className="rounded-2xl p-5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
      <Text className="text-sm font-semibold text-orange-700 dark:text-orange-300">
        {label} is a Premium feature
      </Text>
      <Text className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-1">
        Upgrade on aitracker.run to unlock per-run AI grading and recaps.
      </Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 items-center">
      {children}
    </View>
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
