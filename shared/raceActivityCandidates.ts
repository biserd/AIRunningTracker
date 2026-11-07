export function raceActivityCandidates<T extends { type: string; distance: number; movingTime: number; elapsedTime?: number | null; workoutType?: number | null }>(activities: T[]) {
  return activities.filter(a => ["Run", "TrailRun", "VirtualRun"].includes(a.type) && a.distance >= 3000 && a.movingTime >= 600 && Number.isFinite(a.distance) && Number.isFinite(a.movingTime)).map(a => ({
    ...a,
    raceTime: a.elapsedTime && a.elapsedTime >= a.movingTime ? a.elapsedTime : a.movingTime,
    timeBasis: a.elapsedTime && a.elapsedTime >= a.movingTime ? "elapsed" : "moving",
    isTaggedRace: a.workoutType === 1,
  }));
}
