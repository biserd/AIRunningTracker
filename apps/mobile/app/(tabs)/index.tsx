import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import { formatDistance, formatPace } from "../../lib/format";
import type {
  Activity,
  RecoveryState,
  InjuryRiskAnalysis,
  CoachRecap,
  RunnerScore,
  DashboardData,
} from "../../types";

function greetingPart() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function dateLine() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  const m = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const w = d.toLocaleDateString(undefined, { weekday: "short" });
  return `${m} · ${w}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";
  const distUnit = unit === "miles" ? "miles" : "km";
  const paceUnit = unit === "miles" ? "/ mile" : "/ km";

  const recovery = useQuery<RecoveryState, Error>({
    queryKey: ["recovery", user?.id],
    queryFn: () => api<RecoveryState>(`/api/performance/recovery/${user!.id}`),
    enabled: !!user?.id,
  });

  const lastRun = useQuery<Activity | null, Error>({
    queryKey: ["last-activity"],
    queryFn: async () => {
      const res = await api<{ activities: Activity[] } | Activity[]>(
        "/api/activities?page=1&pageSize=1",
      );
      const list = Array.isArray(res) ? res : (res.activities ?? []);
      return list[0] ?? null;
    },
  });

  const injury = useQuery<InjuryRiskAnalysis, Error>({
    queryKey: ["injury-risk", user?.id],
    queryFn: () => api<InjuryRiskAnalysis>(`/api/ml/injury-risk/${user!.id}`),
    enabled: !!user?.id,
    retry: (failure, err) =>
      err instanceof ApiError && err.status === 403 ? false : failure < 1,
  });

  const recap = useQuery<{ recaps: CoachRecap[] } | CoachRecap[], Error>({
    queryKey: ["latest-recap"],
    queryFn: () => api("/api/coach-recaps?limit=1"),
    enabled: !!user?.id,
    retry: (failure, err) =>
      err instanceof ApiError && err.status === 403 ? false : failure < 1,
  });
  const latestRecap: CoachRecap | undefined = Array.isArray(recap.data)
    ? recap.data[0]
    : recap.data?.recaps?.[0];

  const score = useQuery<RunnerScore, Error>({
    queryKey: ["runner-score", user?.id],
    queryFn: () => api<RunnerScore>(`/api/runner-score/${user!.id}`),
    enabled: !!user?.id,
  });

  const dashboard = useQuery<DashboardData, Error>({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/api/dashboard"),
    enabled: !!user?.id,
  });

  const [syncing, setSyncing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      await api(`/api/strava/sync/${user.id}`, {
        method: "POST",
        body: JSON.stringify({ maxActivities: 30 }),
      });
    } catch {
      /* swallow */
    } finally {
      setSyncing(false);
      await Promise.all([
        recovery.refetch(),
        lastRun.refetch(),
        injury.refetch(),
        recap.refetch(),
        score.refetch(),
        dashboard.refetch(),
      ]);
    }
  }, [user?.id, recovery, lastRun, injury, recap, score, dashboard]);

  const isInitial =
    recovery.isLoading && lastRun.isLoading && !recovery.data && !lastRun.data;
  const isRefreshing =
    syncing ||
    recovery.isRefetching ||
    lastRun.isRefetching ||
    injury.isRefetching ||
    recap.isRefetching;

  const name = user?.firstName || user?.username || "Runner";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {isInitial ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        >
          {/* Greeting */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: colors.ink,
                letterSpacing: -0.6,
                lineHeight: 33,
              }}
            >
              {greetingPart()},{"\n"}
              <Text style={{ color: colors.brand }}>{name}.</Text>
            </Text>
            <Text style={{ fontSize: 14, color: colors.ink2, marginTop: 6 }}>
              {dateLine()}
            </Text>
          </View>

          {/* Last Run hero */}
          <LastRunHero
            activity={lastRun.data ?? null}
            unit={unit}
            distUnit={distUnit}
            paceUnit={paceUnit}
            recap={latestRecap}
          />

          {/* Status duo */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <ReadinessCard r={recovery.data} loading={recovery.isLoading} />
            <InjuryCard
              data={injury.data}
              isPremiumGate={
                injury.error instanceof ApiError && injury.error.status === 403
              }
              loading={injury.isLoading}
            />
          </View>

          {/* Weekly whisper */}
          <WeeklyWhisper dashboard={dashboard.data} unit={unit} />

          {/* Runner Score quiet card */}
          <ScoreQuiet score={score.data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ─── Last Run hero ──────────────────────────────────── */
function LastRunHero({
  activity,
  unit,
  distUnit,
  paceUnit,
  recap,
}: {
  activity: Activity | null;
  unit: "km" | "miles";
  distUnit: string;
  paceUnit: string;
  recap?: CoachRecap;
}) {
  const router = useRouter();

  if (!activity) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 0.5,
          borderColor: colors.line,
          padding: 24,
          marginTop: 8,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: colors.ink3, textTransform: "uppercase" }}>
          No runs yet
        </Text>
        <Text style={{ fontSize: 15, color: colors.ink2, marginTop: 8, lineHeight: 22 }}>
          Pull down to sync from Strava and your latest run will land here.
        </Text>
      </View>
    );
  }

  const distVal = formatDistance(activity.distance, unit).split(" ")[0];
  const paceVal = formatPace(activity.averageSpeed, unit).split(" ")[0];
  const seconds = activity.movingTime || 0;
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const hh = Math.floor(mm / 60);
  const timeStr = hh > 0 ? `${hh}:${String(mm % 60).padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
  const summary = recap?.coachingCue || recap?.recapBullets?.[0];

  return (
    <Pressable
      onPress={() => router.push(`/activity/${activity.id}`)}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: colors.line,
        padding: 24,
        marginTop: 8,
        opacity: pressed ? 0.96 : 1,
        ...shadow.card,
      })}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.ink3, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {shortDate(activity.startDate)}
        </Text>
        <View style={{ backgroundColor: colors.brandLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "700", color: colors.brand, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {activity.name}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", marginBottom: summary ? 18 : 0 }}>
        <HeroStat value={distVal} unit={distUnit} />
        <View style={{ width: 1, backgroundColor: colors.line, marginHorizontal: 18, alignSelf: "stretch", marginVertical: 4 }} />
        <HeroStat value={paceVal} unit={paceUnit} />
        <View style={{ width: 1, backgroundColor: colors.line, marginHorizontal: 18, alignSelf: "stretch", marginVertical: 4 }} />
        <HeroStat value={timeStr} unit="time" />
      </View>

      {/* AI Summary */}
      {summary ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.brand,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            AI Summary
          </Text>
          <Text numberOfLines={4} style={{ fontSize: 15, color: colors.ink2, lineHeight: 23 }}>
            {summary}
          </Text>
          <Pressable
            onPress={() => router.push("/tools/coach-recaps")}
            style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.brand }}>Read full brief</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

function HeroStat({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={{ minWidth: 0, flexShrink: 1 }}>
      <Text style={{ fontSize: 30, fontWeight: "700", color: colors.ink, letterSpacing: -1, lineHeight: 32 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "500", color: colors.ink3, marginTop: 4 }}>
        {unit}
      </Text>
    </View>
  );
}

/* ─── Readiness card ─────────────────────────────────── */
function ReadinessCard({ r, loading }: { r: RecoveryState | undefined; loading: boolean }) {
  const router = useRouter();

  let color = colors.ink2;
  let value: string = "—";
  let tagBg = colors.surfaceAlt;
  let tagText = colors.ink2;
  let tagDot = colors.ink3;
  let tagLabel = "—";

  if (r) {
    const score = Math.round(r.freshnessScore);
    value = String(score);
    if (r.readyToRun) {
      color = colors.green;
      tagBg = colors.greenBg;
      tagText = colors.green;
      tagDot = colors.green;
      tagLabel = "Go run";
    } else if (r.riskLevel === "moderate") {
      color = colors.amber;
      tagBg = colors.amberBg;
      tagText = colors.amber;
      tagDot = colors.amber;
      tagLabel = "Take it easy";
    } else {
      color = colors.red;
      tagBg = colors.redBg;
      tagText = colors.red;
      tagDot = colors.red;
      tagLabel = "Recover";
    }
  }

  return (
    <Pressable
      onPress={() => router.push("/tools/recovery")}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 0.5,
        borderColor: colors.line,
        paddingVertical: 18,
        paddingHorizontal: 16,
        opacity: pressed ? 0.92 : 1,
        ...shadow.card,
      })}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
        Readiness
      </Text>
      {loading && !r ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <>
          <Text style={{ fontSize: 28, fontWeight: "700", color, letterSpacing: -0.8, lineHeight: 30, marginBottom: 6 }}>
            {value}
          </Text>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: tagBg }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tagDot }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: tagText }}>{tagLabel}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

/* ─── Injury risk card ───────────────────────────────── */
function InjuryCard({
  data,
  isPremiumGate,
  loading,
}: {
  data: InjuryRiskAnalysis | undefined;
  isPremiumGate: boolean;
  loading: boolean;
}) {
  const router = useRouter();

  let color = colors.ink2;
  let value = "—";
  let tagBg = colors.surfaceAlt;
  let tagText = colors.ink2;
  let tagDot = colors.ink3;
  let tagLabel = "—";

  if (isPremiumGate) {
    value = "Pro";
    color = colors.purple;
    tagBg = colors.purpleBg;
    tagText = colors.purple;
    tagDot = colors.purple;
    tagLabel = "Unlock";
  } else if (data) {
    const lvl = (data.riskLevel || "").toLowerCase();
    if (lvl === "low") {
      value = "Low";
      color = colors.green;
      tagBg = colors.greenBg;
      tagText = colors.green;
      tagDot = colors.green;
      tagLabel = "All clear";
    } else if (lvl === "high") {
      value = "High";
      color = colors.red;
      tagBg = colors.redBg;
      tagText = colors.red;
      tagDot = colors.red;
      tagLabel = "Back off";
    } else {
      value = "Med";
      color = colors.amber;
      tagBg = colors.amberBg;
      tagText = colors.amber;
      tagDot = colors.amber;
      tagLabel = "Monitor load";
    }
  }

  return (
    <Pressable
      onPress={() => router.push("/tools/injury-risk")}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 0.5,
        borderColor: colors.line,
        paddingVertical: 18,
        paddingHorizontal: 16,
        opacity: pressed ? 0.92 : 1,
        ...shadow.card,
      })}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
        Injury Risk
      </Text>
      {loading && !data && !isPremiumGate ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <>
          <Text style={{ fontSize: 28, fontWeight: "700", color, letterSpacing: -0.8, lineHeight: 30, marginBottom: 6 }}>
            {value}
          </Text>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: tagBg }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tagDot }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: tagText }}>{tagLabel}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

/* ─── Weekly whisper row ─────────────────────────────── */
function WeeklyWhisper({ dashboard, unit }: { dashboard: DashboardData | undefined; unit: "km" | "miles" }) {
  const router = useRouter();
  const stats = dashboard?.stats;
  const u = unit === "miles" ? "miles" : "km";
  const sub = stats
    ? `${stats.weeklyTotalActivities} runs · ${stats.weeklyTotalDistance} ${u} this week`
    : "Sync to see this week's progress";

  return (
    <Pressable
      onPress={() => router.push("/tools/coach-recaps")}
      style={({ pressed }) => ({
        marginTop: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.line,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.85 : 1,
        ...shadow.card,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.brandLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 2 }}>
          Weekly Debrief
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.ink2 }}>
          {sub}
        </Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.brand }}>View →</Text>
    </Pressable>
  );
}

/* ─── Runner Score quiet card ─────────────────────────── */
function ScoreQuiet({ score }: { score: RunnerScore | undefined }) {
  return (
    <Link href="/score" asChild>
      <Pressable
        style={({ pressed }) => ({
          marginTop: 16,
          paddingVertical: 16,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.92 : 1,
          ...shadow.card,
        })}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
            Runner Score
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink2 }}>
            {score
              ? `Better than ${Math.round(score.percentile)}% of runners`
              : "Updated after every run"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
          <Text style={{ fontSize: 40, fontWeight: "700", color: colors.brand, letterSpacing: -2, lineHeight: 40 }}>
            {score ? Math.round(score.totalScore) : "—"}
          </Text>
          {score ? (
            <Text style={{ fontSize: 20, fontWeight: "600", color: colors.ink2, paddingBottom: 4 }}>
              {score.grade}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
