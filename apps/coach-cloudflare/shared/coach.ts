export type Day = {
  id: string;
  date: string;
  title: string;
  kind: "easy" | "long" | "rest" | "quality";
  minutes: number;
  completed: boolean;
};
export type Activity = { date: string; km: number; minutes: number };
export type State = {
  source?: "fictional_sample" | "production_account";
  updatedAt?: string;
  timezone?: string;
  historyLimit?: number;
  historyDays?: number;
  days: Day[];
  activities: Activity[];
  today: string;
  goal: string;
};
export type Change = {
  dayId: string;
  kind: "shorten" | "rest" | "move";
  minutes?: number;
  date?: string;
};
export type Snapshot = {
  runner?: { id: number; name: string; timezone: string; unitPreference: string };
  canUseAI?: boolean;
  state: State;
  version: number;
  lastAction: string | null;
};
export type Proposal = {
  id: string;
  description: string;
  before: Day[];
  after: Day[];
};
const date = (d: Date) => d.toISOString().slice(0, 10);
export function seed(now = new Date()): State {
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const today = date(now);
  const names = [
    "Easy miles",
    "Rest & recharge",
    "Easy + strides",
    "Easy run",
    "Rest & recharge",
    "Long, easy run",
    "Recovery run",
  ];
  const minutes = [35, 0, 40, 35, 0, 75, 25];
  const days: Day[] = names.map((title, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      id: `day-${i}`,
      date: date(d),
      title,
      minutes: minutes[i],
      kind: i === 5 ? "long" : minutes[i] === 0 ? "rest" : "easy",
      completed: date(d) < today,
    };
  });
  const activities = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(
      d.getUTCDate() - 28 + Math.floor(i / 4) * 7 + [0, 2, 4, 6][i % 4],
    );
    return {
      date: date(d),
      km: [5, 6, 5, 10][i % 4],
      minutes: [32, 39, 33, 68][i % 4],
    };
  });
  return { today, days, activities, goal: "Build a steady running habit" };
}
export function changePlan(
  state: State,
  input: Change,
): { state: State; description: string } {
  if (state.source === "production_account") throw new Error("Manage your real training plan on aitracker.run/training-plans. No changes were made here.");
  const next = structuredClone(state);
  const day = next.days.find((d) => d.id === input.dayId);
  if (!day || day.completed || day.date < state.today)
    throw new Error("Choose an upcoming, unfinished session.");
  let description: string;
  if (input.kind === "shorten") {
    if (
      !Number.isInteger(input.minutes) ||
      input.minutes! < 10 ||
      input.minutes! >= day.minutes
    )
      throw new Error(
        "Choose at least 10 minutes and less than the planned duration.",
      );
    description = `Shorten ${day.title.toLowerCase()} from ${day.minutes} to ${input.minutes} minutes. Keep it conversational.`;
    day.minutes = input.minutes!;
  } else if (input.kind === "rest") {
    if (day.kind === "rest") throw new Error("This is already a rest day.");
    description = `Replace ${day.title.toLowerCase()} with a rest day. The rest of your week stays the same.`;
    day.title = "Rest & recharge";
    day.kind = "rest";
    day.minutes = 0;
  } else if (input.kind === "move") {
    const target = next.days.find(
      (d) => d.date === input.date && d.id !== day.id,
    );
    if (
      !target ||
      target.completed ||
      target.date < state.today ||
      target.kind !== "rest"
    )
      throw new Error(
        "Choose an upcoming rest day in this week. Completed sessions stay unchanged.",
      );
    description = `Move ${day.title.toLowerCase()} to ${target.date}. ${day.date} becomes a rest day.`;
    const original = day.date;
    day.date = target.date;
    target.date = original;
  } else throw new Error("Unsupported adjustment.");
  next.days.sort((a, b) => a.date.localeCompare(b.date));
  return { state: next, description };
}
export function evidence(state: State) {
  const runs = state.activities;
  const grouped = new Map<string, {label:string;runs:number;km:number}>();
  for (const run of runs) {
    const day = new Date(run.date+"T12:00:00Z");
    day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));
    const label=day.toISOString().slice(0,10);
    const bucket=grouped.get(label) || {label,runs:0,km:0};
    bucket.runs++; bucket.km+=run.km; grouped.set(label,bucket);
  }
  const weeks=[...grouped.values()].sort((a,b)=>a.label.localeCompare(b.label))
    .map(w=>({...w,km:Math.round(w.km*10)/10}));
  return {
    source: state.source || "fictional_sample",
    weeks,
    totalRuns: runs.length,
    totalKm: runs.reduce((a, x) => a + x.km, 0),
    from: runs[0]?.date,
    to: runs.at(-1)?.date,
  };
}
