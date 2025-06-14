import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface InjuryRiskData {
  riskLevel: 'Low' | 'Medium' | 'High';
  riskFactors: string[];
  recommendations: string[];
}

interface InjuryRiskAnalysisProps {
  userId: number;
}

export default function InjuryRiskAnalysis({ userId }: InjuryRiskAnalysisProps) {
  const { data: riskData, isLoading } = useQuery({
    queryKey: ['/api/ml/injury-risk', userId],
    queryFn: () => fetch(`/api/ml/injury-risk/${userId}`).then(res => res.json()),
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return {
          badge: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          iconColor: "text-green-600"
        };
      case 'Medium':
        return {
          badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: AlertTriangle,
          iconColor: "text-yellow-600"
        };
      case 'High':
        return {
          badge: "bg-red-100 text-red-800 border-red-200",
          icon: XCircle,
          iconColor: "text-red-600"
        };
      default:
        return {
          badge: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Shield,
          iconColor: "text-gray-600"
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Shield className="mr-2 h-5 w-5 text-strava-orange" />
            Injury Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riskData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Shield className="mr-2 h-5 w-5 text-strava-orange" />
            Injury Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Complete more training runs to analyze injury risk</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskConfig = getRiskColor(riskData.riskLevel);
  const RiskIcon = riskConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Shield className="mr-2 h-5 w-5 text-strava-orange" />
          Injury Risk Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Risk Level Display */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <RiskIcon className={`h-6 w-6 ${riskConfig.iconColor}`} />
              <div>
                <h3 className="font-semibold text-charcoal">Current Risk Level</h3>
                <p className="text-sm text-gray-600">Based on recent training patterns</p>
              </div>
            </div>
            <Badge className={riskConfig.badge}>
              {riskData.riskLevel} Risk
            </Badge>
          </div>

          {/* Risk Factors */}
          {riskData.riskFactors.length > 0 && (
            <div>
              <h4 className="font-medium text-charcoal mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                Risk Factors Identified
              </h4>
              <div className="space-y-2">
                {riskData.riskFactors.map((factor: string, index: number) => (
                  <Alert key={index} className="border-yellow-200 bg-yellow-50">
                    <AlertDescription className="text-yellow-800">
                      {factor}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {riskData.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-charcoal mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Recommendations
              </h4>
              <div className="space-y-2">
                {riskData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Risk Factors - Positive Message */}
          {riskData.riskFactors.length === 0 && riskData.riskLevel === 'Low' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">Great job!</h4>
                  <p className="text-sm text-green-800">
                    Your training patterns show low injury risk. Keep up the consistent, well-balanced approach.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">General Prevention Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Increase weekly mileage by no more than 10%</li>
              <li>• Include rest days in your training schedule</li>
              <li>• Listen to your body and address pain early</li>
              <li>• Maintain proper running form and footwear</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}