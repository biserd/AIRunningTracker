import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, Zap } from "lucide-react";

type ConsistencyLabel = "recovery" | "easier" | "consistent" | "harder" | "much_harder";

interface TrainingConsistencyProps {
  consistencyLabel: ConsistencyLabel;
  effortScore: number;
  effortVsAverage: number;
  compact?: boolean;
}

const consistencyConfig: Record<ConsistencyLabel, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof TrendingUp;
  description: string;
}> = {
  recovery: {
    label: "Recovery",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Minus,
    description: "Easy effort - active recovery"
  },
  easier: {
    label: "Easier",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    icon: TrendingDown,
    description: "Lower intensity than usual"
  },
  consistent: {
    label: "Consistent",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: Activity,
    description: "Matches your typical effort"
  },
  harder: {
    label: "Harder",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: TrendingUp,
    description: "Pushed beyond your average"
  },
  much_harder: {
    label: "Much Harder",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: Zap,
    description: "Significantly more intense"
  }
};

export default function TrainingConsistency({ 
  consistencyLabel, 
  effortScore, 
  effortVsAverage,
  compact = false 
}: TrainingConsistencyProps) {
  const config = consistencyConfig[consistencyLabel];
  const Icon = config.icon;

  if (compact) {
    return (
      <Badge 
        variant="secondary" 
        className={`${config.bgColor} ${config.color} gap-1`}
        data-testid="badge-consistency-compact"
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="training-consistency">
      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${config.color}`} data-testid="text-consistency-label">
            {config.label}
          </span>
          <span className="text-xs text-gray-500">
            Effort Score: {effortScore}
          </span>
        </div>
        <p className="text-xs text-gray-500" data-testid="text-consistency-description">
          {effortVsAverage !== 0 && (
            <span className={effortVsAverage > 0 ? 'text-orange-600' : 'text-blue-600'}>
              {effortVsAverage > 0 ? '+' : ''}{effortVsAverage}% vs average
            </span>
          )}
          {effortVsAverage === 0 && 'Right at your average'}
        </p>
      </div>
    </div>
  );
}

export function ConsistencyBadge({ consistencyLabel }: { consistencyLabel: ConsistencyLabel }) {
  const config = consistencyConfig[consistencyLabel];
  const Icon = config.icon;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
      data-testid="badge-consistency"
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}