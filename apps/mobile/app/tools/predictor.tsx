import { useState, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { colors, shadow } from "../../lib/theme";
import { NavBar, SectionLabel, Card, PrimaryButton, EmptyState } from "../../components/ios";
import type { SuitableActivity, RacePrediction } from "../../types";

const RACE_DISTANCES = [
  { label: "5K", meters: 5000 },
  { label: "10K", meters: 10000 },
  { label: "Half", meters: 21097.5 },
  { label: "Marathon", meters: 42195 },
];

interface SuitableResponse {
  activities: SuitableActivity[];
}

export default function PredictorScreen() {
  const { user } = useAuth();
  const unit = (user?.unitPreference || "km") as "km" | "miles";

  const [base, setBase] = useState<SuitableActivity | null>(null);
  const [target, setTarget] = useState<number>(21097.5);

  const suitable = useQuery({
    queryKey: ["predictor-suitable"],
    queryFn: () => api<SuitableResponse>("/api/race-predictor/suitable-activities"),
  });

  const predict = useMutation<RacePrediction, Error, { base: SuitableActivity; target: number }>({
    mutationFn: ({ base: b, target: t }) =>
      api<RacePrediction>("/api/race-predictor/calculate", {
        method: "POST",
        body: JSON.stringify({
          baseEffort: { distance: b.distance, time: b.movingTime },
          targetDistance: t,
        }),
      }),
  });

  const candidates = useMemo(() => suitable.data?.activities ?? [], [suitable.data]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Race Predictor" back="Tools" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          Pick one of your recent harder efforts and a target distance. Uses Riegel's formula
          to estimate your finish time.
        </Text>

        <View>
          <SectionLabel>1. Choose a recent effort</SectionLabel>
          <Card padded={false}>
            {suitable.isLoading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : candidates.length === 0 ? (
              <EmptyState
                title="No suitable activities yet"
                body="Run something at least 5K and sync from Strava."
              />
            ) : (
              candidates.slice(0, 8).map((a, i, arr) => {
                const selected = base?.id === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setBase(a)}
                    style={({ pressed }) => ({
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: selected
                        ? "rgba(252,76,2,0.06)"
                        : pressed
                          ? colors.surfaceAlt
                          : "transparent",
                      borderBottomWidth: i === arr.length - 1 ? 0 : 0.5,
                      borderBottomColor: colors.border,
                      borderLeftWidth: selected ? 3 : 0,
                      borderLeftColor: colors.brand,
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {a.name}
                      </Text>
                      {selected ? (
                        <Text style={{ color: colors.brand, fontWeight: "700" }}>✓</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                      {a.distanceFormatted} · {a.durationFormatted} · {a.paceFormatted}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>
                      {formatDate(a.startDate)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </Card>
        </View>

        <View>
          <SectionLabel>2. Target distance</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {RACE_DISTANCES.map((d) => {
              const selected = target === d.meters;
              return (
                <Pressable
                  key={d.label}
                  onPress={() => setTarget(d.meters)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: selected ? colors.brand : colors.surface,
                    borderWidth: 0.5,
                    borderColor: selected ? colors.brand : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: selected ? "#fff" : colors.text,
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton
          label="Predict"
          onPress={() => base && predict.mutate({ base, target })}
          disabled={!base}
          loading={predict.isPending}
        />

        {predict.error ? (
          <Text style={{ color: colors.danger, fontSize: 14 }}>
            {(predict.error as Error).message}
          </Text>
        ) : null}

        {predict.data ? (
          <View
            style={{
              backgroundColor: colors.brand,
              borderRadius: 18,
              padding: 20,
              ...shadow.card,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: "rgba(255,255,255,0.85)",
                textTransform: "uppercase",
              }}
            >
              Predicted {RACE_DISTANCES.find((r) => r.meters === target)?.label}
            </Text>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "700",
                color: "#fff",
                marginTop: 4,
                letterSpacing: -1.5,
              }}
            >
              {predict.data.formattedTime}
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", marginTop: 4 }}>
              {predict.data.formattedPace} / {unit === "miles" ? "mi" : "km"}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
