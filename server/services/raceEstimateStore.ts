import type { SqlDatabase } from "../d1/activities";
import { raceEstimateSchema, type RaceEstimate } from "../../shared/daySevenRace";

export async function readRaceEstimate(db: SqlDatabase, userId: number): Promise<RaceEstimate | null> {
  const row = await db.prepare("SELECT estimate_json FROM latest_race_estimates WHERE user_id=?")
    .bind(userId).first<{ estimate_json: string }>();
  return row ? raceEstimateSchema.parse(JSON.parse(row.estimate_json)) : null;
}

export async function saveRaceEstimate(db: SqlDatabase, userId: number, estimate: RaceEstimate, now = new Date()): Promise<void> {
  await db.prepare(`INSERT INTO latest_race_estimates(user_id,estimate_json,calculated_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET estimate_json=excluded.estimate_json,calculated_at=excluded.calculated_at`)
    .bind(userId, JSON.stringify(estimate), now.toISOString()).run();
}
