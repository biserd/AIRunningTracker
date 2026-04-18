import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { VO2MaxData, FitnessResponse, FitnessMetric } from "../../types";

const TREND_EMOJI: Record<string, string> = {
  improving: "📈",
  stable: "➡️",
  declining: "📉",
};

export default function FitnessScreen() {
  const { user } = useAuth();

  const vo2 = useQuery({
    queryKey: ["vo2max", user?.id],
    queryFn: () => api<VO2MaxData | null>(`/api/performance/vo2max/${user!.id}`),
    enabled: !!user?.id,
  });

  const fit = useQuery({
    queryKey: ["fitness", user?.id],
    queryFn: () => api<FitnessResponse>(`/api/fitness/${user!.id}?days=90`),
    enabled: !!user?.id,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Fitness & VO2 Max",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
          {/* VO2 MAX */}
          <Section title="VO2 Max">
            {vo2.isLoading ? (
              <ActivityIndicator color="#fc4c02" />
            ) : !vo2.data ? (
              <Text className="text-sm text-slate-500">
                Need a few more runs to estimate your VO2 Max.
              </Text>
            ) : (
              <View>
                <View className="flex-row items-baseline gap-3">
                  <Text className="text-5xl font-bold text-slate-900 dark:text-white">
                    {vo2.data.current.toFixed(1)}
                  </Text>
                  <Text className="text-sm text-slate-500">ml/kg/min</Text>
                  <Text className="ml-auto text-base">
                    {TREND_EMOJI[vo2.data.trend]}{" "}
                    <Text className="text-xs text-slate-500 capitalize">
                      {vo2.data.trend}
                    </Text>
                  </Text>
                </View>
                <Text className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-5">
                  {vo2.data.comparison}
                </Text>
                <View className="mt-4 gap-1">
                  <Row
                    label="From races"
                    value={`${vo2.data.raceVO2Max.toFixed(1)}`}
                    hint={vo2.data.raceComparison}
                  />
                  <Row
                    label="From training"
                    value={`${vo2.data.trainingVO2Max.toFixed(1)}`}
                    hint={vo2.data.trainingComparison}
                  />
                  <Row
                    label="Age-graded percentile"
                    value={`${Math.round(vo2.data.ageGradePercentile)}%`}
                  />
                  <Row
                    label="Target range"
                    value={`${vo2.data.targetRange.min.toFixed(1)} – ${vo2.data.targetRange.max.toFixed(1)}`}
                  />
                </View>
              </View>
            )}
          </Section>

          {/* CTL / ATL / TSB */}
          <Section title="Training load (CTL / ATL / TSB)">
            {fit.isLoading ? (
              <ActivityIndicator color="#fc4c02" />
            ) : !fit.data?.currentForm ? (
              <Text className="text-sm text-slate-500">
                No fitness data yet — log a few runs.
              </Text>
            ) : (
              <View>
                <View className="flex-row gap-3">
                  <Metric
                    label="Fitness"
                    sub="CTL · 42-day"
                    value={fit.data.currentForm.ctl.toFixed(1)}
                    color="#10b981"
                  />
                  <Metric
                    label="Fatigue"
                    sub="ATL · 7-day"
                    value={fit.data.currentForm.atl.toFixed(1)}
                    color="#f97316"
                  />
                  <Metric
                    label="Form"
                    sub="TSB"
                    value={fit.data.currentForm.tsb.toFixed(1)}
                    color={fit.data.currentForm.tsb < -10 ? "#ef4444" : "#6366f1"}
                  />
                </View>
                {fit.data.interpretation ? (
                  <Text className="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-5">
                    {typeof fit.data.interpretation === "string"
                      ? fit.data.interpretation
                      : fit.data.interpretation.description ||
                        fit.data.interpretation.label}
                  </Text>
                ) : null}

                {/* Sparkline */}
                <FitnessSpark metrics={fit.data.metrics.slice(-30)} />
              </View>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0">
      <View className="flex-1 pr-3">
        <Text className="text-sm text-slate-700 dark:text-slate-200">{label}</Text>
        {hint ? <Text className="text-[11px] text-slate-400 mt-0.5">{hint}</Text> : null}
      </View>
      <Text className="text-sm font-semibold text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}

function Metric({
  label,
  sub,
  value,
  color,
}: {
  label: string;
  sub: string;
  value: string;
  color: string;
}) {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
      <Text className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-xl font-bold mt-1" style={{ color }}>
        {value}
      </Text>
      <Text className="text-[10px] text-slate-400 mt-0.5">{sub}</Text>
    </View>
  );
}

function FitnessSpark({ metrics }: { metrics: FitnessMetric[] }) {
  if (metrics.length < 2) return null;
  const max = Math.max(...metrics.map((m) => Math.max(m.ctl, m.atl)));
  const min = Math.min(...metrics.map((m) => Math.min(m.tsb, 0)));
  const range = max - min || 1;
  const H = 60;

  return (
    <View className="mt-5">
      <Text className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">
        Last {metrics.length} days
      </Text>
      <View className="flex-row items-end" style={{ height: H, gap: 2 }}>
        {metrics.map((m, i) => {
          const ctlH = ((m.ctl - min) / range) * H;
          const atlH = ((m.atl - min) / range) * H;
          return (
            <View key={i} className="flex-1 items-center justify-end" style={{ height: H }}>
              <View
                style={{
                  width: "100%",
                  height: Math.max(2, ctlH),
                  backgroundColor: "#10b98155",
                  borderRadius: 2,
                  position: "absolute",
                  bottom: 0,
                }}
              />
              <View
                style={{
                  width: "100%",
                  height: Math.max(2, atlH),
                  backgroundColor: "#f97316aa",
                  borderRadius: 2,
                  position: "absolute",
                  bottom: 0,
                  opacity: 0.7,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-4 mt-2">
        <Legend dot="#10b981" label="Fitness" />
        <Legend dot="#f97316" label="Fatigue" />
      </View>
    </View>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text className="text-[10px] text-slate-500">{label}</Text>
    </View>
  );
}
