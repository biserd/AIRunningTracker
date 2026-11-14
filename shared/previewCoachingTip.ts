type RunSummary = {
  distanceMeters?: number;
  movingTimeSec?: number;
};

type RunComparison = {
  sampleSize: number;
  baselinePaceSecondsPerUnit: number | null;
  paceDeltaSecondsPerUnit: number | null;
  heartRateDelta: number | null;
};

// Uses only the run summary already displayed to the runner. No model, streams,
// workout classification from the name, or conclusions from heart rate alone.
export function previewCoachingTip(run: RunSummary, comparison?: RunComparison | null): string {
  const distance = run.distanceMeters ?? 0;
  const duration = run.movingTimeSec ?? 0;

  if (duration >= 150 * 60 || distance >= 30_000) {
    return "After a run this long, make your first run back short and conversational. Skip the pace target and wait until easy running feels normal again before adding speed.";
  }

  if (duration >= 90 * 60 || distance >= 20_000) {
    return "Keep your next outing easier and shorter than this one. Start at a pace where you can speak in full sentences, and don’t try to match this run’s average pace.";
  }

  const baselinePace = comparison?.baselinePaceSecondsPerUnit;
  const paceDelta = comparison?.paceDeltaSecondsPerUnit;
  if (comparison && comparison.sampleSize >= 2 && baselinePace && baselinePace > 0
    && paceDelta != null && Math.abs(paceDelta) <= baselinePace * 0.05) {
    const heartRateDelta = comparison.heartRateDelta;
    if (heartRateDelta != null && heartRateDelta >= 5) {
      return "Your heart rate was higher than usual at a similar pace. If your next run is easy, start slower and use the talk test instead of chasing this pace. Compare again on similar terrain and in similar weather.";
    }
    if (heartRateDelta != null && heartRateDelta <= -5) {
      return "You ran at a similar pace with a lower average heart rate. Repeat the effort on a similar route before changing your pace target. One run is a useful signal, not a trend.";
    }
  }

  return "Use this run as a reference, not a target. On your next easy run, start the first 10 minutes at a pace where you can speak in full sentences. If it still feels easy, settle in without forcing the pace.";
}
