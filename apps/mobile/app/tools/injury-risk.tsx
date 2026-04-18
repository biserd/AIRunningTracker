import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { InjuryRiskAnalysis, MLRacePrediction } from "../../types";

const RISK_COLOR: Record<string, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
};

interface PredictionsResponse {
  predictions: MLRacePrediction[];
}

export default function InjuryRiskScreen() {
  const { user } = useAuth();

  const risk = useQuery({
    queryKey: ["injury-risk", user?.id],
    queryFn: () => api<InjuryRiskAnalysis>(`/api/ml/injury-risk/${user!.id}`),
    enabled: !!user?.id,
  });

  const preds = useQuery({
    queryKey: ["ml-predictions", user?.id],
    queryFn: () => api<PredictionsResponse>(`/api/ml/predictions/${user!.id}`),
    enabled: !!user?.id,
  });

  const refetchAll = () => {
    risk.refetch();
    preds.refetch();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Injury Risk & ML",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={risk.isRefetching || preds.isRefetching}
              onRefresh={refetchAll}
              tintColor="#fc4c02"
            />
          }
        >
          {/* INJURY RISK */}
          {risk.isLoading ? (
            <ActivityIndicator color="#fc4c02" />
          ) : risk.data ? (
            <View
              className="rounded-2xl p-5"
              style={{ backgroundColor: RISK_COLOR[risk.data.riskLevel] || "#94a3b8" }}
            >
              <Text className="text-xs uppercase tracking-wide text-white/80">
                Injury risk
              </Text>
              <Text className="text-3xl font-bold text-white mt-1">
                {risk.data.riskLevel}
              </Text>
              <Text className="text-sm text-white/90 mt-2">
                Based on training patterns over recent weeks.
              </Text>
            </View>
          ) : null}

          {risk.data?.riskFactors && risk.data.riskFactors.length > 0 ? (
            <Section title="Risk factors">
              {risk.data.riskFactors.map((f, i) => (
                <View key={i} className="flex-row items-start gap-2 py-1">
                  <Text className="text-orange-500">⚠️</Text>
                  <Text className="text-sm text-slate-700 dark:text-slate-200 flex-1">
                    {f}
                  </Text>
                </View>
              ))}
            </Section>
          ) : null}

          {risk.data?.recommendations && risk.data.recommendations.length > 0 ? (
            <Section title="Recommendations">
              {risk.data.recommendations.map((r, i) => (
                <View key={i} className="flex-row items-start gap-2 py-1">
                  <Text className="text-green-500">✓</Text>
                  <Text className="text-sm text-slate-700 dark:text-slate-200 flex-1">
                    {r}
                  </Text>
                </View>
              ))}
            </Section>
          ) : null}

          {/* ML RACE PREDICTIONS */}
          <Section title="ML race predictions">
            {preds.isLoading ? (
              <ActivityIndicator color="#fc4c02" />
            ) : !preds.data?.predictions || preds.data.predictions.length === 0 ? (
              <Text className="text-sm text-slate-500">
                Need more training history to predict races.
              </Text>
            ) : (
              <View className="gap-3">
                {preds.data.predictions.map((p, i) => (
                  <View
                    key={i}
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-slate-900 dark:text-white">
                        {p.distance}
                      </Text>
                      <View className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">
                        <Text className="text-[10px] text-slate-600 dark:text-slate-300">
                          {Math.round(p.confidence * 100)}% confidence
                        </Text>
                      </View>
                    </View>
                    <Text className="text-2xl font-bold text-strava mt-1">
                      {p.predictedTime}
                    </Text>
                    {p.recommendation ? (
                      <Text className="text-xs text-slate-500 mt-2 leading-4">
                        {p.recommendation}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">{title}</Text>
      {children}
    </View>
  );
}
