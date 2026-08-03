import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Footprints, TrendingUp, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { metersToFeet, type UnitSystem } from "@shared/utils";

interface RunningEfficiencyData {
  averageCadence: number;
  strideLength: number;
  verticalOscillation: null;
  groundContactTime: null;
  efficiency: number;
  recommendations: string[];
  runsAnalyzed: number;
  dataConfidence: "limited" | "moderate" | "high";
  unitPreference?: UnitSystem;
}

interface RunningEfficiencyProps {
  userId: number;
  batchData?: any;
}

const consistencyLabel = (score: number) => {
  if (score >= 90) return "Very consistent";
  if (score >= 80) return "Consistent";
  if (score >= 65) return "Variable";
  return "Highly variable";
};

export default function RunningEfficiency({ userId, batchData }: RunningEfficiencyProps) {
  const { data: efficiencyDataResponse, isLoading } = useQuery({
    queryKey: ["/api/performance/efficiency", userId],
    queryFn: () => apiRequest(`/api/performance/efficiency/${userId}`),
    enabled: batchData === undefined,
  });

  const efficiencyData = (batchData?.efficiency ?? efficiencyDataResponse) as RunningEfficiencyData | null | undefined;
  const unitPreference = (efficiencyData?.unitPreference ?? batchData?.unitPreference ?? "miles") as UnitSystem;

  if (isLoading && batchData === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle>Running Form Signals</CardTitle></CardHeader>
        <CardContent><div className="h-40 animate-pulse rounded-lg bg-gray-100" /></CardContent>
      </Card>
    );
  }

  if (!efficiencyData) {
    return (
      <Card>
        <CardHeader><CardTitle>Running Form Signals</CardTitle></CardHeader>
        <CardContent className="py-8 text-center">
          <Footprints className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-charcoal">Not enough recorded cadence yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            We need at least three runs with cadence data before comparing your personal form signals.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isImperial = unitPreference === "miles";
  const stepLength = isImperial
    ? metersToFeet(efficiencyData.strideLength).toFixed(2)
    : efficiencyData.strideLength.toFixed(2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center text-xl">
            <Footprints className="mr-2 h-5 w-5 text-blue-600" />
            Running Form Signals
          </CardTitle>
          <Badge variant="outline" className="capitalize">
            {efficiencyData.dataConfidence} confidence
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          Based on {efficiencyData.runsAnalyzed} runs with recorded cadence.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-900">Pace consistency</p>
              <p className="text-xs text-blue-700">Across the cadence-enabled runs analyzed</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-blue-900">{efficiencyData.efficiency}%</span>
              <p className="text-xs font-medium text-blue-700">{consistencyLabel(efficiencyData.efficiency)}</p>
            </div>
          </div>
          <Progress value={efficiencyData.efficiency} className="h-2" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Footprints className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-charcoal">Average cadence</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">
              {efficiencyData.averageCadence} <span className="text-sm font-normal text-gray-600">spm</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">Compare with your own similar runs</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-charcoal">Estimated step length</span>
            </div>
            <p className="text-2xl font-bold text-charcoal">
              {stepLength} <span className="text-sm font-normal text-gray-600">{isImperial ? "ft" : "m"}</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">Derived from average speed and cadence</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-charcoal">
            <Info className="h-4 w-4 text-blue-600" />
            How to use this
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {efficiencyData.recommendations.map((recommendation) => (
              <li key={recommendation}>• {recommendation}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Cadence is individual. This view does not invent vertical oscillation or ground-contact data when your device did not record it.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
