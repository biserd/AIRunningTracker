import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import type { InsightDayGroup, InsightItem } from "../../types";

interface InsightsResponse {
  timeline: InsightDayGroup[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  performance: "📈",
  pattern: "🔍",
  recovery: "💤",
  motivation: "💪",
  technique: "🦶",
  recommendation: "🎯",
};

export default function InsightsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const insights = useQuery({
    queryKey: ["insights-history", user?.id],
    queryFn: async () => {
      const data = await api<InsightsResponse | { timeline?: InsightDayGroup[] } | InsightDayGroup[]>(
        `/api/insights/history/${user!.id}`,
      );
      // Handle either { timeline: [...] } or raw array
      if (Array.isArray(data)) return data as InsightDayGroup[];
      return (data as { timeline?: InsightDayGroup[] }).timeline ?? [];
    },
    enabled: !!user?.id,
  });

  const generate = useMutation({
    mutationFn: () =>
      api<{ success: boolean }>(`/api/ai/insights/${user!.id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights-history", user?.id] });
      Alert.alert("Done", "Fresh insights generated.");
    },
    onError: (e) => {
      const msg = (e as Error).message;
      if (/limit|rate|quota|premium/i.test(msg)) {
        Alert.alert(
          "Daily limit reached",
          msg + "\n\nUpgrade to Premium for unlimited insights.",
        );
      } else {
        Alert.alert("Failed", msg);
      }
    },
  });

  const days = insights.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "AI Insights",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
          <Pressable
            onPress={() => generate.mutate()}
            disabled={generate.isPending}
            className={`rounded-xl py-3 items-center ${
              generate.isPending ? "bg-slate-300 dark:bg-slate-700" : "bg-strava active:opacity-80"
            }`}
          >
            {generate.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">✨ Generate fresh insights</Text>
            )}
          </Pressable>

          {insights.isLoading ? (
            <View className="items-center mt-12">
              <ActivityIndicator color="#fc4c02" />
            </View>
          ) : days.length === 0 ? (
            <Text className="text-sm text-slate-500 text-center mt-8">
              No insights yet. Tap above to generate from your latest runs.
            </Text>
          ) : (
            days.map((d) => (
              <View key={d.date} className="gap-2">
                <Text className="text-xs uppercase tracking-wide text-slate-400">
                  {formatDate(d.date)}
                </Text>
                {(Object.keys(d.insights) as Array<keyof typeof d.insights>).map((cat) => {
                  const items = d.insights[cat];
                  if (!items || items.length === 0) return null;
                  return items.map((item) => <InsightCard key={item.id} category={cat} item={item} />);
                })}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function InsightCard({ category, item }: { category: string; item: InsightItem }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
      <View className="flex-row items-center gap-2 mb-2">
        <Text style={{ fontSize: 16 }}>{CATEGORY_EMOJI[category] || "💡"}</Text>
        <Text className="text-[10px] uppercase tracking-wide text-slate-400">{category}</Text>
      </View>
      <Text className="text-sm font-semibold text-slate-900 dark:text-white">
        {item.title}
      </Text>
      <Text className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-5">
        {item.content}
      </Text>
    </View>
  );
}
