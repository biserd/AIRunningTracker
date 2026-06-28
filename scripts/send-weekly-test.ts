import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { sendWeeklySummaries } from '../server/services/weeklySummaryWorker';

async function main() {
  const r = await db.execute(sql`
    SELECT id, email, first_name, coach_notify_weekly_summary, strava_connected, unit_preference
    FROM users WHERE email = 'biserd@gmail.com' LIMIT 1
  `);
  const user = r.rows[0] as any;
  if (!user) { console.log('User not found'); process.exit(1); }
  console.log('Found user:', user.id, user.email, '| strava_connected:', user.strava_connected, '| opted_in:', user.coach_notify_weekly_summary);

  const wasOptedIn = user.coach_notify_weekly_summary;
  const wasStravaConnected = user.strava_connected;

  if (!wasOptedIn) {
    await db.execute(sql`UPDATE users SET coach_notify_weekly_summary = true WHERE id = ${user.id}`);
    console.log('Temporarily opted user in for weekly summary');
  }
  if (!wasStravaConnected) {
    await db.execute(sql`UPDATE users SET strava_connected = true WHERE id = ${user.id}`);
    console.log('Temporarily set strava_connected = true');
  }

  try {
    const result = await sendWeeklySummaries();
    console.log('Send result:', JSON.stringify(result));
  } finally {
    if (!wasOptedIn) {
      await db.execute(sql`UPDATE users SET coach_notify_weekly_summary = false WHERE id = ${user.id}`);
      console.log('Restored coach_notify_weekly_summary = false');
    }
    if (!wasStravaConnected) {
      await db.execute(sql`UPDATE users SET strava_connected = ${wasStravaConnected} WHERE id = ${user.id}`);
      console.log('Restored strava_connected =', wasStravaConnected);
    }
  }
}
main().catch(err => { console.error(err); process.exit(1); });
