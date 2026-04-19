import { useCallback, useState, type ReactNode } from "react";
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
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import { formatDistance, formatPace, formatDate } from "../../lib/format";
import type {
  Activity,
  RecoveryState,
  InjuryRiskAnalysis,
  CoachRecap,
} from "../../types";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const NEXT_STEP_LABEL: Record<string, string> = {
  rest: "Rest day",
  easy: "Easy run",
  workout: "Workout",
  long_run: "Long run",
  recovery: "Recovery run",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";

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
      // ignore — pull-to-refresh shouldn't blow up the UI
    } finally {
      setSyncing(false);
      await Promise.all([
        recovery.refetch(),
        lastRun.refetch(),
        injury.refetch(),
        recap.refetch(),
      ]);
    }
  }, [user?.id, recovery, lastRun, injury, recap]);

  const isInitialLoading =
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
      {isInitialLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        >
          {/* Greeting (small, calm) */}
          <View style={{ marginBottom: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "500" }}>
              {greeting()}
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: colors.text,
                letterSpacing: -0.5,
                marginTop: 2,
              }}
            >
              {name}
            </Text>
          </View>

          <ReadinessHero r={recovery.data} loading={recovery.isLoading} />

          <LastRunCard activity={lastRun.data ?? null} unit={unit} />

          <InjuryRiskCard
            data={injury.data}
            isPremiumGate={
              injury.error instanceof ApiError && injury.error.status === 403
            }
            loading={injury.isLoading}
          />

          {latestRecap ? <AIBriefCard recap={latestRecap} /> : null}

          {/* Subtle escape hatch */}
          <Link href="/runs" asChild>
            <Pressable
              style={({ pressed }) => ({
                alignSelf: "center",
                paddingVertical: 14,
                paddingHorizontal: 20,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.brand,
                  letterSpacing: -0.1,
                }}
              >
                View all runs ›
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ─── Readiness hero (the answer to "should I run today?") ── */
function ReadinessHero({
  r,
  loading,
}: {
  r: RecoveryState | undefined;
  loading: boolean;
}) {
  const router = useRouter();

  if (loading && !r) {
    return (
      <SkeletonCard height={210}>
        <ActivityIndicator color={colors.brand} />
      </SkeletonCard>
    );
  }
  if (!r) {
    return (
      <Hero verdict="No recovery data yet" sub="Sync from Strava to begin." />
    );
  }

  const ready = r.readyToRun;
  const score = Math.round(r.freshnessScore);
  const accent = ready ? colors.successText : colors.warningText;
  const accentBg = ready ? colors.successBg : colors.warningBg;
  const verdict = ready ? "You're ready to run" : "Take it easy today";
  const next = NEXT_STEP_LABEL[r.recommendedNextStep] || r.recommendedNextStep;

  return (
    <Pressable
      onPress={() => router.push("/tools/recovery")}
      style={({ pressed }) => ({
        backgroundColor: "#FFF8F5",
        borderRadius: 22,
        borderWidth: 0.5,
        borderColor: "#F0EDE8",
        padding: 22,
        overflow: "hidden",
        position: "relative",
        opacity: pressed ? 0.92 : 1,
        ...shadow.card,
      })}
    >
      {/* Soft accent glow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: ready
            ? "rgba(45,122,31,0.10)"
            : "rgba(194,96,32,0.10)",
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.8,
          color: colors.muted,
          textTransform: "uppercase",
        }}
      >
        Readiness
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 6 }}>
        <Text
          style={{
            fontSize: 64,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -2.5,
            lineHeight: 64,
          }}
        >
          {score}
        </Text>
        <Text
          style={{
            fontSize: 18,
            color: colors.muted,
            paddingBottom: 10,
            fontWeight: "500",
          }}
        >
          /100
        </Text>
      </View>
      <Text
        style={{
          fontSize: 19,
          fontWeight: "600",
          color: colors.text,
          marginTop: 10,
          letterSpacing: -0.3,
        }}
      >
        {verdict}
      </Text>
      {r.statusMessage ? (
        <Text
          numberOfLines={2}
          style={{
            fontSize: 14,
            color: colors.muted,
            marginTop: 4,
            lineHeight: 20,
          }}
        >
          {r.statusMessage}
        </Text>
      ) : null}
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: accentBg,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }}
        />
        <Text style={{ fontSize: 13, fontWeight: "600", color: accent }}>
          Suggested: {next}
        </Text>
      </View>
    </Pressable>
  );
}

function Hero({ verdict, sub }: { verdict: string; sub?: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 22,
        ...shadow.card,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>
        {verdict}
      </Text>
      {sub ? (
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

/* ─── Last Run ─────────────────────────────────────────────── */
function LastRunCard({
  activity,
  unit,
}: {
  activity: Activity | null;
  unit: "km" | "miles";
}) {
  if (!activity) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 18,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: colors.muted, textTransform: "uppercase" }}>
          Last Run
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, marginTop: 8 }}>
          No runs yet — pull down to sync.
        </Text>
      </View>
    );
  }

  const dist = formatDistance(activity.distance, unit);
  const pace = formatPace(activity.averageSpeed, unit);

  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: colors.brand,
          padding: 18,
          opacity: pressed ? 0.9 : 1,
          ...shadow.card,
        })}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: colors.muted,
            textTransform: "uppercase",
          }}
        >
          Last Run
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: colors.text,
            marginTop: 6,
            letterSpacing: -0.2,
          }}
        >
          {activity.name}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          {formatDate(activity.startDate)}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 14, gap: 24 }}>
          <Stat label="Distance" value={dist} />
          <Stat label="Pace" value={pace} />
        </View>
      </Pressable>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
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
          fontSize: 20,
          fontWeight: "700",
          color: colors.text,
          marginTop: 3,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ─── Injury Risk ──────────────────────────────────────────── */
const RISK_TONE: Record<string, { bg: string; text: string }> = {
  low: { bg: colors.successBg, text: colors.successText },
  medium: { bg: colors.warningBg, text: colors.warningText },
  high: { bg: "rgba(217,52,43,0.12)", text: colors.danger },
};

function InjuryRiskCard({
  data,
  isPremiumGate,
  loading,
}: {
  data: InjuryRiskAnalysis | undefined;
  isPremiumGate: boolean;
  loading: boolean;
}) {
  const router = useRouter();

  const inner = (() => {
    if (isPremiumGate) {
      return {
        pill: { label: "Premium", tone: { bg: colors.premiumBg, text: colors.premium } },
        body: "Unlock injury risk on aitracker.run.",
      };
    }
    if (loading && !data) {
      return null;
    }
    if (!data) {
      return {
        pill: { label: "—", tone: { bg: colors.surfaceAlt, text: colors.muted } },
        body: "Not enough data yet.",
      };
    }
    const key = (data.riskLevel || "").toLowerCase();
    const tone = RISK_TONE[key] || RISK_TONE.medium;
    const label = data.riskLevel
      ? data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1).toLowerCase()
      : "Unknown";
    const body =
      data.riskFactors?.[0] ||
      (key === "low" ? "All clear — keep training as planned." : "Open for details.");
    return { pill: { label, tone }, body };
  })();

  return (
    <Pressable
      onPress={() => router.push("/tools/injury-risk")}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 18,
        opacity: pressed ? 0.9 : 1,
        ...shadow.card,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: colors.muted,
            textTransform: "uppercase",
          }}
        >
          Injury Risk
        </Text>
        {inner ? (
          <View
            style={{
              backgroundColor: inner.pill.tone.bg,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: inner.pill.tone.text,
                letterSpacing: 0.3,
              }}
            >
              {inner.pill.label}
            </Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.brand} size="small" />
        )}
      </View>
      {inner ? (
        <Text
          numberOfLines={2}
          style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 }}
        >
          {inner.body}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ─── AI Brief (latest coach recap) ───────────────────────── */
function AIBriefCard({ recap }: { recap: CoachRecap }) {
  const router = useRouter();
  const snippet = recap.coachingCue || recap.recapBullets?.[0] || "";

  return (
    <Pressable
      onPress={() => router.push("/tools/coach-recaps")}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 18,
        opacity: pressed ? 0.9 : 1,
        ...shadow.card,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.brand,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: colors.muted,
            textTransform: "uppercase",
          }}
        >
          AI Brief
        </Text>
      </View>
      {snippet ? (
        <Text
          numberOfLines={3}
          style={{
            fontSize: 15,
            color: colors.text,
            marginTop: 10,
            lineHeight: 22,
            letterSpacing: -0.1,
          }}
        >
          {snippet}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.brand,
          marginTop: 12,
        }}
      >
        Read full brief ›
      </Text>
    </Pressable>
  );
}

/* ─── Skeleton placeholder card ──────────────────────────── */
function SkeletonCard({ height, children }: { height: number; children?: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 0.5,
        borderColor: colors.border,
        height,
        alignItems: "center",
        justifyContent: "center",
        ...shadow.card,
      }}
    >
      {children}
    </View>
  );
}
