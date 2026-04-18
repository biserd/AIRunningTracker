import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../lib/auth";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fc4c02",
        tabBarInactiveTintColor: "#5a6068",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="predictor"
        options={{
          title: "Predictor",
          tabBarIcon: ({ focused }) => <TabIcon label="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
