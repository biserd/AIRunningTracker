import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Gauge, BarChart3 } from "lucide-react";

type ChipType = "drift" | "pacing" | "quality" | "benchmark";

interface InsightChipsProps {
  onChipClick: (chip: ChipType) => void;
  activeChip: ChipType | null;
  efficiencyData?: {
    aerobicDecoupling: number | null;
    decouplingLabel: string;
    pacingStability: number;
    pacingLabel: string;
  };
  qualityData?: {
    score: number;
    flags: Array<{ type: string; severity: string }>;
  };
  comparisonData?: {
    paceVsAvg: number;
    distanceVsAvg: number;
  };
}

const chipConfig: Record<ChipType, { icon: typeof TrendingUp; label: string; description: string }> = {
  drift: {
    icon: TrendingUp,
    label: "Drift",
    description: "Aerobic decoupling analysis"
  },
  pacing: {
    icon: Activity,
    label: "Pacing",
    description: "Pace stability throughout run"
  },
  quality: {
    icon: Gauge,
    label: "Quality",
    description: "Data quality assessment"
  },
  benchmark: {
    icon: BarChart3,
    label: "vs Baseline",
    description: "Compare to your recent average"
  }
};

function getChipStatus(chip: ChipType, efficiencyData?: InsightChipsProps['efficiencyData'], qualityData?: InsightChipsProps['qualityData'], comparisonData?: InsightChipsProps['comparisonData']): {
  status: "good" | "neutral" | "warning";
  value: string;
} {
  switch (chip) {
    case "drift":
      if (!efficiencyData?.aerobicDecoupling) return { status: "neutral", value: "N/A" };
      const decoupling = efficiencyData.aerobicDecoupling;
      if (decoupling < 3) return { status: "good", value: `${decoupling}%` };
      if (decoupling < 5) return { status: "neutral", value: `${decoupling}%` };
      return { status: "warning", value: `${decoupling}%` };

    case "pacing":
      if (!efficiencyData?.pacingStability) return { status: "neutral", value: "N/A" };
      const stability = efficiencyData.pacingStability;
      if (stability >= 80) return { status: "good", value: `${stability}%` };
      if (stability >= 60) return { status: "neutral", value: `${stability}%` };
      return { status: "warning", value: `${stability}%` };

    case "quality":
      if (!qualityData?.score) return { status: "neutral", value: "N/A" };
      const score = qualityData.score;
      if (score >= 85) return { status: "good", value: `${score}` };
      if (score >= 70) return { status: "neutral", value: `${score}` };
      return { status: "warning", value: `${score}` };

    case "benchmark":
      if (!comparisonData?.paceVsAvg) return { status: "neutral", value: "N/A" };
      const pace = comparisonData.paceVsAvg;
      if (pace < -3) return { status: "good", value: `${pace}%` };
      if (pace > 3) return { status: "warning", value: `+${pace}%` };
      return { status: "neutral", value: `${pace > 0 ? '+' : ''}${pace}%` };
  }
}

const statusColors = {
  good: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
};

export default function InsightChips({ onChipClick, activeChip, efficiencyData, qualityData, comparisonData }: InsightChipsProps) {
  const chips: ChipType[] = ["drift", "pacing", "quality", "benchmark"];

  return (
    <div className="flex flex-wrap gap-2 mt-4 mb-2" data-testid="insight-chips">
      {chips.map((chip) => {
        const config = chipConfig[chip];
        const IconComponent = config.icon;
        const { status, value } = getChipStatus(chip, efficiencyData, qualityData, comparisonData);
        const isActive = activeChip === chip;

        return (
          <button
            key={chip}
            onClick={() => onChipClick(chip)}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${statusColors[status]}
              ${isActive ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
            `}
            data-testid={`chip-${chip}`}
          >
            <IconComponent className="w-4 h-4" />
            <span>{config.label}</span>
            <span className="font-semibold">{value}</span>
          </button>
        );
      })}
    </div>
  );
}
