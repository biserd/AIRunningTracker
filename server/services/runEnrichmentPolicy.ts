export function runEnrichmentNeeds(activity: { streamsData?: string | null; lapsData?: string | null }) {
  const missing = (value: string | null | undefined) => !value || value === "null";
  return { needsStreams: missing(activity.streamsData), needsLaps: missing(activity.lapsData) };
}

export const runHydrationJobId = (userId: number, activityId: number) =>
  `run_hydrate_${userId}_${activityId}_v1`;

export const runRecapJobId = (userId: number, activityId: number) =>
  `run_recap_${userId}_${activityId}_v1`;
