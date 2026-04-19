import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  Card,
  StatusBanner,
  EmptyState,
  PremiumGate,
} from "../../components/ios";
import type { InjuryRiskAnalysis, MLRacePrediction } from "../../types";

interface PredictionsResponse {
  predictions: MLRacePrediction[];
}

const RISK_TONE: Record<string, "success" | "warning" | "danger"> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

export default function InjuryRiskScreen() {
  const { user } = useAuth();

  const risk = useQuery<InjuryRiskAnalysis, Error>({
    queryKey: ["injury-risk", user?.id],
    queryFn: () => api<InjuryRiskAnalysis>(`/api/ml/injury-risk/${user!.id}`),
    enabled: !!user?.id,
    retry: (failure, err) =>
      err instanceof ApiError && err.status === 403 ? false : failure < 1,
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

  const isPremiumGate = risk.error instanceof ApiError && risk.error.status === 403;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Injury Risk & ML" back="Tools" />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={risk.isRefetching || preds.isRefetching}
            onRefresh={refetchAll}
            tintColor={colors.brand}
          />
        }
      >
        {isPremiumGate ? (
          <PremiumGate
            feature="Injury risk"
            description="Premium unlocks ML-driven injury risk and personalized race predictions."
          />
        ) : risk.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : risk.data ? (
          <StatusBanner
            label="Injury risk"
            title={risk.data.riskLevel}
            body="Based on training patterns over recent weeks."
            tone={RISK_TONE[risk.data.riskLevel] || "warning"}
          />
        ) : null}

        {risk.data?.riskFactors && risk.data.riskFactors.length > 0 ? (
          <Card>
            <SectionLabel style={{ marginLeft: 0 }}>Risk Factors</SectionLabel>
            <View style={{ gap: 8 }}>
              {risk.data.riskFactors.map((f, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ color: colors.warningText, fontSize: 14 }}>⚠︎</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {risk.data?.recommendations && risk.data.recommendations.length > 0 ? (
          <Card>
            <SectionLabel style={{ marginLeft: 0 }}>Recommendations</SectionLabel>
            <View style={{ gap: 8 }}>
              {risk.data.recommendations.map((r, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ color: colors.successText, fontSize: 14, fontWeight: "700" }}>
                    ✓
                  </Text>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 }}>
                    {r}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <View>
          <SectionLabel>ML Race Predictions</SectionLabel>
          {preds.isLoading ? (
            <Card>
              <ActivityIndicator color={colors.brand} />
            </Card>
          ) : !preds.data?.predictions || preds.data.predictions.length === 0 ? (
            <Card>
              <EmptyState
                title="Need more history"
                body="Keep training — predictions appear once you have enough runs."
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {preds.data.predictions.map((p, i) => (
                <Card key={i}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: colors.text }}>
                      {p.distance}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.surfaceAlt,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>
                        {Math.min(100, Math.round(p.confidence > 1 ? p.confidence : p.confidence * 100))}% confidence
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "700",
                      color: colors.brand,
                      letterSpacing: -0.8,
                      marginTop: 4,
                    }}
                  >
                    {p.predictedTime}
                  </Text>
                  {p.recommendation ? (
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 }}>
                      {p.recommendation}
                    </Text>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
