import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { colors, shadow } from "../../lib/theme";
import { formatDistance, formatPace } from "../../lib/format";
import { RowSkeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/ios";
import type { Activity, CoachRecap } from "../../types";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_LABELS[m]} ${y}`;
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const unit = (user?.unitPreference || "km") as "km" | "miles";
  const distUnit = unit === "miles" ? "mi" : "km";
  const paceUnit = unit === "miles" ? "/ mi" : "/ km";

  const activities = useQuery<Activity[], Error>({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const res = await api<{ activities: Activity[] } | Activity[]>(
        "/api/activities?page=1&pageSize=60",
      );
      return Array.isArray(res) ? res : (res.activities ?? []);
    },
  });

  const recaps = useQuery<{ recaps: CoachRecap[] } | CoachRecap[], Error>({
    queryKey: ["all-recaps"],
    queryFn: () => api("/api/coach-recaps?limit=60"),
    enabled: !!user?.id,
    retry: 0,
  });
  const recapList: CoachRecap[] = Array.isArray(recaps.data)
    ? recaps.data
    : recaps.data?.recaps ?? [];
  const briefByActivity = useMemo(() => {
    const m = new Map<number, CoachRecap>();
    recapList.forEach((r) => m.set(r.activityId, r));
    return m;
  }, [recapList]);

  const grouped = useMemo(() => {
    const list = activities.data || [];
    const map = new Map<string, Activity[]>();
    for (const a of list) {
      const k = monthKey(a.startDate);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [activities.data]);

  const [syncing, setSyncing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setSyncing(true);
    let prevCount = activities.data?.length ?? 0;
    let synced = false;
    try {
      await api(`/api/strava/sync/${user.id}`, {
        method: "POST",
        body: JSON.stringify({ maxActivities: 30 }),
      });
      synced = true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.show("Connect Strava on aitracker.run to sync runs.", "info");
      } else if (err instanceof ApiError && err.status === 429) {
        toast.show("Strava is rate-limited. Try again in a minute.", "info");
      } else {
        toast.show(
          err instanceof Error ? `Sync failed: ${err.message}` : "Sync failed",
          "error",
        );
      }
    } finally {
      setSyncing(false);
      const [acts] = await Promise.all([activities.refetch(), recaps.refetch()]);
      if (synced) {
        const newCount = acts.data?.length ?? 0;
        const added = newCount - prevCount;
        if (added > 0) {
          toast.show(`${added} new ${added === 1 ? "run" : "runs"} synced.`, "success");
        }
      }
    }
  }, [user?.id, activities, recaps, toast]);

  const isInitial = activities.isLoading && !activities.data;
  const total = activities.data?.length ?? 0;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={syncing || activities.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.ink, letterSpacing: -0.6 }}>
            History
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink2 }}>
            {total} {total === 1 ? "run" : "runs"}
          </Text>
        </View>

        {isInitial ? (
          <View style={{ gap: 10 }}>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </View>
        ) : grouped.length === 0 ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 8, ...shadow.card }}>
            <EmptyState
              icon="footsteps-outline"
              title="No runs yet"
              body="Sync from Strava to see your run history with AI briefs and per-activity grades."
              actionLabel="Sync from Strava"
              onAction={onRefresh}
              busy={syncing}
            />
          </View>
        ) : (
          grouped.map(([k, items], gi) => (
            <View key={k} style={{ marginTop: gi === 0 ? 0 : 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink3, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12 }}>
                {monthLabel(k)}
              </Text>
              <View style={{ gap: 10 }}>
                {items.map((a) => (
                  <RunRow
                    key={a.id}
                    activity={a}
                    distUnit={distUnit}
                    paceUnit={paceUnit}
                    unit={unit}
                    hasBrief={briefByActivity.has(a.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RunRow({
  activity,
  unit,
  distUnit,
  paceUnit,
  hasBrief,
}: {
  activity: Activity;
  unit: "km" | "miles";
  distUnit: string;
  paceUnit: string;
  hasBrief: boolean;
}) {
  const distVal = formatDistance(activity.distance, unit).split(" ")[0];
  const paceVal = formatPace(activity.averageSpeed, unit).split(" ")[0];

  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          opacity: pressed ? 0.94 : 1,
          ...shadow.card,
        })}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.brandLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="flash" size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: colors.ink, marginBottom: 2 }}>
            {activity.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: colors.ink2 }}>
            {dayLabel(activity.startDate)}
            {hasBrief ? " · Brief ready" : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 }}>
            {distVal} {distUnit}
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 1 }}>
            {paceVal} {paceUnit}
          </Text>
        </View>
        {hasBrief ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />
        ) : (
          <Ionicons name="chevron-forward" size={14} color={colors.ink3} style={{ opacity: 0.6 }} />
        )}
      </Pressable>
    </Link>
  );
}
