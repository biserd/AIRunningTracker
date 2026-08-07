export type TrainingSplitClassification = "Polarized" | "Pyramidal" | "Threshold-Heavy" | "Mixed";

export interface TrainingSplitRecommendation {
  zone: string;
  adjustment: string;
  rationale: string;
}
export interface TrainingSplitSummary {
  zone1Percent: number;
  zone2Percent: number;
  zone3Percent: number;
  classification: TrainingSplitClassification;
  classificationColor: string;
  weeksInPeriod: number;
  weeklyAverageMinutes: number;
  recommendations: TrainingSplitRecommendation[];
}

export function classifyTrainingSplit(z1Pct: number, z2Pct: number, z3Pct: number) {
  if (z1Pct >= 70 && z3Pct >= 10 && z2Pct <= 20) {
    return { classification: "Polarized" as const, classificationColor: "bg-blue-500" };
  }
  if (z2Pct >= 25) {
    return { classification: "Threshold-Heavy" as const, classificationColor: "bg-orange-500" };
  }
  if (z1Pct > z2Pct && z2Pct > z3Pct && z2Pct >= 10 && z2Pct <= 25) {
    return { classification: "Pyramidal" as const, classificationColor: "bg-green-500" };
  }
  return { classification: "Mixed" as const, classificationColor: "bg-gray-500" };
}

export function summarizeTrainingSplit(
  zone1Minutes: number,
  zone2Minutes: number,
  zone3Minutes: number,
  periodDays: number,
  goal: string = "general",
): TrainingSplitSummary {
  const values = [zone1Minutes, zone2Minutes, zone3Minutes, periodDays];
  if (values.some((value) => !Number.isFinite(value) || value < 0) || periodDays < 7) {
    throw new Error("Training totals and period must be valid finite numbers");
  }

  const totalMinutes = zone1Minutes + zone2Minutes + zone3Minutes;
  if (totalMinutes <= 0) throw new Error("Add at least one minute of training");

  const weeksInPeriod = periodDays / 7;
  const weeklyAverageMinutes = totalMinutes / weeksInPeriod;
  const zone1Percent = zone1Minutes / totalMinutes * 100;
  const zone2Percent = zone2Minutes / totalMinutes * 100;
  const zone3Percent = zone3Minutes / totalMinutes * 100;
  const { classification, classificationColor } = classifyTrainingSplit(zone1Percent, zone2Percent, zone3Percent);
  const recommendations = buildTrainingSplitRecommendations(
    zone1Percent,
    zone2Percent,
    zone3Percent,
    weeklyAverageMinutes,
    classification,
    goal,
  );

  return {
    zone1Percent,
    zone2Percent,
    zone3Percent,
    classification,
    classificationColor,
    weeksInPeriod,
    weeklyAverageMinutes,
    recommendations,
  };
}

function signedMinutes(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} min/week`;
}

export function buildTrainingSplitRecommendations(
  z1Pct: number,
  z2Pct: number,
  z3Pct: number,
  weeklyMinutes: number,
  classification: TrainingSplitClassification,
  goal: string,
): TrainingSplitRecommendation[] {
  if (classification === "Threshold-Heavy") {
    const moveFromZ2 = Math.max(0, (z2Pct - 20) / 100 * weeklyMinutes);
    return [
      {
        zone: "Zone 2",
        adjustment: signedMinutes(-moveFromZ2),
        rationale: "Reduce moderate-intensity time; this is a redistribution of your current weekly load.",
      },
      {
        zone: "Zone 1",
        adjustment: signedMinutes(moveFromZ2),
        rationale: "Move that time to conversational running instead of adding more total or hard minutes.",
      },
      {
        zone: "Zone 3",
        adjustment: "No automatic increase",
        rationale: "Add hard work only within a structured plan and when recovery is adequate.",
      },
    ];
  }

  if (classification === "Polarized" || classification === "Pyramidal") {
    return [{
      zone: "Current split",
      adjustment: "Maintain",
      rationale: "Your weekly distribution is balanced; progress volume gradually rather than chasing a template percentage.",
    }];
  }

  const target = goal === "speed" || goal === "race" ? { z1: 75, z2: 15, z3: 10 } : { z1: 80, z2: 15, z3: 5 };
  const z1Delta = (target.z1 - z1Pct) / 100 * weeklyMinutes;
  const z2Delta = (target.z2 - z2Pct) / 100 * weeklyMinutes;
  const hardDelta = (target.z3 - z3Pct) / 100 * weeklyMinutes;
  const hardIncreaseCap = Math.min(10, weeklyMinutes * 0.05);

  return [
    ...(Math.abs(z1Delta) >= 10 ? [{
      zone: "Zone 1",
      adjustment: signedMinutes(z1Delta),
      rationale: z1Delta > 0 ? "Prioritize conversational running within your existing weekly time." : "Shift some easy time only if your plan needs more quality work.",
    }] : []),
    ...(Math.abs(z2Delta) >= 10 ? [{
      zone: "Zone 2",
      adjustment: signedMinutes(z2Delta),
      rationale: "Treat this as a weekly redistribution, not an instruction to increase total load.",
    }] : []),
    ...(hardDelta > 5 ? [{
      zone: "Zone 3",
      adjustment: `Up to +${Math.round(Math.min(hardDelta, hardIncreaseCap))} min/week`,
      rationale: "Optional cap for race-focused runners; skip it when fatigued, returning from injury, or without a structured workout.",
    }] : []),
  ];
}
