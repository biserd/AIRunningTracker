import type { Job } from './jobTypes';
import type { JobStore } from './jobStore';

export interface JobSqlClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}
export interface JobSqlPool extends JobSqlClient {
  connect(): Promise<JobSqlClient & { release(): void }>;
}

type Row = { id: string; user_id: number; type: Job['type']; data: Job['data']; priority: number;
  created_at: Date; scheduled_at: Date; attempts: number; max_attempts: number; status: Job['status']; error_code?: string };
const fromRow = (r: Row): Job => ({ id: r.id, userId: r.user_id, type: r.type, data: r.data,
  priority: r.priority, createdAt: new Date(r.created_at), scheduledAt: new Date(r.scheduled_at),
  attempts: r.attempts, maxAttempts: r.max_attempts, status: r.status, error: r.error_code } as Job);

/** Postgres is the durable source of truth. No provider responses or credentials are stored. */
export class DurableJobStore implements JobStore {
  constructor(private readonly pool: JobSqlPool) {}

  private async insert(client: JobSqlClient, job: Job) {
    const inserted = await client.query(`INSERT INTO cloudflare_jobs
      (id,user_id,type,data,priority,created_at,scheduled_at,max_attempts)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [job.id, job.userId, job.type, JSON.stringify(job.data), job.priority, job.createdAt, job.scheduledAt, job.maxAttempts]);
    return inserted.rows.length === 1;
  }

  async enqueue(job: Job) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await this.insert(client, job);
      if (inserted && job.type === 'LIST_ACTIVITIES' && job.data.page === 1) {
        await client.query(`UPDATE users SET sync_status='running',sync_progress=0,sync_total=0,sync_error=NULL WHERE id=$1`, [job.userId]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async claim(owner: string): Promise<Job | null> {
    const result = await this.pool.query<Row>(`WITH candidate AS (
      SELECT id FROM cloudflare_jobs WHERE
      (status='pending' AND scheduled_at<=now()) OR (status='processing' AND lease_until<now())
      ORDER BY priority,scheduled_at,id FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE cloudflare_jobs j SET status='processing',attempts=j.attempts+1,
      lease_owner=$1,lease_until=now()+interval '5 minutes'
      FROM candidate c WHERE j.id=c.id RETURNING j.*`, [owner]);
    return result.rows[0] ? fromRow(result.rows[0]) : null;
  }

  async heartbeat(id: string, owner: string): Promise<boolean> {
    const result = await this.pool.query(`UPDATE cloudflare_jobs SET lease_until=now()+interval '5 minutes'
      WHERE id=$1 AND status='processing' AND lease_owner=$2 AND lease_until>now() RETURNING id`, [id, owner]);
    return result.rows.length === 1;
  }

  async complete(job: Job, owner: string, children: Job[], progress?: { processedCount: number; activitiesCount: number }) {
    if (children.some(child => child.userId !== job.userId)) throw new Error('JOB_OWNER_MISMATCH');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const claim = await client.query(`UPDATE cloudflare_jobs SET status='completed',finished_at=now(),lease_owner=NULL,lease_until=NULL
        WHERE id=$1 AND lease_owner=$2 AND status='processing' AND lease_until>now() RETURNING id`, [job.id, owner]);
      if (!claim.rows.length) throw new Error('JOB_LEASE_LOST');
      for (const child of children) await this.insert(client, child);
      if (job.type === 'LIST_ACTIVITIES' && progress) {
        await client.query(`UPDATE users SET sync_progress=COALESCE(sync_progress,0)+$2,
          sync_total=COALESCE(sync_total,0)+$3 WHERE id=$1`, [job.userId, progress.processedCount, progress.activitiesCount]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async fail(job: Job, owner: string, retryAt: Date | null) {
    // Never store provider error text: it can contain URLs, tokens or runner details.
    const result = await this.pool.query(`UPDATE cloudflare_jobs SET status=$3,scheduled_at=COALESCE($4,scheduled_at),
      error_code='JOB_EXECUTION_FAILED',lease_owner=NULL,lease_until=NULL,finished_at=CASE WHEN $3='failed' THEN now() ELSE NULL END
      WHERE id=$1 AND lease_owner=$2 AND status='processing' AND lease_until>now() RETURNING id`,
      [job.id, owner, retryAt ? 'pending' : 'failed', retryAt]);
    return result.rows.length === 1;
  }

  async hasPending(userId: number, exceptId: string) {
    const result = await this.pool.query(`SELECT 1 FROM cloudflare_jobs WHERE user_id=$1 AND id<>$2
      AND type<>'FINALIZE_SYNC' AND status IN ('pending','processing') LIMIT 1`, [userId, exceptId]);
    return result.rows.length > 0;
  }

  async jobsForUser(userId: number) {
    const result = await this.pool.query<Row>(`SELECT * FROM (
      SELECT *,row_number() OVER (PARTITION BY status ORDER BY created_at DESC) AS position
      FROM cloudflare_jobs WHERE user_id=$1
    ) jobs WHERE position<=200 ORDER BY created_at DESC`, [userId]);
    const jobs = result.rows.map(fromRow);
    return { pending: jobs.filter(j => j.status === 'pending'), processing: jobs.filter(j => j.status === 'processing'),
      completed: jobs.filter(j => j.status === 'completed').slice(0,20), failed: jobs.filter(j => j.status === 'failed').slice(0,10) };
  }

  async stats() {
    const result = await this.pool.query(`SELECT
      count(*) FILTER (WHERE status='pending' AND scheduled_at<=now())::int AS pending,
      count(*) FILTER (WHERE status='pending' AND scheduled_at>now())::int AS delayed,
      count(*) FILTER (WHERE status='processing')::int AS processing,
      count(*) FILTER (WHERE status='completed')::int AS completed,
      count(*) FILTER (WHERE status='failed')::int AS failed FROM cloudflare_jobs`);
    return result.rows[0] as { pending:number; delayed:number; processing:number; completed:number; failed:number };
  }
}
