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
import { Stack, router } from "expo-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Race Predictor",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          <Text className="text-sm text-slate-600 dark:text-slate-300">
            Pick one of your recent harder efforts and a target distance. Uses Riegel's formula
            to estimate finish time.
          </Text>

          <Section title="1. Choose a recent effort">
            {suitable.isLoading ? (
              <ActivityIndicator color="#fc4c02" />
            ) : candidates.length === 0 ? (
              <Text className="text-sm text-slate-500">
                No suitable activities yet. Run something at least 5K and sync.
              </Text>
            ) : (
              candidates.slice(0, 8).map((a) => {
                const selected = base?.id === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setBase(a)}
                    className={`p-3 rounded-xl border ${
                      selected
                        ? "border-strava bg-orange-50 dark:bg-orange-950/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    } active:opacity-80`}
                  >
                    <Text className="text-sm font-medium text-slate-900 dark:text-white" numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {a.distanceFormatted} • {a.durationFormatted} • {a.paceFormatted}
                    </Text>
                    <Text className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(a.startDate)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </Section>

          <Section title="2. Target distance">
            <View className="flex-row flex-wrap gap-2">
              {RACE_DISTANCES.map((d) => {
                const selected = target === d.meters;
                return (
                  <Pressable
                    key={d.label}
                    onPress={() => setTarget(d.meters)}
                    className={`px-4 py-2 rounded-full border ${
                      selected
                        ? "border-strava bg-strava"
                        : "border-slate-300 dark:border-slate-600"
                    } active:opacity-80`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? "text-white" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Pressable
            disabled={!base || predict.isPending}
            onPress={() => base && predict.mutate({ base, target })}
            className={`rounded-xl py-4 items-center ${
              !base || predict.isPending
                ? "bg-slate-300 dark:bg-slate-700"
                : "bg-strava active:opacity-80"
            }`}
          >
            {predict.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Predict</Text>
            )}
          </Pressable>

          {predict.error ? (
            <Text className="text-red-500 text-sm">{(predict.error as Error).message}</Text>
          ) : null}

          {predict.data ? (
            <View className="bg-gradient-to-br from-strava to-orange-600 bg-strava rounded-2xl p-5 mt-2">
              <Text className="text-xs uppercase tracking-wide text-white/80">
                Predicted {RACE_DISTANCES.find((r) => r.meters === target)?.label}
              </Text>
              <Text className="text-4xl font-bold text-white mt-1">
                {predict.data.formattedTime}
              </Text>
              <Text className="text-sm text-white/90 mt-1">
                {predict.data.formattedPace}/{unit === "miles" ? "mi" : "km"}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs uppercase tracking-wide text-slate-400">{title}</Text>
      {children}
    </View>
  );
}
