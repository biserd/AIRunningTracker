import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { DurableJobStore, type JobSqlPool } from '../../../server/services/queue/durableJobStore';
import type { Job } from '../../../server/services/queue/jobTypes';

test('durable jobs survive restarts, fence stale owners, commit children and enforce user scoping', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE users(id integer PRIMARY KEY,sync_status text,sync_progress integer,sync_total integer,sync_error text);
      INSERT INTO users(id) VALUES (1),(2);`);
    await db.exec(await readFile(new URL('../../../migrations/20260913_cloudflare_jobs.sql', import.meta.url), 'utf8'));
    const pool: JobSqlPool = {
      query: <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => db.query<T>(sql, values),
      async connect() { return { query: pool.query, release() {} }; },
    };
    let store = new DurableJobStore(pool);
    const job: Job = { id: 'original', userId: 1, type: 'LIST_ACTIVITIES', data: { page: 1, perPage: 20, maxActivities: 20 },
      priority: 1, createdAt: new Date(), scheduledAt: new Date(), attempts: 0, maxAttempts: 3, status: 'pending' };
    await store.enqueue(job);
    await store.enqueue(job);
    assert.equal((await store.stats()).pending, 1);
    store = new DurableJobStore(pool); // simulated process restart: no memory survives
    const first = await store.claim('old-process');
    assert.equal(first?.attempts, 1);
    assert.equal(await store.claim('other-process'), null);
    assert.equal(await store.heartbeat(job.id, 'wrong-owner'), false);
    await db.exec(`UPDATE cloudflare_jobs SET lease_until=now()-interval '1 second'`);
    const recovered = await store.claim('new-process');
    assert.equal(recovered?.attempts, 2);
    assert.ok(recovered);
    const child: Job = { ...job, id: 'child', userId: 1, type: 'FINALIZE_SYNC', data: {} };
    await assert.rejects(store.complete(recovered, 'old-process', [child]), /JOB_LEASE_LOST/);
    assert.equal((await store.stats()).pending, 0);
    await store.complete(recovered, 'new-process', [child], { processedCount: 7, activitiesCount: 10 });
    assert.equal((await store.stats()).pending, 1);
    assert.equal((await store.stats()).completed, 1);
    assert.deepEqual((await db.query('SELECT sync_progress,sync_total FROM users WHERE id=1')).rows[0], { sync_progress: 7, sync_total: 10 });
    assert.equal((await store.jobsForUser(2)).pending.length, 0);
    assert.equal((await store.jobsForUser(1)).pending[0].id, 'child');
    const final = await store.claim('new-process');
    assert.ok(final);
    await store.fail(final, 'old-process', null);
    assert.equal((await store.stats()).processing, 1);
    await store.fail(final, 'new-process', new Date(Date.now()+60_000));
    assert.equal((await store.stats()).delayed, 1);
    assert.equal(await store.claim('next-process'), null);
    await db.exec(`UPDATE cloudflare_jobs SET scheduled_at=now()-interval '1 second' WHERE id='child'`);
    const retried = await store.claim('next-process');
    assert.ok(retried);
    await store.fail(retried, 'next-process', null);
    assert.equal((await store.stats()).failed, 1);
    await db.exec('DELETE FROM users WHERE id=1');
    assert.equal((await store.stats()).failed, 0);
  } finally { await db.close(); }
});
