import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, Footprints, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { 
  metersToFeet, 
  cmToInches, 
  type UnitSystem 
} from "@shared/utils";

interface RunningEfficiencyData {
  averageCadence: number;
  strideLength: number;
  verticalOscillation: number;
  groundContactTime: number;
  efficiency: number;
  recommendations: string[];
  unitPreference: UnitSystem;
}

interface RunningEfficiencyProps {
  userId: number;
  batchData?: any;
}

export default function RunningEfficiency({ userId, batchData }: RunningEfficiencyProps) {
  const { data: efficiencyDataResponse, isLoading } = useQuery({
    queryKey: ['/api/performance/efficiency', userId],
    queryFn: () => fetch(`/api/performance/efficiency/${userId}`).then(res => res.json()),
    enabled: batchData === undefined ? false : !batchData,
  });
  
  const efficiencyData = batchData?.efficiency ?? efficiencyDataResponse;

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return "text-green-600";
    if (efficiency >= 70) return "text-blue-600";
    if (efficiency >= 55) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 85) return { text: "Excellent", class: "bg-green-100 text-green-800 border-green-200" };
    if (efficiency >= 70) return { text: "Good", class: "bg-blue-100 text-blue-800 border-blue-200" };
    if (efficiency >= 55) return { text: "Fair", class: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { text: "Needs Work", class: "bg-red-100 text-red-800 border-red-200" };
  };

  const getCadenceStatus = (cadence: number) => {
    if (cadence >= 170 && cadence <= 190) return { icon: CheckCircle, color: "text-green-600", text: "Optimal" };
    return { icon: AlertCircle, color: "text-yellow-600", text: "Can Improve" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            Running Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!efficiencyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            Running Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Zap className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Complete more training runs to analyze efficiency</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const efficiencyBadge = getEfficiencyBadge(efficiencyData.efficiency);
  const cadenceStatus = getCadenceStatus(efficiencyData.averageCadence);
  const CadenceIcon = cadenceStatus.icon;

  // Convert units based on preference
  const isImperial = efficiencyData.unitPreference === 'miles';
  const strideValue = isImperial 
    ? metersToFeet(efficiencyData.strideLength).toFixed(2)
    : efficiencyData.strideLength.toFixed(2);
  const strideUnit = isImperial ? 'ft' : 'm';
  
  const vertOscValue = isImperial
    ? cmToInches(efficiencyData.verticalOscillation).toFixed(2)
    : efficiencyData.verticalOscillation.toFixed(1);
  const vertOscUnit = isImperial ? 'in' : 'cm';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Zap className="mr-2 h-5 w-5 text-yellow-500" />
          Running Efficiency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Efficiency Score */}
          <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className={`text-4xl font-bold ${getEfficiencyColor(efficiencyData.efficiency)}`}>
                {efficiencyData.efficiency}%
              </span>
              <Badge className={efficiencyBadge.class}>
                {efficiencyBadge.text}
              </Badge>
            </div>
            <Progress value={efficiencyData.efficiency} className="h-3 mb-2" />
            <p className="text-sm text-gray-600">Overall Running Efficiency Score</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cadence */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Footprints className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-charcoal">Cadence</span>
                </div>
                <CadenceIcon className={`h-4 w-4 ${cadenceStatus.color}`} />
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-charcoal">{efficiencyData.averageCadence}</span>
                <span className="text-sm text-gray-600">spm</span>
              </div>
              <p className={`text-xs ${cadenceStatus.color} font-medium`}>{cadenceStatus.text}</p>
            </div>

            {/* Stride Length */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-charcoal">Stride Length</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-charcoal">{strideValue}</span>
                <span className="text-sm text-gray-600">{strideUnit}</span>
              </div>
              <p className="text-xs text-gray-600">Per stride distance</p>
            </div>

            {/* Vertical Oscillation */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600 transform rotate-90" />
                <span className="font-medium text-charcoal">Vert. Oscillation</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-charcoal">{vertOscValue}</span>
                <span className="text-sm text-gray-600">{vertOscUnit}</span>
              </div>
              <p className="text-xs text-gray-600">Lower is better</p>
            </div>

            {/* Ground Contact Time */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-charcoal">Contact Time</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-charcoal">{efficiencyData.groundContactTime}</span>
                <span className="text-sm text-gray-600">ms</span>
              </div>
              <p className="text-xs text-gray-600">Ground contact</p>
            </div>
          </div>

          {/* Recommendations */}
          {efficiencyData.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-charcoal flex items-center">
                <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                Efficiency Recommendations
              </h4>
              <div className="space-y-2">
                {efficiencyData.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Efficiency Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Efficiency Guidelines</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Footprints className="h-3 w-3" />
                  <span><strong>Optimal Cadence:</strong> 170-180 spm</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    <strong>Stride Length:</strong> {isImperial ? '3.3-4.3 ft' : '1.0-1.3 m'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 transform rotate-90" />
                  <span>
                    <strong>Vert. Oscillation:</strong> {isImperial ? '<3.5 in' : '<9 cm'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3" />
                  <span><strong>Contact Time:</strong> &lt;250ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Training Tips */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Improve Your Efficiency</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Focus on quick, light steps rather than long strides</li>
              <li>• Practice running drills: high knees, butt kicks, skipping</li>
              <li>• Maintain relaxed shoulders and arms</li>
              <li>• Use a metronome to practice consistent cadence</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}