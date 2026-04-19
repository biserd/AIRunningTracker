import { Redirect, Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useAuth } from "../../lib/auth";
import { colors } from "../../lib/theme";

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 28 }}>
      <Text
        style={{
          fontSize: 22,
          opacity: focused ? 1 : 0.45,
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.92)",
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon glyph="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ focused }) => <TabIcon glyph="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ focused }) => <TabIcon glyph="🧰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙️" focused={focused} />,
        }}
      />
      <Tabs.Screen name="predictor" options={{ href: null }} />
    </Tabs>
  );
}
