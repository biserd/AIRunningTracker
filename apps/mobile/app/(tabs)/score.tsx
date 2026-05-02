import { useCallback } from "react";
import { View, Text, ScrollView, Linking, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import { Skeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/ios";
import type { RunnerScore, VO2MaxData, FitnessResponse } from "../../types";

export default function ScoreScreen() {
  const { user } = useAuth();

  const score = useQuery<RunnerScore, Error>({
    queryKey: ["runner-score", user?.id],
    queryFn: () => api<RunnerScore>(`/api/runner-score/${user!.id}`),
    enabled: !!user?.id,
  });

  const vo2 = useQuery<VO2MaxData | null, Error>({
    queryKey: ["vo2max", user?.id],
    queryFn: () => api<VO2MaxData | null>(`/api/performance/vo2max/${user!.id}`),
    enabled: !!user?.id,
    retry: (f, e) => (e instanceof ApiError && e.status === 403 ? false : f < 1),
  });

  const fitness = useQuery<FitnessResponse, Error>({
    queryKey: ["fitness", user?.id],
    queryFn: () => api<FitnessResponse>(`/api/performance/fitness/${user!.id}`),
    enabled: !!user?.id,
    retry: (f, e) => (e instanceof ApiError && e.status === 403 ? false : f < 1),
  });

  const isLoading = score.isLoading && !score.data;

  const onRefresh = useCallback(async () => {
    await Promise.all([score.refetch(), vo2.refetch(), fitness.refetch()]);
  }, [score, vo2, fitness]);

  const isRefreshing = score.isRefetching || vo2.isRefetching || fitness.isRefetching;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink3, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 4 }}>
            Runner Score
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink2 }}>Updated after every run</Text>
        </View>

        {/* Score hero */}
        {isLoading ? (
          <ScoreHeroSkeleton />
        ) : score.data ? (
          <ScoreHero score={score.data} />
        ) : (
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 8, ...shadow.card }}>
            <EmptyState
              icon="trophy-outline"
              title="Score isn't ready yet"
              body="Sync your runs from Strava to see your Runner Score and percentile."
            />
          </View>
        )}

        {/* VO2 Max */}
        <VO2Card data={vo2.data} loading={vo2.isLoading} gated={vo2.error instanceof ApiError && vo2.error.status === 403} />

        {/* Training Load */}
        <TrainingLoadCard
          data={fitness.data}
          loading={fitness.isLoading}
          gated={fitness.error instanceof ApiError && fitness.error.status === 403}
        />

        <Pressable
          onPress={() => Linking.openURL("https://aitracker.run")}
          style={{ marginTop: 14, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ fontSize: 13, color: colors.ink3 }}>
            Full audit report on{" "}
            <Text style={{ color: colors.brand, fontWeight: "600" }}>aitracker.run</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Score hero ────────────────────────────────────── */
function ScoreHero({ score }: { score: RunnerScore }) {
  const total = Math.round(score.totalScore);
  const weekly = score.trends?.weeklyChange ?? 0;
  const arrow = weekly > 0 ? "↑" : weekly < 0 ? "↓" : "→";
  const sign = weekly > 0 ? "+" : "";

  const subscores: { name: string; val: number }[] = [
    { name: "Consistency", val: Math.round(score.components.consistency) },
    { name: "Performance", val: Math.round(score.components.performance) },
    { name: "Volume", val: Math.round(score.components.volume) },
    { name: "Improvement", val: Math.round(score.components.improvement) },
  ];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 6 }}>
        <Text style={{ fontSize: 80, fontWeight: "700", color: colors.brand, letterSpacing: -4, lineHeight: 78 }}>
          {total}
        </Text>
        <Text style={{ fontSize: 36, fontWeight: "700", color: colors.ink2, letterSpacing: -1, marginLeft: 8, paddingBottom: 4 }}>
          {score.grade}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.ink2, marginBottom: 22 }}>
        Better than {Math.round(score.percentile)}% of runners · {arrow} {sign}
        {weekly} this week
      </Text>

      {subscores.map((s) => (
        <View key={s.name} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: colors.ink2 }}>{s.name}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{s.val} / 25</Text>
          </View>
          <View style={{ height: 5, backgroundColor: colors.line, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 5, width: `${Math.min(100, (s.val / 25) * 100)}%`, backgroundColor: colors.brand, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ─── VO2 Max card ──────────────────────────────────── */
function VO2Card({ data, loading, gated }: { data: VO2MaxData | null | undefined; loading: boolean; gated: boolean }) {
  return (
    <View style={{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 20, ...shadow.card }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink3, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12 }}>
        VO2 Max
      </Text>
      {loading && !data ? (
        <View style={{ gap: 10 }}>
          <Skeleton width={140} height={36} />
          <Skeleton width={180} height={20} radius={999} />
        </View>
      ) : gated ? (
        <Tag bg={colors.purpleBg} fg={colors.purple} dot={colors.purple} label="Premium · Unlock on aitracker.run" />
      ) : data ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 44, fontWeight: "700", color: colors.ink, letterSpacing: -2, lineHeight: 44 }}>
              {data.current.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 15, color: colors.ink2, paddingBottom: 4 }}>ml/kg/min</Text>
          </View>
          <Tag
            bg={colors.greenBg}
            fg={colors.green}
            dot={colors.green}
            label={`${data.comparison || "Solid"} · ${data.trend === "improving" ? "Improving" : data.trend === "declining" ? "Declining" : "Stable"}`}
          />
        </>
      ) : (
        <Text style={{ fontSize: 14, color: colors.ink2 }}>Need a few more runs to estimate.</Text>
      )}
    </View>
  );
}

function ScoreHeroSkeleton() {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 16, ...shadow.card }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <Skeleton width={140} height={70} />
        <Skeleton width={48} height={32} />
      </View>
      <Skeleton width="70%" height={14} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Skeleton width={90} height={12} />
            <Skeleton width={48} height={12} />
          </View>
          <Skeleton width="100%" height={5} radius={4} />
        </View>
      ))}
    </View>
  );
}

/* ─── Training load card ────────────────────────────── */
function TrainingLoadCard({
  data,
  loading,
  gated,
}: {
  data: FitnessResponse | undefined;
  loading: boolean;
  gated: boolean;
}) {
  const cur = data?.currentForm;
  const interpRaw = data?.interpretation;
  const interp =
    typeof interpRaw === "string"
      ? { label: interpRaw, description: "" }
      : interpRaw && typeof interpRaw === "object"
        ? { label: interpRaw.label, description: interpRaw.description }
        : null;

  return (
    <View style={{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 20, ...shadow.card }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink3, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 14 }}>
        Training Load
      </Text>
      {loading && !data ? (
        <View style={{ flexDirection: "row", gap: 1, backgroundColor: colors.line, borderRadius: 12, overflow: "hidden" }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, padding: 14, gap: 6 }}>
            <Skeleton width={50} height={10} />
            <Skeleton width={64} height={20} />
            <Skeleton width={32} height={10} />
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, padding: 14, gap: 6 }}>
            <Skeleton width={50} height={10} />
            <Skeleton width={64} height={20} />
            <Skeleton width={32} height={10} />
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, padding: 14, gap: 6 }}>
            <Skeleton width={50} height={10} />
            <Skeleton width={64} height={20} />
            <Skeleton width={32} height={10} />
          </View>
        </View>
      ) : gated ? (
        <Tag bg={colors.purpleBg} fg={colors.purple} dot={colors.purple} label="Premium · Unlock on aitracker.run" />
      ) : cur ? (
        <>
          <View
            style={{
              flexDirection: "row",
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: colors.line,
              gap: 1,
            }}
          >
            <LoadCell label="Fitness" value={cur.ctl.toFixed(1)} unit="CTL" color={colors.green} />
            <LoadCell label="Fatigue" value={cur.atl.toFixed(1)} unit="ATL" color={colors.amber} />
            <LoadCell label="Form" value={cur.tsb.toFixed(1)} unit="TSB" color={colors.info} />
          </View>
          {interp ? (
            <View style={{ marginTop: 12, backgroundColor: colors.greenBg, padding: 12, borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.green }}>{interp.label}</Text>
              {interp.description ? (
                <Text style={{ fontSize: 13, color: colors.ink2, marginTop: 2 }}>{interp.description}</Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <Text style={{ fontSize: 14, color: colors.ink2 }}>Not enough training history yet.</Text>
      )}
    </View>
  );
}

function LoadCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: "700", color, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.ink3 }}>{unit}</Text>
    </View>
  );
}

function Tag({ bg, fg, dot, label }: { bg: string; fg: string; dot: string; label: string }) {
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

