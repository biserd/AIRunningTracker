import { ScrollView, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import type { NotificationsResponse } from "../../types";

interface ToolDef {
  href: string;
  glyph: string;
  iconBg: string;
  title: string;
  desc: string;
  badge?: number;
  premium?: boolean;
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
      glyph: "⏱",
      iconBg: "rgba(252,76,2,0.15)",
      title: "Race Predictor",
      desc: "Estimate your 5K, 10K, half, or marathon time from a recent effort.",
    },
    {
      href: "/tools/fitness",
      glyph: "📈",
      iconBg: "rgba(45,122,31,0.15)",
      title: "Fitness & VO2 Max",
      desc: "Aerobic capacity, fitness, fatigue, and form trend.",
    },
    {
      href: "/tools/insights",
      glyph: "💡",
      iconBg: "rgba(108,49,176,0.15)",
      title: "AI Insights",
      desc: "Performance, recovery, and technique insights.",
    },
    {
      href: "/tools/coach-recaps",
      glyph: "📝",
      iconBg: "rgba(194,96,32,0.15)",
      title: "Coach Recaps",
      desc: "Post-run summaries with focus cues and next steps.",
      premium: true,
    },
    {
      href: "/tools/recovery",
      glyph: "❤︎",
      iconBg: "rgba(79,152,163,0.15)",
      title: "Recovery",
      desc: "Freshness, training load, and what to do next.",
    },
    {
      href: "/tools/injury-risk",
      glyph: "🛡",
      iconBg: "rgba(252,76,2,0.10)",
      title: "Injury Risk",
      desc: "Risk analysis with ML race-time predictions.",
      premium: true,
    },
    {
      href: "/tools/goals",
      glyph: "🎯",
      iconBg: "rgba(45,122,31,0.12)",
      title: "Goals & Alerts",
      desc: "Track training goals and get smart notifications.",
    },
    {
      href: "/tools/notifications",
      glyph: "🔔",
      iconBg: "rgba(108,49,176,0.12)",
      title: "Notifications",
      desc: "Coach recaps, weekly summaries, and alerts.",
      badge: notifs.data?.unreadCount,
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: -0.6,
            marginTop: 4,
          }}
        >
          Tools
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 18 }}>
          Everything beyond the dashboard.
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 0.5,
            borderColor: colors.border,
            overflow: "hidden",
            ...shadow.card,
          }}
        >
          {tools.map((t, i) => (
            <ToolRow key={t.href} tool={t} isLast={i === tools.length - 1} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolRow({ tool, isLast }: { tool: ToolDef; isLast: boolean }) {
  return (
    <Link href={tool.href as never} asChild>
      <Pressable
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : "transparent",
          gap: 14,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: tool.iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>{tool.glyph}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.text,
              letterSpacing: -0.1,
              marginBottom: 1,
            }}
          >
            {tool.title}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 19, marginTop: 2 }}>{tool.desc}</Text>
        </View>
        {tool.premium ? (
          <View
            style={{
              backgroundColor: colors.premiumBg,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: colors.premium,
              }}
            >
              PRO
            </Text>
          </View>
        ) : null}
        {tool.badge && tool.badge > 0 ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.brand,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>
              {tool.badge}
            </Text>
          </View>
        ) : null}
        <Text style={{ color: colors.faint, fontSize: 18, fontWeight: "300" }}>›</Text>
      </Pressable>
    </Link>
  );
}
