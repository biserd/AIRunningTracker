export type DistanceUnit = "km" | "miles";
export type PaceConfidence = "High" | "Medium" | "Low";
export type SplitStrategy = "even" | "conservative" | "negative";

const METERS_PER_MILE = 1609.344;
const RIEGEL_EXPONENT = 1.06;

export interface TrainingPaceInput {
  distanceMeters: number;
  timeSeconds: number;
  raceAgeDays: number;
  weeklyDistanceKm: number;
  averageHeartRate?: number | null;
}

export interface TrainingPaceZone {
  key: "easy" | "long" | "steady" | "threshold" | "interval";
  label: string;
  fasterSecondsPerKm: number;
  slowerSecondsPerKm: number;
  purpose: string;
}

export interface TrainingPaceResult {
  equivalent10kSeconds: number;
  confidence: PaceConfidence;
  confidenceReason: string;
  zones: TrainingPaceZone[];
  notes: string[];
}

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero`);
}

export function calculateTrainingPaces(input: TrainingPaceInput): TrainingPaceResult {
  requirePositiveFinite(input.distanceMeters, "Distance");
  requirePositiveFinite(input.timeSeconds, "Time");
  if (!Number.isFinite(input.raceAgeDays) || input.raceAgeDays < 0) throw new Error("Race age cannot be negative");
  if (!Number.isFinite(input.weeklyDistanceKm) || input.weeklyDistanceKm < 0) throw new Error("Weekly distance cannot be negative");

  const equivalent10kSeconds = input.timeSeconds * Math.pow(10_000 / input.distanceMeters, RIEGEL_EXPONENT);
  const tenKSecondsPerKm = equivalent10kSeconds / 10;
  const definitions: Array<{
    key: TrainingPaceZone["key"];
    label: string;
    faster: number;
    slower: number;
    purpose: string;
  }> = [
    { key: "easy", label: "Easy / recovery", faster: 1.25, slower: 1.4, purpose: "Conversational running and recovery between harder sessions." },
    { key: "long", label: "Long run", faster: 1.2, slower: 1.35, purpose: "Aerobic endurance without turning every long run into a race effort." },
    { key: "steady", label: "Steady", faster: 1.12, slower: 1.22, purpose: "Controlled aerobic work between easy and threshold intensity." },
    { key: "threshold", label: "Threshold", faster: 1.05, slower: 1.12, purpose: "Sustained, controlled work that should remain repeatable rather than all-out." },
    { key: "interval", label: "Intervals", faster: 0.96, slower: 1.04, purpose: "Short repetitions with recovery; duration and terrain materially affect the right pace." },
  ];

  let confidencePoints = 0;
  if (input.raceAgeDays <= 42) confidencePoints += 2;
  else if (input.raceAgeDays <= 90) confidencePoints += 1;
  if (input.distanceMeters >= 5_000 && input.distanceMeters <= 21_097.5) confidencePoints += 2;
  else if (input.distanceMeters >= 3_000 && input.distanceMeters <= 30_000) confidencePoints += 1;
  if (input.weeklyDistanceKm >= 15) confidencePoints += 1;

  const confidence: PaceConfidence = confidencePoints >= 4 ? "High" : confidencePoints >= 2 ? "Medium" : "Low";
  const confidenceReason = confidence === "High"
    ? "The result uses a recent performance at a distance that transfers reasonably well to training pace estimates."
    : confidence === "Medium"
      ? "The result is usable as a starting point, but the effort age, distance, or current volume reduces confidence."
      : "Treat these as broad starting ranges because the effort is old, unusually short or long, or supported by limited recent volume.";

  const notes = [
    "The ranges are derived from a Riegel-normalized 10K equivalent and deliberately remain broad.",
    "Use effort and talk-test feedback to slow down when conditions, hills, fatigue, or recovery require it.",
  ];
  if (input.weeklyDistanceKm < 15) notes.push("Build consistency before adding multiple structured pace sessions each week.");
  if (input.averageHeartRate) notes.push("Average race heart rate is shown only as context; maximum and threshold heart rate are required for defensible heart-rate zones.");

  return {
    equivalent10kSeconds: Math.round(equivalent10kSeconds),
    confidence,
    confidenceReason,
    zones: definitions.map((zone) => ({
      key: zone.key,
      label: zone.label,
      fasterSecondsPerKm: Math.round(tenKSecondsPerKm * zone.faster),
      slowerSecondsPerKm: Math.round(tenKSecondsPerKm * zone.slower),
      purpose: zone.purpose,
    })),
    notes,
  };
}

export function formatPace(secondsPerKm: number, unit: DistanceUnit): string {
  const seconds = Math.max(0, Math.round(unit === "miles" ? secondsPerKm * 1.609344 : secondsPerKm));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}/${unit === "miles" ? "mi" : "km"}`;
}

export interface RaceSplitInput {
  distanceMeters: number;
  goalTimeSeconds: number;
  unit: DistanceUnit;
  strategy: SplitStrategy;
}

export interface RaceSplitRow {
  split: number;
  distance: number;
  splitDistance: number;
  splitSeconds: number;
  cumulativeSeconds: number;
  paceSecondsPerUnit: number;
}

export interface RaceSplitResult {
  rows: RaceSplitRow[];
  averagePaceSecondsPerUnit: number;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
}

function strategyWeight(strategy: SplitStrategy, midpointFraction: number): number {
  if (strategy === "negative") return midpointFraction < 0.5 ? 1.01 : 0.99;
  if (strategy === "conservative") {
    if (midpointFraction < 0.2) return 1.02;
    if (midpointFraction >= 0.8) return 0.98;
  }
  return 1;
}

export function calculateRaceSplits(input: RaceSplitInput): RaceSplitResult {
  requirePositiveFinite(input.distanceMeters, "Distance");
  requirePositiveFinite(input.goalTimeSeconds, "Goal time");
  const unitMeters = input.unit === "miles" ? METERS_PER_MILE : 1000;
  const totalUnits = input.distanceMeters / unitMeters;
  const rowCount = Math.ceil(totalUnits);
  const segments = Array.from({ length: rowCount }, (_, index) => {
    const start = index;
    const end = Math.min(index + 1, totalUnits);
    const splitDistance = end - start;
    const midpointFraction = totalUnits > 0 ? (start + splitDistance / 2) / totalUnits : 0;
    return { splitDistance, weight: strategyWeight(input.strategy, midpointFraction) };
  });
  const weightedUnits = segments.reduce((sum, segment) => sum + segment.splitDistance * segment.weight, 0);
  const basePace = input.goalTimeSeconds / weightedUnits;
  const rawTimes = segments.map((segment) => segment.splitDistance * segment.weight * basePace);
  const roundedTimes = rawTimes.map((value) => Math.round(value));
  roundedTimes[roundedTimes.length - 1] += Math.round(input.goalTimeSeconds) - roundedTimes.reduce((sum, value) => sum + value, 0);

  let cumulativeSeconds = 0;
  let cumulativeDistance = 0;
  const rows = segments.map((segment, index) => {
    cumulativeSeconds += roundedTimes[index];
    cumulativeDistance += segment.splitDistance;
    return {
      split: index + 1,
      distance: cumulativeDistance,
      splitDistance: segment.splitDistance,
      splitSeconds: roundedTimes[index],
      cumulativeSeconds,
      paceSecondsPerUnit: roundedTimes[index] / segment.splitDistance,
    };
  });

  const halfDistance = totalUnits / 2;
  let firstHalfSeconds = 0;
  let covered = 0;
  rows.forEach((row) => {
    const portionBeforeHalf = Math.max(0, Math.min(row.splitDistance, halfDistance - covered));
    if (portionBeforeHalf > 0) firstHalfSeconds += row.splitSeconds * (portionBeforeHalf / row.splitDistance);
    covered += row.splitDistance;
  });
  firstHalfSeconds = Math.round(firstHalfSeconds);

  return {
    rows,
    averagePaceSecondsPerUnit: Math.round(input.goalTimeSeconds / totalUnits),
    firstHalfSeconds,
    secondHalfSeconds: Math.round(input.goalTimeSeconds) - firstHalfSeconds,
  };
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}
