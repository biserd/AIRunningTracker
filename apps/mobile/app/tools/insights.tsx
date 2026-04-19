import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { colors } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  PrimaryButton,
  EmptyState,
  InsightCard,
} from "../../components/ios";
import type { InsightDayGroup, InsightItem } from "../../types";

interface InsightsResponse {
  timeline: InsightDayGroup[];
}

const CATEGORY_GLYPH: Record<string, string> = {
  performance: "📈",
  pattern: "🔍",
  recovery: "💤",
  motivation: "💪",
  technique: "🦶",
  recommendation: "🎯",
};

const CATEGORY_BG: Record<string, string> = {
  performance: "rgba(45,122,31,0.12)",
  pattern: "rgba(79,152,163,0.15)",
  recovery: "rgba(108,49,176,0.12)",
  motivation: "rgba(252,76,2,0.12)",
  technique: "rgba(194,96,32,0.12)",
  recommendation: "rgba(252,76,2,0.12)",
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="AI Insights" back="Tools" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <PrimaryButton
          label="✨ Generate fresh insights"
          onPress={() => generate.mutate()}
          loading={generate.isPending}
        />

        {insights.isLoading ? (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : days.length === 0 ? (
          <EmptyState
            title="No insights yet"
            body="Tap above to generate AI insights from your latest runs."
          />
        ) : (
          days.map((d) => (
            <View key={d.date} style={{ gap: 8 }}>
              <SectionLabel>{formatDate(d.date)}</SectionLabel>
              {(Object.keys(d.insights) as Array<keyof typeof d.insights>).map((cat) => {
                const items = d.insights[cat];
                if (!items || items.length === 0) return null;
                return items.map((item: InsightItem) => (
                  <InsightCard
                    key={item.id}
                    category={cat}
                    title={item.title}
                    body={item.content}
                    glyph={CATEGORY_GLYPH[cat] || "💡"}
                    iconBg={CATEGORY_BG[cat] || colors.surfaceAlt}
                  />
                ));
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
