import { Client } from 'pg';
import { assertRunnerSession, type RunnerSession } from './session';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import type { LoginUser } from '../container/magic-links';

// Initial staging reads only. No writes, raw SQL or caller-supplied user IDs
// are exposed by the HTTP surface.
type DatabaseClient = Pick<Client, 'connect' | 'query' | 'end'>;
type ClientFactory = (connectionString: string) => DatabaseClient;
const makeClient: ClientFactory = (connectionString) => new Client({
  connectionString, connectionTimeoutMillis: 5000, query_timeout: 7000,
});

export class RunnerReads {
  constructor(private readonly hyperdrive: Pick<Hyperdrive, 'connectionString'>,
    private readonly factory: ClientFactory = makeClient) {}

  /** Only the authentication handler uses this lookup; no public arbitrary-user read route. */
  findLoginUser(key: { email: string } | { id: number }): Promise<LoginUser | null> {
    return this.transaction(async client => {
      const result = await client.query<LoginUser>(`SELECT id, email, first_name AS "firstName", last_name AS "lastName",
        subscription_plan AS "subscriptionPlan", subscription_status AS "subscriptionStatus" FROM public.users
        WHERE ${'email' in key ? 'lower(email) = $1' : 'id = $1'} LIMIT 2`, ['email' in key ? key.email.toLowerCase() : key.id]);
      // Ambiguous case-variant duplicates must not sign into an arbitrary account.
      return result.rows.length === 1 ? result.rows[0] : null;
    });
  }

  private async transaction<T>(operation: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client = this.factory(this.hyperdrive.connectionString);
    let connected = false;
    try {
      await client.connect();
      connected = true;
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '8000ms'");
      return await operation(client);
    } finally {
      // Explicit rollback is required before closing a Hyperdrive transaction.
      // Relying on disconnect alone left real Worker requests waiting indefinitely.
      try { if (connected) await client.query('ROLLBACK'); }
      finally { await client.end(); }
    }
  }

  private read<T>(session: RunnerSession, operation: (client: DatabaseClient) => Promise<T>): Promise<T> {
    assertRunnerSession(session);
    return this.transaction(operation);
  }

  migrationReadiness(session: RunnerSession) {
    return this.read(session, async client => {
      const admin = await client.query('SELECT is_admin FROM public.users WHERE id=$1 LIMIT 1', [session.userId]);
      if (admin.rows[0]?.is_admin !== true) throw new Error('FORBIDDEN');
      const state = await client.query(`SELECT
        to_regclass('public.cloudflare_jobs') IS NOT NULL AS "queueTable",
        EXISTS (SELECT 1 FROM public.system_settings WHERE key='vapid_public_key' AND length(value)>0) AND
        EXISTS (SELECT 1 FROM public.system_settings WHERE key='vapid_private_key' AND length(value)>0) AS "pushKeys",
        EXISTS (SELECT 1 FROM public.system_settings WHERE key='drip_campaigns_enabled' AND value='true') AS "campaignsEnabled"`);
      const columns = await client.query(`SELECT column_name AS name, data_type AS type, is_nullable AS nullable, column_default AS "default"
        FROM information_schema.columns WHERE table_schema='public' AND table_name='cloudflare_jobs' ORDER BY ordinal_position LIMIT 32`);
      const constraints = await client.query(`SELECT contype AS type, pg_get_constraintdef(oid) AS definition, convalidated AS validated
        FROM pg_constraint WHERE conrelid=to_regclass('public.cloudflare_jobs') ORDER BY contype, conname LIMIT 16`);
      const indexes = await client.query(`SELECT pg_get_indexdef(indexrelid) AS definition, indisvalid AS valid, indisready AS ready
        FROM pg_index WHERE indrelid=to_regclass('public.cloudflare_jobs') ORDER BY indexrelid LIMIT 16`);
      const leaders = await client.query(`SELECT count(*)::int AS count FROM pg_locks
        WHERE locktype='advisory' AND classid=1296126535 AND objid=1 AND objsubid=2 AND granted
        AND database=(SELECT oid FROM pg_database WHERE datname=current_database())`);
      const queue = state.rows[0]?.queueTable === true
        ? await client.query(`SELECT status, count(*)::int AS count FROM public.cloudflare_jobs GROUP BY status ORDER BY status LIMIT 8`)
        : { rows: [] };
      return { queueTable: state.rows[0]?.queueTable === true, queueSchema: { columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows }, pushKeys: state.rows[0]?.pushKeys === true,
        schedulerLeaders: leaders.rows[0]?.count ?? null, queueCounts: queue.rows,
        campaignsEnabled: state.rows[0]?.campaignsEnabled === true };
    });
  }

  async login(email: string, password: string, signingSecret: string) {
    if (signingSecret.length < 32) throw new Error('NOT_CONFIGURED');
    const row = await this.transaction(async (client) => {
      const result = await client.query(`SELECT id, email, password,
        first_name AS "firstName", last_name AS "lastName",
        subscription_plan AS "subscriptionPlan", subscription_status AS "subscriptionStatus"
        FROM public.users WHERE email = $1 LIMIT 1`, [email]);
      return result.rows[0];
    });
    // Fixed bcrypt workload for unknown accounts; never reveal account existence.
    const fallback = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const hash = typeof row?.password === 'string' ? row.password : fallback;
    const valid = await compare(password, hash);
    if (!row?.password || !valid) throw new Error('INVALID_CREDENTIALS');
    const token = await new SignJWT({ userId: row.id, email: row.email })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d')
      .sign(new TextEncoder().encode(signingSecret));
    return { token, user: { id: row.id, email: row.email, firstName: row.firstName,
      lastName: row.lastName, subscriptionPlan: row.subscriptionPlan, subscriptionStatus: row.subscriptionStatus } };
  }

  profile(session: RunnerSession) {
    return this.read(session, async (client) => {
      const result = await client.query(`SELECT id, email, first_name AS "firstName",
        last_name AS "lastName", unit_preference AS "unitPreference",
        strava_connected AS "stravaConnected", subscription_plan AS "subscriptionPlan",
        subscription_status AS "subscriptionStatus", trial_ends_at AS "trialEndsAt"
        FROM public.users WHERE id = $1 LIMIT 1`, [session.userId]);
      return result.rows[0] ?? null;
    });
  }

  activities(session: RunnerSession, limit = 20, beforeId?: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
        (beforeId !== undefined && (!Number.isSafeInteger(beforeId) || beforeId < 1))) {
      throw new Error('INVALID_PAGINATION');
    }
    return this.read(session, async (client) => {
      const result = await client.query(`SELECT id, name, distance,
        moving_time AS "movingTime", start_date AS "startDate", type,
        total_elevation_gain AS "totalElevationGain", average_speed AS "averageSpeed"
        FROM public.activities WHERE user_id = $1 AND ($2::integer IS NULL OR id < $2)
        ORDER BY id DESC LIMIT $3`, [session.userId, beforeId ?? null, limit + 1]);
      const items = result.rows.slice(0, limit);
      return { items, nextBeforeId: result.rows.length > limit ? items.at(-1)?.id : null };
    });
  }

  activity(session: RunnerSession, activityId: number) {
    if (!Number.isSafeInteger(activityId) || activityId < 1) throw new Error('INVALID_ACTIVITY_ID');
    return this.read(session, async (client) => {
      const result = await client.query(`SELECT id, name, distance,
        moving_time AS "movingTime", start_date AS "startDate", type,
        total_elevation_gain AS "totalElevationGain", average_speed AS "averageSpeed",
        average_heartrate AS "averageHeartrate", max_heartrate AS "maxHeartrate"
        FROM public.activities WHERE user_id = $1 AND id = $2 LIMIT 1`, [session.userId, activityId]);
      return result.rows[0] ?? null;
    });
  }
}
