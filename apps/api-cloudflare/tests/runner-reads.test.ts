import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { SignJWT } from 'jose';
import { hash } from 'bcryptjs';
import { RunnerReads } from '../src/runner-reads';
import { verifyRunnerSession } from '../src/session';

async function session() {
  const secret = 'test-only-runner-read-secret-123456789';
  const token = await new SignJWT({ userId: 42, email: 'test@example.test' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
  return verifyRunnerSession(token, secret);
}

function fixture(rows: Record<string, unknown>[] = [], fail = false) {
  const client = new Client();
  mock.method(client, 'connect', async () => {});
  const close = mock.method(client, 'end', async () => {});
  const queries: { sql: string; params: unknown[] }[] = [];
  mock.method(client, 'query', async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    if (fail && sql.startsWith('SELECT')) throw new Error('private database detail');
    return { rows, rowCount: rows.length };
  });
  const store = new RunnerReads({ connectionString: 'unused-in-tests' }, () => client);
  return { store, queries, close };
}

test('scheduler diagnostics require current admin ownership and only issue bounded reads', async () => {
  const denied = fixture([{ is_admin: false }]);
  await assert.rejects(denied.store.migrationReadiness(await session()), /FORBIDDEN/);
  assert.equal(denied.queries.filter(q => q.sql.startsWith('SELECT')).length, 1);
  assert.deepEqual(denied.queries.find(q => q.sql.startsWith('SELECT'))!.params, [42]);
  const allowed = fixture([{ is_admin: true, queueTable: true, count: 1 }]);
  const state = await allowed.store.migrationReadiness(await session());
  assert.equal(state.schedulerLeaders, 1);
  assert.ok(allowed.queries.some(q => /FROM pg_locks/.test(q.sql) && /classid=1296126535 AND objid=1/.test(q.sql)));
  assert.ok(allowed.queries.some(q => /GROUP BY status ORDER BY status LIMIT 8/.test(q.sql)));
  assert.ok(allowed.queries.every(q => /^(SELECT|BEGIN READ ONLY|SET LOCAL|ROLLBACK)/.test(q.sql)));
  assert.equal(allowed.close.mock.callCount(), 1);
});

test('profile query selects an explicit safe projection and verified identity', async () => {
  const f = fixture([{ id: 42 }]);
  assert.deepEqual(await f.store.profile(await session()), { id: 42 });
  assert.equal(f.queries[0].sql, 'BEGIN READ ONLY');
  const query = f.queries.find(q => q.sql.startsWith('SELECT'))!;
  assert.deepEqual(query.params, [42]);
  assert.doesNotMatch(query.sql, /SELECT\s+\*|password|strava_access_token|reset_token|stripe_customer_id/i);
  assert.equal(f.close.mock.callCount(), 1);
});

test('activity detail scopes the lookup by owner, with no existence leak', async () => {
  const f = fixture();
  assert.equal(await f.store.activity(await session(), 999), null);
  assert.match(f.queries.find(q => q.sql.startsWith('SELECT'))!.sql, /WHERE user_id = \$1 AND id = \$2/);
  assert.deepEqual(f.queries.find(q => q.sql.startsWith('SELECT'))!.params, [42, 999]);
});

test('pagination is bounded, deterministic, and fetches one lookahead row', async () => {
  const f = fixture([{ id: 9 }, { id: 8 }, { id: 7 }]);
  assert.deepEqual(await f.store.activities(await session(), 2, 10), {
    items: [{ id: 9 }, { id: 8 }], nextBeforeId: 8,
  });
  assert.deepEqual(f.queries.find(q => q.sql.startsWith('SELECT'))!.params, [42, 10, 3]);
  const runner = await session();
  for (const limit of [0, -1, 51, 1.5, NaN]) {
    assert.throws(() => f.store.activities(runner, limit), /INVALID_PAGINATION/);
  }
});

test('failed queries still close the connection', async () => {
  const f = fixture([], true);
  await assert.rejects(f.store.profile(await session()));
  assert.equal(f.queries.at(-1)!.sql, 'ROLLBACK');
  assert.equal(f.close.mock.callCount(), 1);
});

test('password login preserves bcrypt hashes without returning credentials', async () => {
  const password = await hash('correct-test-password', 10);
  const f = fixture([{ id: 42, email: 'test@example.test', password }]);
  const secret = 'isolated-staging-secret-for-tests-only-123';
  const response = await f.store.login('test@example.test', 'correct-test-password', secret);
  assert.equal((await verifyRunnerSession(response.token, secret)).userId, 42);
  assert.ok(!JSON.stringify(response).includes(password));
  assert.deepEqual(f.queries.find(q => q.sql.startsWith('SELECT'))!.params, ['test@example.test']);
  await assert.rejects(f.store.login('test@example.test', 'wrong-password', secret), /INVALID_CREDENTIALS/);
});

test('Strava-only and missing accounts share a generic login failure', async () => {
  for (const rows of [[], [{ id: 42, email: 'test@example.test', password: null }]]) {
    const f = fixture(rows);
    await assert.rejects(f.store.login('test@example.test', 'wrong-password', 'isolated-staging-secret-for-tests-only-123'), /INVALID_CREDENTIALS/);
  }
});
