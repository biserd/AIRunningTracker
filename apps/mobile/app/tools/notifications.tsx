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
import { colors, shadow } from "../../lib/theme";
import { NavBar, EmptyState } from "../../components/ios";
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar
        title="Notifications"
        back="Tools"
        right={
          unread > 0 ? (
            <Pressable
              onPress={() => markAll.mutate()}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.brand, fontSize: 15, fontWeight: "600" }}>
                Mark all
              </Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => q.refetch()}
            tintColor={colors.brand}
          />
        }
      >
        {q.isLoading ? (
          <View style={{ alignItems: "center", marginTop: 48 }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState title="All caught up" body="No notifications right now." />
        ) : (
          items.map((n) => (
            <NotifCard key={n.id} n={n} onRead={() => !n.readAt && markRead.mutate(n.id)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  const isUnread = !n.readAt;
  return (
    <Pressable
      onPress={onRead}
      style={({ pressed }) => ({
        backgroundColor: isUnread ? "#FFF5F1" : colors.surface,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.border,
        borderLeftWidth: isUnread ? 3 : 0.5,
        borderLeftColor: isUnread ? colors.brand : colors.border,
        padding: 14,
        opacity: pressed ? 0.85 : 1,
        ...shadow.card,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {isUnread ? (
          <View
            style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand }}
          />
        ) : null}
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>
          {n.title}
        </Text>
      </View>
      {n.body ? (
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 }}>
          {n.body}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.faint, marginTop: 8 }}>
        {formatDate(n.createdAt)}
      </Text>
    </Pressable>
  );
}
