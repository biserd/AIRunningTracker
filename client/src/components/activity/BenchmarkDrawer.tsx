import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";

interface BenchmarkDrawerProps {
  onClose: () => void;
  comparison: {
    paceVsAvg: number;
    hrVsAvg: number;
    effortVsAvg: number;
    distanceVsAvg: number;
  };
  embedded?: boolean;
}

export default function BenchmarkDrawer({ onClose, comparison, embedded = false }: BenchmarkDrawerProps) {
  const getIcon = (value: number, inverted: boolean = false) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;
    
    if (isPositive) return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (isNegative) return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getColor = (value: number, inverted: boolean = false) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;
    
    if (isPositive) return "text-emerald-600";
    if (isNegative) return "text-red-600";
    return "text-gray-600";
  };

  const getLabel = (value: number) => {
    if (Math.abs(value) < 3) return "Similar to baseline";
    if (value > 0) return `${Math.abs(value)}% above baseline`;
    return `${Math.abs(value)}% below baseline`;
  };

  const metrics = [
    {
      key: "pace",
      label: "Pace",
      value: comparison.paceVsAvg,
      inverted: true,
      description: "Negative = faster pace"
    },
    {
      key: "hr",
      label: "Heart Rate",
      value: comparison.hrVsAvg,
      inverted: false,
      description: "Lower is typically better at same pace"
    },
    {
      key: "effort",
      label: "Effort Score",
      value: comparison.effortVsAvg,
      inverted: false,
      description: "Composite of HR + duration + intensity"
    },
    {
      key: "distance",
      label: "Distance",
      value: comparison.distanceVsAvg,
      inverted: false,
      description: "Compared to your average run length"
    }
  ];

  return (
    <Card className={embedded ? "border-0 shadow-none bg-transparent" : "border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"} data-testid="drawer-benchmark">
      {!embedded && (
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Compared to Baseline (42 days)</CardTitle>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
            data-testid="button-close-benchmark"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="bg-white/60 rounded-lg p-3" data-testid={`benchmark-${metric.key}`}>
              <div className="flex items-center gap-2 mb-1">
                {getIcon(metric.value, metric.inverted)}
                <span className="font-medium text-gray-900">{metric.label}</span>
              </div>
              <p className={`text-lg font-bold ${getColor(metric.value, metric.inverted)}`}>
                {metric.value > 0 ? '+' : ''}{metric.value}%
              </p>
              <p className="text-xs text-gray-500">{getLabel(metric.value)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Baseline calculated from your last 42 days of running
        </p>
      </CardContent>
    </Card>
  );
}
