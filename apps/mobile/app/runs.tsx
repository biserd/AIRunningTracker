import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, shadow } from "../lib/theme";
import { NavBar, EmptyState } from "../components/ios";
import { formatDistance, formatPace, formatDate } from "../lib/format";
import type { Activity } from "../types";

export default function RunsScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";
  const distUnit = unit === "miles" ? "mi" : "km";

  const activities = useQuery<Activity[], Error>({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const res = await api<{ activities: Activity[] } | Activity[]>(
        "/api/activities?page=1&pageSize=50",
      );
      return Array.isArray(res) ? res : (res.activities ?? []);
    },
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
      // ignore
    } finally {
      setSyncing(false);
      await activities.refetch();
    }
  }, [user?.id, activities]);

  const isInitialLoading = activities.isLoading && !activities.data;
  const isRefreshing = syncing || activities.isRefetching;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Runs" back="Today" />
      {isInitialLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={activities.data || []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ItemSeparatorComponent={() => null}
          ListEmptyComponent={
            <EmptyState
              title="No runs yet"
              body="Pull down to sync from Strava."
            />
          }
          renderItem={({ item, index }) => (
            <ActivityRow
              activity={item}
              unit={unit}
              distUnit={distUnit}
              isFirst={index === 0}
              isLast={index === (activities.data?.length ?? 1) - 1}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityRow({
  activity,
  unit,
  distUnit,
  isFirst,
  isLast,
}: {
  activity: Activity;
  unit: "km" | "miles";
  distUnit: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const distVal = formatDistance(activity.distance, unit).split(" ")[0];
  const paceVal = formatPace(activity.averageSpeed, unit).split(" ")[0];

  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderTopLeftRadius: isFirst ? 16 : 0,
          borderTopRightRadius: isFirst ? 16 : 0,
          borderBottomLeftRadius: isLast ? 16 : 0,
          borderBottomRightRadius: isLast ? 16 : 0,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopWidth: isFirst ? 0.5 : 0,
          borderBottomWidth: 0.5,
          borderColor: colors.border,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          ...(isFirst ? shadow.card : null),
        })}
      >
        <View style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 3,
              letterSpacing: -0.1,
            }}
          >
            {activity.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: colors.muted }}>
            {formatDate(activity.startDate)} · {distVal} {distUnit} · {paceVal} pace
          </Text>
        </View>
        <Text
          style={{
            color: colors.faint,
            fontSize: 22,
            fontWeight: "300",
            marginLeft: 4,
          }}
        >
          ›
        </Text>
      </Pressable>
    </Link>
  );
}
