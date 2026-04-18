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
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDistance, formatDate } from "../../lib/format";
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

  const sortedActivities = useMemo(
    () => suitable.data?.activities.slice(0, 15) ?? [],
    [suitable.data],
  );

  const onRun = () => {
    if (!base) return;
    predict.mutate({ base, target });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        <View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Race Predictor
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            Pick a recent hard effort and a target distance.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
            Target distance
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RACE_DISTANCES.map((d) => (
              <Pressable
                key={d.label}
                onPress={() => setTarget(d.meters)}
                className={`px-4 py-2 rounded-full border ${
                  target === d.meters
                    ? "bg-strava border-strava"
                    : "bg-transparent border-slate-300 dark:border-slate-600"
                } active:opacity-80`}
              >
                <Text
                  className={`text-sm font-medium ${
                    target === d.meters
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
            Pick base effort (last 90 days)
          </Text>
          {suitable.isLoading ? (
            <ActivityIndicator color="#fc4c02" />
          ) : sortedActivities.length === 0 ? (
            <Text className="text-sm text-slate-500">
              No race-effort activities found in the last 90 days.
            </Text>
          ) : (
            <View className="gap-2">
              {sortedActivities.map((a) => {
                const selected = base?.id === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setBase(a)}
                    className={`p-3 rounded-xl border ${
                      selected
                        ? "border-strava bg-orange-50 dark:bg-orange-900/20"
                        : "border-slate-200 dark:border-slate-700"
                    } active:opacity-80`}
                  >
                    <Text
                      className="text-sm font-semibold text-slate-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {formatDate(a.startDate)} • {a.distanceFormatted} {a.distanceUnit}{" "}
                      • {a.durationFormatted} • {a.paceFormatted}/{a.distanceUnit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          onPress={onRun}
          disabled={!base || predict.isPending}
          className="bg-strava rounded-xl py-4 items-center active:opacity-80 disabled:opacity-40"
        >
          <Text className="text-white font-semibold text-base">
            {predict.isPending ? "Predicting…" : "Predict my time"}
          </Text>
        </Pressable>

        {predict.error ? (
          <Text className="text-sm text-red-600 text-center">
            {(predict.error as Error).message}
          </Text>
        ) : null}

        {predict.data ? (
          <View className="bg-strava/10 dark:bg-orange-900/20 rounded-2xl p-5 border border-strava/30">
            <Text className="text-xs uppercase tracking-wide text-strava mb-2">
              Predicted{" "}
              {RACE_DISTANCES.find((d) => d.meters === target)?.label || "race"}
            </Text>
            <Text className="text-4xl font-bold text-slate-900 dark:text-white">
              {predict.data.formattedTime}
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Pace: {predict.data.formattedPace}
            </Text>
            {predict.data.confidence ? (
              <Text className="text-xs text-slate-500 mt-2 capitalize">
                Confidence: {predict.data.confidence}
              </Text>
            ) : null}
            <Text className="text-xs text-slate-400 mt-3">
              Based on {formatDistance(base!.distance, unit)} in {base!.durationFormatted}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
