import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import type { NotificationsResponse, AppNotification } from "../../types";

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications-full"],
    queryFn: () => api<NotificationsResponse>("/api/notifications?limit=50"),
  });

  const markRead = useMutation({
    mutationFn: (id: number) =>
      api<void>(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api<void>("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = q.data?.notifications ?? [];
  const unread = q.data?.unreadCount ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Notifications",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
          headerRight: () =>
            unread > 0 ? (
              <Pressable onPress={() => markAll.mutate()} className="px-3">
                <Text className="text-white text-xs font-semibold">Mark all</Text>
              </Pressable>
            ) : null,
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#fc4c02" />
          }
        >
          {q.isLoading ? (
            <View className="items-center mt-12">
              <ActivityIndicator color="#fc4c02" />
            </View>
          ) : items.length === 0 ? (
            <Text className="text-sm text-slate-500 text-center mt-12">
              No notifications yet.
            </Text>
          ) : (
            items.map((n) => (
              <NotifCard key={n.id} n={n} onRead={() => !n.readAt && markRead.mutate(n.id)} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function NotifCard({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  const isUnread = !n.readAt;
  return (
    <Pressable
      onPress={onRead}
      className={`rounded-2xl p-4 border active:opacity-80 ${
        isUnread
          ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      }`}
    >
      <View className="flex-row items-center gap-2">
        {isUnread ? <View className="w-2 h-2 rounded-full bg-strava" /> : null}
        <Text className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
          {n.title}
        </Text>
      </View>
      {n.body ? (
        <Text className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-5">
          {n.body}
        </Text>
      ) : null}
      <Text className="text-[11px] text-slate-400 mt-2">{formatDate(n.createdAt)}</Text>
    </Pressable>
  );
}
