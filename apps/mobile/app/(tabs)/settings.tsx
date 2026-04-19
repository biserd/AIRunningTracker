import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { registerForPushAsync, unregisterPushAsync, sendTestPush } from "../../lib/push";
import { colors, shadow } from "../../lib/theme";
import type { User, SubscriptionStatus, NotificationsResponse } from "../../types";

const PUSH_TOKEN_KEY = "ra_push_token";

export default function SettingsScreen() {
  const { user, signOut, setUser } = useAuth();
  const qc = useQueryClient();

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PUSH_TOKEN_KEY).then(setPushToken);
  }, []);

  const sub = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api<SubscriptionStatus>("/api/stripe/subscription"),
  });

  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<NotificationsResponse>("/api/notifications?limit=1"),
    refetchInterval: 60000,
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
      qc.invalidateQueries({ queryKey: ["activities"] });
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
          Alert.alert(
            "Push not enabled",
            result.message || "Could not enable notifications.",
          );
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

  const onTestPush = async () => {
    try {
      await sendTestPush();
      Alert.alert("Sent", "Test push fired. Watch for it on your device.");
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
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
  const planName = sub.data?.subscriptionPlan
    ? sub.data.subscriptionPlan.charAt(0).toUpperCase() + sub.data.subscriptionPlan.slice(1)
    : "Free";
  const planActive =
    sub.data?.subscriptionStatus === "active" ||
    sub.data?.subscriptionStatus === "trialing";

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
            marginBottom: 18,
          }}
        >
          Settings
        </Text>

        {/* Account card */}
        <Group>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.brand,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 20 }}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: colors.text,
                  letterSpacing: -0.2,
                }}
              >
                {user?.firstName || user?.username || "Runner"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {user?.email || "—"}
              </Text>
            </View>
          </View>
        </Group>

        {/* Subscription */}
        {sub.data ? (
          <>
            <GroupLabel>Subscription</GroupLabel>
            <Group>
              <Row>
                <IconSquare bg={planActive ? colors.premium : colors.faint} glyph="★" />
                <Text style={rowLabel}>{planName}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: planActive ? colors.successText : colors.muted,
                    marginRight: 8,
                  }}
                >
                  {planActive ? "Active" : sub.data.subscriptionStatus.replace(/_/g, " ")}
                </Text>
                <Chevron />
              </Row>
              {sub.data.isReverseTrial && sub.data.trialDaysRemaining ? (
                <SubRow>
                  {sub.data.trialDaysRemaining}-day trial · Manage at aitracker.run
                </SubRow>
              ) : sub.data.subscriptionEndsAt ? (
                <SubRow>
                  Renews {new Date(sub.data.subscriptionEndsAt).toLocaleDateString()} · $7.99/mo
                </SubRow>
              ) : (
                <SubRow>Manage billing at aitracker.run</SubRow>
              )}
            </Group>
          </>
        ) : null}

        {/* Notifications row */}
        <GroupLabel>Activity</GroupLabel>
        <Group>
          <Link href="/tools/notifications" asChild>
            <Pressable>
              {({ pressed }) => (
                <View
                  style={{
                    backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 15,
                    paddingHorizontal: 16,
                    gap: 12,
                  }}
                >
                  <IconSquare bg={colors.brand} glyph="🔔" />
                  <Text style={rowLabel}>Notifications</Text>
                  <Text style={{ fontSize: 14, color: colors.muted, marginRight: 8 }}>
                    {notifs.data?.unreadCount
                      ? `${notifs.data.unreadCount} new`
                      : "All caught up"}
                  </Text>
                  <Chevron />
                </View>
              )}
            </Pressable>
          </Link>
        </Group>

        {/* Preferences */}
        <GroupLabel>Preferences</GroupLabel>
        <Group>
          <Row>
            <Text style={rowLabel}>Units</Text>
            <Segment
              value={unit}
              onChange={(v) => updateUnits.mutate(v)}
              disabled={updateUnits.isPending}
            />
          </Row>
          <Row>
            <Text style={rowLabel}>Push Notifications</Text>
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
          {pushToken ? (
            <Pressable
              onPress={onTestPush}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 15,
                paddingHorizontal: 16,
              })}
            >
              <Text style={[rowLabel, { color: colors.brand }]}>Send test push</Text>
            </Pressable>
          ) : null}
        </Group>

        {/* About */}
        <Group>
          <Row>
            <Text style={rowLabel}>Privacy Policy</Text>
            <Chevron />
          </Row>
          <Row last>
            <Text style={rowLabel}>Version</Text>
            <Text style={{ fontSize: 14, color: colors.muted }}>1.0.0</Text>
          </Row>
        </Group>

        {/* Sign out */}
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => ({
            width: "100%",
            paddingVertical: 14,
            backgroundColor: "rgba(252,76,2,0.06)",
            borderWidth: 0.5,
            borderColor: "rgba(252,76,2,0.25)",
            borderRadius: 14,
            alignItems: "center",
            marginTop: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: colors.brand, fontWeight: "600", fontSize: 16 }}>
            Sign Out
          </Text>
        </Pressable>

        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: colors.faint,
            marginTop: 12,
          }}
        >
          Manage Strava connection and billing at aitracker.run
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Building blocks ────────────────────────────────────── */
const rowLabel = {
  flex: 1,
  fontSize: 15,
  color: colors.text,
  fontWeight: "400" as const,
};

function Group({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.border,
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
        fontWeight: "600",
        letterSpacing: 0.6,
        color: colors.muted,
        textTransform: "uppercase",
        marginLeft: 8,
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Row({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

function SubRow({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 12,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.muted }}>{children}</Text>
    </View>
  );
}

function IconSquare({ bg, glyph }: { bg: string; glyph: string }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{glyph}</Text>
    </View>
  );
}

function Chevron() {
  return (
    <Text style={{ color: colors.faint, fontSize: 18, fontWeight: "300" }}>›</Text>
  );
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
        backgroundColor: colors.surfaceAlt,
        borderRadius: 10,
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
              borderRadius: 8,
              backgroundColor: active ? colors.surface : "transparent",
              borderWidth: active ? 0.5 : 0,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: active ? colors.text : colors.muted,
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
