import { ScrollView, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { NotificationsResponse } from "../../types";

interface ToolDef {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  badge?: number;
}

export default function ToolsScreen() {
  const { user } = useAuth();

  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<NotificationsResponse>("/api/notifications?limit=5"),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const tools: ToolDef[] = [
    {
      href: "/tools/predictor",
      emoji: "🎯",
      title: "Race Predictor",
      desc: "Estimate your 5K, 10K, half, or marathon time from a recent effort.",
    },
    {
      href: "/tools/goals",
      emoji: "🏁",
      title: "Goals",
      desc: "Track training goals — speed, endurance, distance, hills.",
    },
    {
      href: "/tools/insights",
      emoji: "✨",
      title: "AI Insights",
      desc: "Latest performance, recovery, and technique insights from your AI coach.",
    },
    {
      href: "/tools/notifications",
      emoji: "🔔",
      title: "Notifications",
      desc: "Coach recaps, weekly summaries, and alerts.",
      badge: notifs.data?.unreadCount,
    },
  ];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Tools</Text>
        <Text className="text-sm text-slate-500 -mt-2 mb-1">
          Everything beyond the dashboard.
        </Text>

        {tools.map((t) => (
          <Link key={t.href} href={t.href as never} asChild>
            <Pressable className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 active:opacity-80 flex-row items-center">
              <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
              <View className="flex-1 ml-4">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-slate-900 dark:text-white">
                    {t.title}
                  </Text>
                  {t.badge && t.badge > 0 ? (
                    <View className="bg-strava rounded-full px-2 py-0.5 min-w-[20px] items-center">
                      <Text className="text-[10px] text-white font-bold">{t.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-slate-500 mt-0.5">{t.desc}</Text>
              </View>
              <Text className="text-slate-400 text-xl">›</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
