import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { registerForPushAsync, unregisterPushAsync } from "../../lib/push";
import { colors, shadow } from "../../lib/theme";
import type { User, SubscriptionStatus } from "../../types";

const PUSH_TOKEN_KEY = "ra_push_token";

export default function ProfileScreen() {
  const { user, signOut, setUser } = useAuth();
  const qc = useQueryClient();

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [weeklyOn, setWeeklyOn] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(PUSH_TOKEN_KEY).then(setPushToken);
  }, []);

  const sub = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api<SubscriptionStatus>("/api/stripe/subscription"),
  });

  const updateUnits = useMutation({
    mutationFn: (unitPreference: "km" | "miles") =>
      api<{ user: User }>(`/api/users/${user!.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ unitPreference }),
      }),
    onSuccess: (res) => {
      setUser(res.user);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activities-all"] });
      qc.invalidateQueries({ queryKey: ["last-activity"] });
    },
    onError: (e) => Alert.alert("Couldn't update", (e as Error).message),
  });

  const togglePush = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      if (enabled) {
        const result = await registerForPushAsync();
        if (result.status === "registered" && result.token) {
          await SecureStore.setItemAsync(PUSH_TOKEN_KEY, result.token);
          setPushToken(result.token);
        } else {
          Alert.alert("Push not enabled", result.message || "Could not enable notifications.");
        }
      } else if (pushToken) {
        await unregisterPushAsync(pushToken);
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
        setPushToken(null);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const unit = (user?.unitPreference || "km") as "km" | "miles";
  const initial = (user?.firstName?.[0] || user?.username?.[0] || "R").toUpperCase();
  const planActive =
    sub.data?.subscriptionStatus === "active" || sub.data?.subscriptionStatus === "trialing";
  const renewalText = sub.data?.subscriptionEndsAt
    ? `Renews ${new Date(sub.data.subscriptionEndsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · $7.99/mo`
    : sub.data?.isReverseTrial && sub.data?.trialDaysRemaining
      ? `${sub.data.trialDaysRemaining}-day trial · Manage at aitracker.run`
      : "Manage billing at aitracker.run";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: colors.ink, letterSpacing: -0.6, marginBottom: 24 }}>
          Profile
        </Text>

        {/* Account */}
        <Group>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 14 }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.brand,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 20 }}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.ink, letterSpacing: -0.2 }}>
                {user?.firstName || user?.username || "Runner"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink2, marginTop: 2 }}>{user?.email || "—"}</Text>
            </View>
          </View>
        </Group>

        {/* Subscription */}
        <GroupLabel>Subscription</GroupLabel>
        <Group>
          <Pressable onPress={() => Linking.openURL("https://aitracker.run/settings/billing")}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  gap: 12,
                  borderBottomWidth: sub.data ? 0.5 : 0,
                  borderBottomColor: colors.line,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                }}
              >
                <IconSquare bg={colors.purple} icon="star" />
                <Text style={rowLabel}>Premium</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: planActive ? colors.green : colors.ink2,
                    marginRight: 8,
                  }}
                >
                  {planActive ? "Active" : sub.data?.subscriptionStatus?.replace(/_/g, " ") || "Free"}
                </Text>
                <Chevron />
              </View>
            )}
          </Pressable>
          {sub.data ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 13, color: colors.ink2 }}>{renewalText}</Text>
            </View>
          ) : null}
        </Group>

        {/* Connected */}
        <GroupLabel>Connected</GroupLabel>
        <Group>
          <Pressable onPress={() => Linking.openURL("https://aitracker.run/settings")}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  gap: 12,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                }}
              >
                <IconSquare bg={colors.brand} icon="logo-strava" />
                <Text style={rowLabel}>Strava</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: user?.stravaConnected ? colors.green : colors.ink2,
                    marginRight: 8,
                  }}
                >
                  {user?.stravaConnected ? "Connected" : "Not connected"}
                </Text>
                <Chevron />
              </View>
            )}
          </Pressable>
        </Group>

        {/* Preferences */}
        <GroupLabel>Preferences</GroupLabel>
        <Group>
          <Row>
            <Text style={rowLabel}>Units</Text>
            <Segment value={unit} onChange={(v) => updateUnits.mutate(v)} disabled={updateUnits.isPending} />
          </Row>
          <Row>
            <Text style={rowLabel}>Post-run notifications</Text>
            {pushBusy ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Switch
                value={!!pushToken}
                onValueChange={togglePush}
                trackColor={{ true: colors.brand, false: "#E5E3DE" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E3DE"
              />
            )}
          </Row>
          <Row last>
            <Text style={rowLabel}>Weekly debrief</Text>
            <Switch
              value={weeklyOn}
              onValueChange={setWeeklyOn}
              trackColor={{ true: colors.brand, false: "#E5E3DE" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E3DE"
            />
          </Row>
        </Group>

        {/* Privacy */}
        <Group>
          <Pressable onPress={() => Linking.openURL("https://aitracker.run/privacy")}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  gap: 12,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                }}
              >
                <Text style={rowLabel}>Privacy Policy</Text>
                <Chevron />
              </View>
            )}
          </Pressable>
        </Group>

        {/* Sign out */}
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => ({
            marginTop: 8,
            paddingVertical: 14,
            backgroundColor: colors.surface,
            borderRadius: 16,
            alignItems: "center",
            opacity: pressed ? 0.7 : 1,
            ...shadow.card,
          })}
        >
          <Text style={{ color: colors.red, fontWeight: "600", fontSize: 16 }}>Sign Out</Text>
        </Pressable>

        <Text style={{ textAlign: "center", fontSize: 12, color: colors.ink3, marginTop: 12 }}>
          Manage billing at aitracker.run
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const rowLabel = {
  flex: 1,
  fontSize: 15,
  color: colors.ink,
  fontWeight: "400" as const,
};

function Group({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 14,
        ...shadow.card,
      }}
    >
      {children}
    </View>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.6,
        color: colors.ink3,
        textTransform: "uppercase",
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 6,
      }}
    >
      {children}
    </Text>
  );
}

function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.line,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

function IconSquare({ bg, icon }: { bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={16} color="#fff" />
    </View>
  );
}

function Chevron() {
  return <Ionicons name="chevron-forward" size={16} color={colors.ink3} />;
}

function Segment({
  value,
  onChange,
  disabled,
}: {
  value: "km" | "miles";
  onChange: (v: "km" | "miles") => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#EEEDE9",
        borderRadius: 9,
        padding: 2,
        gap: 2,
      }}
    >
      {(["km", "miles"] as const).map((v) => {
        const active = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => !disabled && onChange(v)}
            disabled={disabled}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 7,
              backgroundColor: active ? colors.surface : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "500",
                color: active ? colors.ink : colors.ink3,
              }}
            >
              {v === "km" ? "km" : "Miles"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
