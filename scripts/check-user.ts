import { db } from '../server/db';
import { sql } from 'drizzle-orm';
async function main() {
  const r = await db.execute(sql`SELECT id, email, first_name, strava_connected, coach_notify_weekly_summary FROM users WHERE lower(email) = lower('biserd@gmail.com') LIMIT 1`);
  console.log('rows:', JSON.stringify(r.rows));
  const r2 = await db.execute(sql`SELECT COUNT(*) as total FROM users`);
  console.log('total users:', r2.rows[0]);
  const r3 = await db.execute(sql`SELECT id, email FROM users LIMIT 5`);
  console.log('sample emails:', JSON.stringify(r3.rows));
}
main().catch(console.error);
