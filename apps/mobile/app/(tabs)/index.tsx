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
import { colors, shadow } from "../../lib/theme";
import {
  formatDistance,
  formatPace,
  formatDate,
} from "../../lib/format";
import type {
  Activity,
  DashboardData,
  RunnerScore,
  ChartResponse,
} from "../../types";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";
  const unitShort = unit === "miles" ? "mi" : "km";

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
  const latestActivity = activities.data?.[0];
  const isInitialLoading = activities.isLoading && !activities.data;
  const isRefreshing =
    syncing ||
    activities.isRefetching ||
    dashboard.isRefetching ||
    score.isRefetching ||
    chart.isRefetching;

  const name = user?.firstName || user?.username || "Runner";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {isInitialLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={activities.data?.slice(0, 6) || []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 0 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListHeaderComponent={
            <View>
              {/* Greeting */}
              <View style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    color: colors.text,
                    letterSpacing: -0.5,
                    lineHeight: 34,
                  }}
                >
                  {greeting()},{"\n"}
                  <Text style={{ color: colors.brand }}>{name}</Text>
                </Text>
              </View>

              {score.data ? <RunnerScoreCard score={score.data} /> : null}

              {stats ? (
                <ThisWeekStats stats={stats} unit={unitShort} />
              ) : null}

              {latestActivity ? (
                <LatestBrief activity={latestActivity} unit={unit} />
              ) : null}

              {chart.data?.chartData?.length ? (
                <DistanceTrendCard
                  data={chart.data.chartData.map((c) => ({
                    label: c.week,
                    value: c.distance,
                  }))}
                  unitSuffix={unitShort}
                />
              ) : null}

              <SectionLabel style={{ marginBottom: 8, marginTop: 4 }}>
                Recent Activities
              </SectionLabel>

              {syncError ? (
                <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>
                  Sync: {syncError}
                </Text>
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
              <View style={{ alignItems: "center", marginTop: 32 }}>
                <Text style={{ fontSize: 15, color: colors.muted }}>No activities yet.</Text>
                <Text style={{ fontSize: 13, color: colors.faint, marginTop: 4 }}>
                  Pull down to sync from Strava.
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <ActivityRow
              activity={item}
              unit={unit}
              isFirst={index === 0}
              isLast={index === Math.min((activities.data?.length ?? 1) - 1, 5)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* ─── Runner Score (gradient hero) ───────────────────────── */
function RunnerScoreCard({ score }: { score: RunnerScore }) {
  const trend = score.trends.weeklyChange;
  const trendArrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";
  const trendText = `${trendArrow} ${trend > 0 ? "+" : ""}${Math.abs(trend).toFixed(0)} vs last week`;

  return (
    <View
      style={{
        backgroundColor: colors.brand,
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        ...shadow.card,
      }}
    >
      {/* Soft top sheen */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.2,
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
        }}
      >
        Runner Score
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
        <Text
          style={{
            fontSize: 64,
            fontWeight: "800",
            color: "#fff",
            letterSpacing: -2,
            lineHeight: 64,
          }}
        >
          {score.totalScore}
        </Text>
        <View style={{ marginLeft: 14, marginBottom: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#fff" }}>
            {score.grade}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.85)",
              marginTop: 2,
            }}
          >
            {trendText}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          marginTop: 6,
          marginBottom: 14,
        }}
      >
        Top {Math.max(1, 100 - Math.round(score.percentile))}% of runners
      </Text>

      <View style={{ gap: 10 }}>
        <SubScore label="Consistency" value={score.components.consistency} />
        <SubScore label="Performance" value={score.components.performance} />
        <SubScore label="Volume" value={score.components.volume} />
        <SubScore label="Improvement" value={score.components.improvement} />
      </View>
    </View>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(25, Math.round(value)));
  const pct = (v / 25) * 100;
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
          {v}/25
        </Text>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: "rgba(255,255,255,0.20)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: "rgba(255,255,255,0.95)",
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

/* ─── This Week stats row ────────────────────────────────── */
function ThisWeekStats({
  stats,
  unit,
}: {
  stats: NonNullable<DashboardData["stats"]>;
  unit: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionLabel style={{ marginBottom: 8 }}>This Week</SectionLabel>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 16,
          flexDirection: "row",
          ...shadow.card,
        }}
      >
        <Stat label={unit === "mi" ? "Miles" : "KM"} value={String(stats.weeklyTotalDistance)} align="left" />
        <View style={{ width: 0.5, backgroundColor: colors.border }} />
        <Stat label="Runs" value={String(stats.weeklyTotalActivities)} align="center" />
        <View style={{ width: 0.5, backgroundColor: colors.border }} />
        <Stat label="Avg Pace" value={stats.weeklyAvgPace ? `${stats.weeklyAvgPace}` : "—"} align="right" />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align: "left" | "center" | "right";
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 8 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: colors.text,
          letterSpacing: -0.6,
          textAlign: align,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.muted,
          marginTop: 2,
          textAlign: align,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─── Latest Brief card ──────────────────────────────────── */
function LatestBrief({ activity, unit }: { activity: Activity; unit: "km" | "miles" }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionLabel style={{ marginBottom: 8 }}>Latest Brief</SectionLabel>
      <Link href={`/activity/${activity.id}`} asChild>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 0.5,
            borderColor: colors.border,
            padding: 16,
            opacity: pressed ? 0.85 : 1,
            ...shadow.card,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              backgroundColor: "rgba(252,76,2,0.10)",
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 999,
              marginBottom: 10,
            }}
          >
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand }}
            />
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 0.3 }}>
              NEW BRIEF
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {formatDate(activity.startDate)} · {formatDistance(activity.distance, unit)} ·{" "}
            {formatPace(activity.averageSpeed, unit)}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
            {activity.name}
          </Text>
          <Text
            style={{
              marginTop: 12,
              fontSize: 13,
              fontWeight: "600",
              color: colors.brand,
            }}
          >
            Read full brief ›
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

/* ─── Distance trend (mini bars) ─────────────────────────── */
function DistanceTrendCard({
  data,
  unitSuffix,
}: {
  data: { label: string; value: number }[];
  unitSuffix: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const recent = data.slice(-12);
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: 16,
          ...shadow.card,
        }}
      >
        <SectionLabel style={{ marginBottom: 12 }}>
          Distance Trend · 30 Days
        </SectionLabel>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            height: 90,
            gap: 4,
          }}
        >
          {recent.map((d, i) => {
            const h = Math.max(4, (d.value / max) * 90);
            const isLast = i === recent.length - 1;
            return (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: "85%",
                    height: h,
                    backgroundColor: isLast ? colors.brand : "rgba(252,76,2,0.30)",
                    borderRadius: 3,
                  }}
                />
              </View>
            );
          })}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.faint }}>{recent[0]?.label}</Text>
          <Text style={{ fontSize: 10, color: colors.faint }}>
            {recent[recent.length - 1]?.label} · {recent[recent.length - 1]?.value} {unitSuffix}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Activity row (grouped list style) ──────────────────── */
function ActivityRow({
  activity,
  unit,
  isFirst,
  isLast,
}: {
  activity: Activity;
  unit: "km" | "miles";
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderTopLeftRadius: isFirst ? 16 : 0,
          borderTopRightRadius: isFirst ? 16 : 0,
          borderBottomLeftRadius: isLast ? 16 : 0,
          borderBottomRightRadius: isLast ? 16 : 0,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderTopWidth: isFirst ? 0.5 : 0,
          paddingVertical: 14,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
          ...(isFirst ? shadow.card : null),
        })}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 }}
          >
            {activity.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {formatDate(activity.startDate)} · {activity.type}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 14, marginRight: 10 }}>
          <MiniMetric value={formatDistance(activity.distance, unit).split(" ")[0]} unit={unit === "miles" ? "mi" : "km"} />
          <MiniMetric value={formatPace(activity.averageSpeed, unit).split(" ")[0]} unit="pace" />
        </View>
        <Text style={{ color: colors.faint, fontSize: 18, fontWeight: "300" }}>›</Text>
      </Pressable>
    </Link>
  );
}

function MiniMetric({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.faint, marginTop: 1 }}>{unit}</Text>
    </View>
  );
}

/* ─── helpers ────────────────────────────────────────────── */
function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <Text
      style={[
        {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.0,
          color: colors.muted,
          textTransform: "uppercase",
          marginLeft: 4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ alignItems: "center", marginTop: 32 }}>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 24 }}>
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          marginTop: 16,
          backgroundColor: colors.brand,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Try again</Text>
      </Pressable>
    </View>
  );
}
