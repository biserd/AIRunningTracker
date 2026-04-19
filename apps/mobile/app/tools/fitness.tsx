import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  Card,
  MetricHero,
  LoadPills,
  EmptyState,
} from "../../components/ios";
import type { VO2MaxData, FitnessResponse, FitnessMetric } from "../../types";

const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Fitness & VO2 Max" back="Tools" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* VO2 MAX */}
        <Card>
          {vo2.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : !vo2.data ? (
            <EmptyState
              title="VO2 Max not ready"
              body="Need a few more runs to estimate your aerobic capacity."
            />
          ) : (
            <>
              <MetricHero
                label="VO2 Max"
                value={vo2.data.current.toFixed(1)}
                unit="ml/kg/min"
                status={{
                  text: TREND_LABEL[vo2.data.trend] || vo2.data.trend,
                  tone: vo2.data.trend === "declining" ? "warning" : "success",
                }}
                context={vo2.data.comparison}
              />
              <View style={{ marginTop: 12 }}>
                <Row
                  label="From races"
                  value={vo2.data.raceVO2Max.toFixed(1)}
                  hint={vo2.data.raceComparison}
                />
                <Row
                  label="From training"
                  value={vo2.data.trainingVO2Max.toFixed(1)}
                  hint={vo2.data.trainingComparison}
                />
                <Row
                  label="Age-graded percentile"
                  value={`${Math.round(vo2.data.ageGradePercentile)}%`}
                />
                <Row
                  label="Target range"
                  value={`${vo2.data.targetRange.min.toFixed(1)} – ${vo2.data.targetRange.max.toFixed(1)}`}
                  isLast
                />
              </View>
            </>
          )}
        </Card>

        {/* CTL / ATL / TSB */}
        <View>
          <SectionLabel>Training Load</SectionLabel>
          {fit.isLoading ? (
            <Card>
              <ActivityIndicator color={colors.brand} />
            </Card>
          ) : !fit.data?.currentForm ? (
            <Card>
              <EmptyState title="No fitness data yet" body="Log a few runs to build your trend." />
            </Card>
          ) : (
            <>
              <LoadPills
                items={[
                  {
                    label: "Fitness",
                    value: fit.data.currentForm.ctl.toFixed(1),
                    sub: "CTL · 42-day",
                    color: colors.successText,
                  },
                  {
                    label: "Fatigue",
                    value: fit.data.currentForm.atl.toFixed(1),
                    sub: "ATL · 7-day",
                    color: colors.warningText,
                  },
                  {
                    label: "Form",
                    value: fit.data.currentForm.tsb.toFixed(1),
                    sub: "TSB",
                    color: fit.data.currentForm.tsb < -10 ? colors.danger : colors.info,
                  },
                ]}
              />
              {fit.data.interpretation ? (
                <Card style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
                    {typeof fit.data.interpretation === "string"
                      ? fit.data.interpretation
                      : fit.data.interpretation.description ||
                        fit.data.interpretation.label}
                  </Text>
                </Card>
              ) : null}
              <Card style={{ marginTop: 12 }}>
                <FitnessSpark metrics={fit.data.metrics.slice(-30)} />
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
        paddingVertical: 12,
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

function FitnessSpark({ metrics }: { metrics: FitnessMetric[] }) {
  if (metrics.length < 2) return null;
  const max = Math.max(...metrics.map((m) => Math.max(m.ctl, m.atl)));
  const min = Math.min(...metrics.map((m) => Math.min(m.tsb, 0)));
  const range = max - min || 1;
  const H = 64;

  return (
    <View>
      <SectionLabel style={{ marginLeft: 0, marginBottom: 12 }}>
        Last {metrics.length} days
      </SectionLabel>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: H, gap: 2 }}>
        {metrics.map((m, i) => {
          const ctlH = ((m.ctl - min) / range) * H;
          const atlH = ((m.atl - min) / range) * H;
          return (
            <View
              key={i}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: H }}
            >
              <View
                style={{
                  width: "100%",
                  height: Math.max(2, ctlH),
                  backgroundColor: "rgba(45,122,31,0.45)",
                  borderRadius: 2,
                  position: "absolute",
                  bottom: 0,
                }}
              />
              <View
                style={{
                  width: "100%",
                  height: Math.max(2, atlH),
                  backgroundColor: "rgba(194,96,32,0.55)",
                  borderRadius: 2,
                  position: "absolute",
                  bottom: 0,
                  opacity: 0.75,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
        <Legend dot={colors.successText} label="Fitness" />
        <Legend dot={colors.warningText} label="Fatigue" />
      </View>
    </View>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}
