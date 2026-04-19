import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  Card,
  EmptyState,
  PremiumGate,
} from "../../components/ios";
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
  A: "#2D7A1F",
  B: "#3F9F2A",
  C: "#C26020",
  D: "#D9742B",
  F: "#D9342B",
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

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Activity" back="Back" />

      {detail.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : detail.error || !activity ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center" }}>
            {(detail.error as Error)?.message || "Activity not found"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          {/* TITLE */}
          <View>
            <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.6 }}>
              {activity.name}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
              {formatDate(activity.startDate)} · {formatTimeOnly(activity.startDate)} · {activity.type}
            </Text>
          </View>

          {/* COACH VERDICT */}
          {verdict.isLoading ? (
            <Card>
              <ActivityIndicator color={colors.brand} />
            </Card>
          ) : verdict.data ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: GRADE_COLOR[verdict.data.grade] || colors.faint,
                  }}
                >
                  <Text style={{ fontSize: 32, fontWeight: "700", color: "#fff" }}>
                    {verdict.data.grade}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 0.6,
                      color: colors.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    Coach Verdict
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 2 }}>
                    {verdict.data.gradeLabel}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Effort {verdict.data.effortScore}/100 · {verdict.data.consistencyDescription}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: colors.text, marginTop: 12, lineHeight: 21 }}>
                {verdict.data.summary}
              </Text>

              {verdict.data.evidenceBullets?.length ? (
                <View style={{ marginTop: 12, gap: 6 }}>
                  {verdict.data.evidenceBullets.map((b, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                      <Text>
                        {b.type === "positive" ? "✅" : b.type === "negative" ? "⚠️" : "•"}
                      </Text>
                      <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}>
                        {b.text}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {verdict.data.nextSteps?.length ? (
                <View
                  style={{
                    marginTop: 14,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 0.6,
                      color: colors.muted,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Next steps
                  </Text>
                  {verdict.data.nextSteps.map((s, i) => (
                    <Text key={i} style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                      → {s}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : verdictPremiumGate ? (
            <PremiumGate
              feature="Coach Verdict"
              description="Upgrade on aitracker.run to unlock per-run AI grading and recaps."
            />
          ) : null}

          {/* COACH RECAP */}
          {recap.data?.recap ? (
            <View
              style={{
                backgroundColor: "#FFF5F1",
                borderWidth: 0.5,
                borderColor: "rgba(252,76,2,0.25)",
                borderLeftWidth: 3,
                borderLeftColor: colors.brand,
                borderRadius: 18,
                padding: 16,
                ...shadow.card,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  color: colors.brand,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Coach Recap
              </Text>
              {(recap.data.recap.recapBullets || []).map((b, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
                  <Text style={{ color: colors.brand }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}>{b}</Text>
                </View>
              ))}
              {recap.data.recap.coachingCue ? (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 0.6,
                      color: colors.muted,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Cue for next run
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                    {recap.data.recap.coachingCue}
                  </Text>
                </View>
              ) : null}
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>Next:</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                  {NEXT_STEP_LABEL[recap.data.recap.nextStep] || recap.data.recap.nextStep}
                </Text>
              </View>
              {recap.data.recap.nextStepRationale ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 }}>
                  {recap.data.recap.nextStepRationale}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* HERO STATS */}
          <Card>
            <View style={{ flexDirection: "row", marginBottom: 14 }}>
              <HeroStat label="Distance" value={formatDistance(activity.distance, unit)} />
              <HeroStat label="Time" value={formatDuration(activity.movingTime)} />
            </View>
            <View style={{ flexDirection: "row" }}>
              <HeroStat label="Pace" value={formatPace(activity.averageSpeed, unit)} />
              <HeroStat
                label="Elevation"
                value={formatElevation(activity.totalElevationGain, unit)}
              />
            </View>
          </Card>

          {/* HEART & CADENCE */}
          {(activity.averageHeartrate || activity.maxHeartrate || activity.averageCadence) && (
            <Card>
              <SectionLabel style={{ marginLeft: 0 }}>Heart & Cadence</SectionLabel>
              <View style={{ flexDirection: "row" }}>
                <SmallStat
                  label="Avg HR"
                  value={
                    activity.averageHeartrate
                      ? `${Math.round(activity.averageHeartrate)} bpm`
                      : "—"
                  }
                />
                <SmallStat
                  label="Max HR"
                  value={
                    activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : "—"
                  }
                />
                <SmallStat
                  label="Cadence"
                  value={
                    activity.averageCadence
                      ? `${Math.round(activity.averageCadence * 2)} spm`
                      : "—"
                  }
                />
              </View>
            </Card>
          )}

          {/* EFFICIENCY */}
          {efficiency.data ? (
            <Card>
              <SectionLabel style={{ marginLeft: 0 }}>Efficiency</SectionLabel>
              <View style={{ flexDirection: "row" }}>
                <SmallStat
                  label="Decoupling"
                  value={
                    efficiency.data.aerobicDecoupling != null
                      ? `${efficiency.data.aerobicDecoupling.toFixed(1)}%`
                      : "—"
                  }
                />
                <SmallStat
                  label="Pacing"
                  value={`${Math.round(efficiency.data.pacingStability)}/100`}
                />
                <SmallStat
                  label="Cadence drift"
                  value={
                    efficiency.data.cadenceDrift != null
                      ? `${efficiency.data.cadenceDrift.toFixed(1)}%`
                      : "—"
                  }
                />
              </View>
              <View style={{ marginTop: 12, gap: 4 }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  • {DECOUPLING_LABEL[efficiency.data.decouplingLabel]}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  • {PACING_LABEL[efficiency.data.pacingLabel]}
                </Text>
                {efficiency.data.firstHalfPace != null &&
                efficiency.data.secondHalfPace != null ? (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    • Negative split:{" "}
                    {(
                      efficiency.data.firstHalfPace - efficiency.data.secondHalfPace
                    ).toFixed(1)}
                    s/{unit === "miles" ? "mi" : "km"}
                  </Text>
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* DATA QUALITY */}
          {quality.data && quality.data.totalDataPoints > 0 ? (
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <SectionLabel style={{ marginLeft: 0, marginBottom: 0 }}>
                  Data Quality
                </SectionLabel>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color:
                      quality.data.score >= 80
                        ? colors.successText
                        : quality.data.score >= 60
                          ? colors.warningText
                          : colors.danger,
                  }}
                >
                  {Math.round(quality.data.score)}/100
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <SmallStat label="HR" value={`${Math.round(quality.data.hrQuality)}%`} />
                <SmallStat label="GPS" value={`${Math.round(quality.data.gpsQuality)}%`} />
                <SmallStat label="Pauses" value={`${Math.round(quality.data.pauseQuality)}%`} />
              </View>
              {quality.data.flags?.length ? (
                <View style={{ marginTop: 12, gap: 4 }}>
                  {quality.data.flags.slice(0, 3).map((f, i) => (
                    <Text key={i} style={{ fontSize: 12, color: colors.warningText }}>
                      ⚠️ {f}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* SPLITS */}
          <Card>
            <SectionLabel style={{ marginLeft: 0 }}>Splits</SectionLabel>
            {perf.isLoading ? (
              <ActivityIndicator color={colors.brand} />
            ) : laps && laps.length > 0 ? (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    paddingBottom: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={[headStyle, { width: 28 }]}>#</Text>
                  <Text style={[headStyle, { flex: 1 }]}>Distance</Text>
                  <Text style={[headStyle, { flex: 1 }]}>Time</Text>
                  <Text style={[headStyle, { flex: 1, textAlign: "right" }]}>Pace</Text>
                </View>
                {laps.slice(0, 30).map((lap) => (
                  <View
                    key={lap.lap_index}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 7,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ width: 28, fontSize: 13, color: colors.muted }}>
                      {lap.lap_index}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                      {formatDistance(lap.distance, unit)}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                      {formatDuration(lap.moving_time)}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: "right" }}>
                      {formatPace(lap.average_speed, unit)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState title="No splits available for this activity" />
            )}
          </Card>

          {/* LOCATION */}
          {activity.startLatitude && activity.startLongitude ? (
            <Card>
              <SectionLabel style={{ marginLeft: 0 }}>Start Location</SectionLabel>
              <Text style={{ fontSize: 14, color: colors.text }}>
                {activity.startLatitude.toFixed(4)}, {activity.startLongitude.toFixed(4)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.faint, marginTop: 6 }}>
                Map view coming soon
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const headStyle = {
  fontSize: 11,
  fontWeight: "700" as const,
  letterSpacing: 0.5,
  color: colors.muted,
  textTransform: "uppercase" as const,
};

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.6,
          color: colors.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 26,
          fontWeight: "700",
          color: colors.text,
          marginTop: 4,
          letterSpacing: -0.8,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.5,
          color: colors.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
