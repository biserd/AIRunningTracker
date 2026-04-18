export function formatDistance(meters: number, unit: "km" | "miles" = "km"): string {
  if (unit === "miles") {
    const mi = (meters / 1000) * 0.621371;
    return `${mi.toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPace(
  metersPerSecond: number | null | undefined,
  unit: "km" | "miles" = "km",
): string {
  if (!metersPerSecond || metersPerSecond <= 0) return "—";
  const secondsPerKm = 1000 / metersPerSecond;
  const secondsPerUnit = unit === "miles" ? secondsPerKm / 0.621371 : secondsPerKm;
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.floor(secondsPerUnit % 60);
  return `${m}:${String(s).padStart(2, "0")} /${unit === "miles" ? "mi" : "km"}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatElevation(meters: number | null | undefined, unit: "km" | "miles" = "km"): string {
  if (meters == null) return "—";
  if (unit === "miles") return `${Math.round(meters * 3.28084)} ft`;
  return `${Math.round(meters)} m`;
}
