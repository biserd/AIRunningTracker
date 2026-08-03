export type RunUnitPreference = "miles" | "km";

const METERS_PER_MILE = 1609.344;

export function normalizeRunUnit(unitPreference?: string | null): RunUnitPreference {
  return unitPreference === "miles" ? "miles" : "km";
}

export function distanceInPreferredUnit(distanceMeters: number, unitPreference?: string | null): number {
  const safeMeters = Number.isFinite(distanceMeters) && distanceMeters > 0 ? distanceMeters : 0;
  return normalizeRunUnit(unitPreference) === "miles" ? safeMeters / METERS_PER_MILE : safeMeters / 1000;
}

export function formatRunDistance(
  distanceMeters: number,
  unitPreference?: string | null,
  decimals = 2,
): string {
  return distanceInPreferredUnit(distanceMeters, unitPreference).toFixed(decimals);
}

export function formatRunPace(
  movingTimeSeconds: number,
  distanceMeters: number,
  unitPreference?: string | null,
): string {
  const distance = distanceInPreferredUnit(distanceMeters, unitPreference);
  if (!Number.isFinite(movingTimeSeconds) || movingTimeSeconds <= 0 || distance <= 0) return "0:00";
  const roundedSecondsPerUnit = Math.round(movingTimeSeconds / distance);
  const minutes = Math.floor(roundedSecondsPerUnit / 60);
  const seconds = roundedSecondsPerUnit % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatRunDuration(movingTimeSeconds: number): string {
  const safeSeconds = Number.isFinite(movingTimeSeconds) && movingTimeSeconds > 0
    ? Math.round(movingTimeSeconds)
    : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function runUnitLabels(unitPreference?: string | null): {
  distanceUnit: "mi" | "km";
  paceUnit: "/mi" | "/km";
} {
  return normalizeRunUnit(unitPreference) === "miles"
    ? { distanceUnit: "mi", paceUnit: "/mi" }
    : { distanceUnit: "km", paceUnit: "/km" };
}
