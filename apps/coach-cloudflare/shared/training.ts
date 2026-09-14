export type Facts = Record<string, unknown>;
export type TrainingContext = {
  loadedAt: string; profile: Facts; plans: Facts[]; goals: Facts[];
  metrics: Record<string, Facts>; unavailable: string[]; canWritePlans: boolean;
  coverage: string;
};
export type PlanIntent =
  | {kind:'create';goalType:string;raceDate:string;preferredRunDays:string[];maxWeeklyHours:number;constraints:string}
  | {kind:'adjust';planId:number;feeling:'tired'|'strong'}
  | {kind:'settings';planId:number;raceDate:string;targetTime:string};
export type PlanReview = {id:string;description:string;details:PlanIntent};
