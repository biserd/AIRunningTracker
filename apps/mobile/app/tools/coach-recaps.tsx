import { ScrollView, View, Text, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Link } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Coach Recaps",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
              tintColor="#fc4c02"
            />
          }
        >
          {q.isLoading ? (
            <View className="items-center mt-12">
              <ActivityIndicator color="#fc4c02" />
            </View>
          ) : isPremiumError ? (
            <View className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-5">
              <Text className="text-base font-semibold text-orange-700 dark:text-orange-300">
                Premium feature
              </Text>
              <Text className="text-sm text-orange-700/80 dark:text-orange-300/80 mt-2">
                Coach Recaps are part of Premium. Upgrade on aitracker.run.
              </Text>
            </View>
          ) : recaps.length === 0 ? (
            <Text className="text-sm text-slate-500 text-center mt-12">
              No coach recaps yet. They appear automatically after qualifying runs.
            </Text>
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
    </>
  );
}

function RecapCard({ recap, onView }: { recap: CoachRecap; onView: () => void }) {
  const isUnread = !recap.viewedAt;
  return (
    <Link href={`/activity/${recap.activityId}`} asChild>
      <Pressable
        onPress={onView}
        className={`rounded-2xl p-5 border active:opacity-80 ${
          isUnread
            ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        }`}
      >
        <View className="flex-row items-center gap-2">
          {isUnread ? <View className="w-2 h-2 rounded-full bg-strava" /> : null}
          <Text className="text-sm font-semibold text-slate-900 dark:text-white flex-1" numberOfLines={1}>
            {recap.activityName}
          </Text>
          <Text className="text-[10px] text-slate-400 uppercase">
            {NEXT_LABEL[recap.nextStep] || recap.nextStep}
          </Text>
        </View>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          {formatDate(recap.activityDate)}
        </Text>

        <View className="mt-3 gap-1">
          {(recap.recapBullets || []).slice(0, 3).map((b, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="text-strava">•</Text>
              <Text className="flex-1 text-sm text-slate-700 dark:text-slate-200 leading-5">
                {b}
              </Text>
            </View>
          ))}
        </View>

        {recap.coachingCue ? (
          <View className="mt-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
            <Text className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              Cue for next run
            </Text>
            <Text className="text-sm text-slate-900 dark:text-white">
              {recap.coachingCue}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
