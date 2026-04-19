import { ScrollView, View, Text, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Link } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { colors, shadow } from "../../lib/theme";
import {
  NavBar,
  Card,
  EmptyState,
  PremiumGate,
} from "../../components/ios";
import type { CoachRecap } from "../../types";

const NEXT_LABEL: Record<string, string> = {
  rest: "🛌 Rest",
  easy: "🚶 Easy",
  workout: "💪 Workout",
  long_run: "🏃 Long",
  recovery: "🧘 Recovery",
};

interface RecapsResponse {
  recaps: CoachRecap[];
}

export default function CoachRecapsScreen() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["coach-recaps"],
    queryFn: () => api<RecapsResponse>("/api/coach-recaps?limit=30"),
  });

  const markViewed = useMutation({
    mutationFn: (id: number) =>
      api(`/api/coach-recaps/${id}/viewed`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-recaps"] }),
  });

  const recaps = q.data?.recaps ?? [];
  const isPremiumError =
    q.error && /premium/i.test((q.error as Error).message || "");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Coach Recaps" back="Tools" />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
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
        ) : isPremiumError ? (
          <PremiumGate
            feature="Coach Recaps"
            description="Upgrade on aitracker.run to receive automatic per-run AI summaries with focus cues and next steps."
          />
        ) : recaps.length === 0 ? (
          <EmptyState
            title="No coach recaps yet"
            body="Recaps appear automatically after qualifying runs."
          />
        ) : (
          recaps.map((r) => (
            <RecapCard
              key={r.id}
              recap={r}
              onView={() => !r.viewedAt && markViewed.mutate(r.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecapCard({ recap, onView }: { recap: CoachRecap; onView: () => void }) {
  const isUnread = !recap.viewedAt;
  return (
    <Link href={`/activity/${recap.activityId}`} asChild>
      <Pressable
        onPress={onView}
        style={({ pressed }) => ({
          backgroundColor: isUnread ? "#FFF5F1" : colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderLeftWidth: isUnread ? 3 : 0.5,
          borderLeftColor: isUnread ? colors.brand : colors.border,
          padding: 16,
          opacity: pressed ? 0.85 : 1,
          ...shadow.card,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isUnread ? (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.brand,
              }}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}
          >
            {recap.activityName}
          </Text>
          <View
            style={{
              backgroundColor: "rgba(252,76,2,0.10)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: colors.brand,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              {(NEXT_LABEL[recap.nextStep] || recap.nextStep).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.faint, marginTop: 4 }}>
          {formatDate(recap.activityDate)}
        </Text>

        <View style={{ marginTop: 12, gap: 6 }}>
          {(recap.recapBullets || []).slice(0, 3).map((b, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: colors.brand, fontSize: 14 }}>•</Text>
              <Text
                style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}
              >
                {b}
              </Text>
            </View>
          ))}
        </View>

        {recap.coachingCue ? (
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
              Cue for next run
            </Text>
            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
              {recap.coachingCue}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
