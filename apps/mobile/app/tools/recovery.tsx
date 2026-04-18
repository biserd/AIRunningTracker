import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import type { RecoveryState } from "../../types";

const RISK_COLOR: Record<string, string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const NEXT_STEP_LABEL: Record<string, string> = {
  rest: "🛌 Rest day",
  easy: "🚶 Easy run",
  workout: "💪 Workout",
  long_run: "🏃 Long run",
  recovery: "🧘 Recovery run",
};

export default function RecoveryScreen() {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["recovery", user?.id],
    queryFn: () => api<RecoveryState>(`/api/performance/recovery/${user!.id}`),
    enabled: !!user?.id,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Recovery",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
              tintColor="#fc4c02"
            />
          }
        >
          {q.isLoading ? (
            <View className="items-center mt-12">
              <ActivityIndicator color="#fc4c02" />
            </View>
          ) : !q.data ? (
            <Text className="text-sm text-slate-500 text-center mt-12">
              No recovery data yet.
            </Text>
          ) : (
            <RecoveryContent r={q.data} />
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function RecoveryContent({ r }: { r: RecoveryState }) {
  const riskColor = RISK_COLOR[r.riskLevel] || "#94a3b8";
  return (
    <>
      <View
        className="rounded-2xl p-5"
        style={{ backgroundColor: r.readyToRun ? "#10b981" : "#f97316" }}
      >
        <Text className="text-xs uppercase tracking-wide text-white/80">
          Status
        </Text>
        <Text className="text-2xl font-bold text-white mt-1">
          {r.readyToRun ? "Ready to run" : "Take it easy"}
        </Text>
        <Text className="text-sm text-white/90 mt-2 leading-5">{r.statusMessage}</Text>
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
          Recommended next
        </Text>
        <Text className="text-lg font-semibold text-slate-900 dark:text-white">
          {NEXT_STEP_LABEL[r.recommendedNextStep] || r.recommendedNextStep}
        </Text>
        <Text className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-5">
          {r.recoveryMessage}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Stat
          label="Freshness"
          value={`${Math.round(r.freshnessScore)}`}
          suffix="/100"
        />
        <Stat
          label="Risk"
          value={r.riskLevel}
          color={riskColor}
          capitalize
        />
        <Stat
          label="Days off"
          value={`${r.daysSinceLastRun}`}
        />
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
          Training load
        </Text>
        <Row label="Acute (last 7 days)" value={`${r.acuteLoadKm.toFixed(1)} km`} />
        <Row label="Chronic (last 28 days)" value={`${r.chronicLoadKm.toFixed(1)} km`} />
        <Row
          label="Acute / chronic ratio"
          value={r.acuteChronicRatio.toFixed(2)}
          hint={
            r.acuteChronicRatio > 1.5
              ? "High — overreaching"
              : r.acuteChronicRatio < 0.8
                ? "Low — detraining risk"
                : "Sweet spot"
          }
        />
      </View>

      {r.lastRunDate ? (
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <Text className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Last run
          </Text>
          <Text className="text-sm font-medium text-slate-900 dark:text-white">
            {r.lastRunName || "Run"}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {formatDate(r.lastRunDate)}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function Stat({
  label,
  value,
  suffix,
  color,
  capitalize,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  capitalize?: boolean;
}) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
      <Text className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Text>
      <Text
        className={`text-xl font-bold mt-1 ${capitalize ? "capitalize" : ""}`}
        style={{ color: color || "#0f172a" }}
      >
        {value}
        {suffix ? <Text className="text-sm text-slate-400">{suffix}</Text> : null}
      </Text>
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
