import type { GarminRun } from './garmin';

// This is arithmetic and authored copy, not an AI prompt or stored knowledge base.
// Never pass this payload, its derived findings, health data or route data to AI.
export const GARMIN_PREMIUM_BENEFIT = 'goal-based training-plan tools and coach conversations that do not use your Garmin data';
export const GARMIN_AI_NOTICE = 'Garmin runs and recovery readings are not used by the AI coach or Runner Score. Starting a trial does not change that.';
export interface GarminRunPreview {
  kind: 'rules_based_garmin';
  name: string;
  startDate: string;
  detailUrl: string;
  findings: [string, string];
  nextAction: string;
}
export interface GarminOnboarding {
  connected: boolean;
  connectionStatus: string;
  activityCount: number;
  hasEmail: boolean;
  hasPremium: boolean;
  state: 'not_connected' | 'waiting_for_run' | 'ready';
  preview: GarminRunPreview | null;
}
export function garminRunPreview(runs: GarminRun[], units: string | null | undefined, now = Date.now()): GarminRunPreview | null {
  const run = runs.filter(r => Number.isFinite(r.distance) && r.distance >= 1000 && Number.isFinite(r.duration) && r.duration > 0 && Number.isFinite(Date.parse(r.startDate)) && Date.parse(r.startDate) <= now && Date.parse(r.startDate) >= now - 30 * 86400000)
    .sort((a,b) => Date.parse(b.startDate)-Date.parse(a.startDate) || a.id.localeCompare(b.id))[0];
  if (!run) return null;
  const miles = units !== 'km', divisor = miles ? 1609.344 : 1000, unit = miles ? 'mi' : 'km';
  const pace = Math.round(run.duration / (run.distance / divisor));
  const paceText = `${Math.floor(pace/60)}:${String(pace%60).padStart(2,'0')} /${unit}`;
  const distance = `${(run.distance/divisor).toFixed(2)} ${unit}`;
  const totalSeconds=Math.round(run.duration), minutes = Math.floor(totalSeconds/60), seconds = totalSeconds%60;
  const second = typeof run.averageHeartRate === 'number' && Number.isFinite(run.averageHeartRate) && run.averageHeartRate > 0
    ? `Garmin reported an average heart rate of ${Math.round(run.averageHeartRate)} bpm. This is a recorded measurement, not an assessment of your effort or recovery.`
    : typeof run.elevationGain === 'number' && Number.isFinite(run.elevationGain) && run.elevationGain >= 0
      ? `Garmin reported ${Math.round(run.elevationGain*(miles?3.28084:1))} ${miles?'ft':'m'} of elevation gain. Comparing routes with similar climbing can help you put pace in context.`
      : 'No average heart rate or elevation measurement was supplied for this preview. Missing sensor readings are not estimated.';
  return { kind:'rules_based_garmin', name:run.name.slice(0,120), startDate:run.startDate,
    detailUrl:'/runs/garmin/'+encodeURIComponent(run.id),
    findings:[`You covered ${distance} in ${minutes}:${String(seconds).padStart(2,'0')}, averaging ${paceText} across the recorded duration.`,second],
    nextAction:'Open this run to review its available recorded details. This preview uses local calculations, not AI or a personalized training prescription.' };
}
