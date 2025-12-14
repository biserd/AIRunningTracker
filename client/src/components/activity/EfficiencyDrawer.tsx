import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, AlertTriangle, CheckCircle, Activity, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EfficiencyDrawerProps {
  onClose: () => void;
  efficiency: {
    aerobicDecoupling: number | null;
    decouplingLabel: string;
    paceHrEfficiency: number | null;
    pacingStability: number;
    pacingLabel: string;
    cadenceDrift: number | null;
    firstHalfPace: number | null;
    secondHalfPace: number | null;
    firstHalfHr: number | null;
    secondHalfHr: number | null;
    splitVariance: number;
  };
  quality: {
    score: number;
    flags: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    hrQuality: number;
    gpsQuality: number;
    pauseQuality: number;
  };
}

const decouplingColors: Record<string, string> = {
  excellent: "text-emerald-600",
  good: "text-blue-600",
  moderate: "text-yellow-600",
  concerning: "text-red-600",
  unknown: "text-gray-600"
};

const pacingColors: Record<string, string> = {
  very_stable: "text-emerald-600",
  stable: "text-blue-600",
  variable: "text-yellow-600",
  erratic: "text-red-600"
};

export default function EfficiencyDrawer({ onClose, efficiency, quality }: EfficiencyDrawerProps) {
  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-teal-50" data-testid="drawer-efficiency">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Why It Happened</CardTitle>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-green-100 rounded-full transition-colors"
          data-testid="button-close-efficiency"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Aerobic Decoupling</span>
            </div>
            {efficiency.aerobicDecoupling !== null ? (
              <>
                <p className={`text-xl font-bold ${decouplingColors[efficiency.decouplingLabel]}`}>
                  {efficiency.aerobicDecoupling}%
                </p>
                <p className="text-xs text-gray-500 capitalize">{efficiency.decouplingLabel.replace('_', ' ')}</p>
                {efficiency.firstHalfHr && efficiency.secondHalfHr && (
                  <p className="text-xs text-gray-400 mt-1">
                    HR: {efficiency.firstHalfHr} → {efficiency.secondHalfHr} bpm
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Insufficient data</p>
            )}
          </div>

          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Pacing Stability</span>
            </div>
            <p className={`text-xl font-bold ${pacingColors[efficiency.pacingLabel]}`}>
              {efficiency.pacingStability}%
            </p>
            <p className="text-xs text-gray-500 capitalize">{efficiency.pacingLabel.replace('_', ' ')}</p>
            {efficiency.splitVariance > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                CV: {efficiency.splitVariance}%
              </p>
            )}
          </div>
        </div>

        {quality.flags.length > 0 && (
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-gray-900">Data Quality Flags</span>
            </div>
            <div className="space-y-1">
              {quality.flags.map((flag, index) => (
                <div key={index} className="flex items-start gap-2 text-sm" data-testid={`quality-flag-${index}`}>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    flag.severity === 'high' ? 'bg-red-100 text-red-700' :
                    flag.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {flag.severity}
                  </span>
                  <span className="text-gray-600">{flag.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">Data Quality Score</span>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={quality.score} className="flex-1 h-2" />
            <span className={`text-sm font-bold ${
              quality.score >= 85 ? 'text-emerald-600' :
              quality.score >= 70 ? 'text-blue-600' :
              quality.score >= 50 ? 'text-amber-600' :
              'text-red-600'
            }`}>
              {quality.score}/100
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
            <div>HR: {quality.hrQuality}%</div>
            <div>GPS: {quality.gpsQuality}%</div>
            <div>Pause: {quality.pauseQuality}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
