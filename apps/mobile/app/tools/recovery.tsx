import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { colors } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  Card,
  StatusBanner,
  LoadPills,
  EmptyState,
} from "../../components/ios";
import type { RecoveryState } from "../../types";

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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Recovery" back="Tools" />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => q.refetch()}
            tintColor={colors.brand}
          />
        }
      >
        {q.isLoading ? (
          <View style={{ paddingTop: 48, alignItems: "center" }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : !q.data ? (
          <EmptyState title="No recovery data yet" />
        ) : (
          <RecoveryContent r={q.data} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecoveryContent({ r }: { r: RecoveryState }) {
  return (
    <>
      <StatusBanner
        label="Status"
        title={r.readyToRun ? "Ready to run" : "Take it easy"}
        body={r.statusMessage}
        tone={r.readyToRun ? "success" : "warning"}
      />

      <Card>
        <SectionLabel style={{ marginLeft: 0 }}>Recommended Next</SectionLabel>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -0.3,
          }}
        >
          {NEXT_STEP_LABEL[r.recommendedNextStep] || r.recommendedNextStep}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
          {r.recoveryMessage}
        </Text>
      </Card>

      <View>
        <SectionLabel>Snapshot</SectionLabel>
        <LoadPills
          items={[
            { label: "Freshness", value: `${Math.round(r.freshnessScore)}`, sub: "/100" },
            {
              label: "Risk",
              value: r.riskLevel ? r.riskLevel.charAt(0).toUpperCase() + r.riskLevel.slice(1).toLowerCase() : "—",
              color:
                r.riskLevel === "low"
                  ? colors.successText
                  : r.riskLevel === "moderate"
                    ? colors.warningText
                    : colors.danger,
            },
            { label: "Days off", value: `${r.daysSinceLastRun}` },
          ]}
        />
      </View>

      <View>
        <SectionLabel>Training Load</SectionLabel>
        <Card padded={false}>
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
            isLast
          />
        </Card>
      </View>

      {r.lastRunDate ? (
        <Card>
          <SectionLabel style={{ marginLeft: 0 }}>Last Run</SectionLabel>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
            {r.lastRunName || "Run"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {formatDate(r.lastRunDate)}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

function Row({
  label,
  value,
  hint,
  isLast,
}: {
  label: string;
  value: string;
  hint?: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
        {hint ? (
          <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{value}</Text>
    </View>
  );
}
