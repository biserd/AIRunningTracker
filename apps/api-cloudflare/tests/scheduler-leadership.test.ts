import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runAsSchedulerLeader } from '../../../server/services/schedulerLeadership';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('scheduler standby retries without starting timers until ownership is acquired', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  let acquired = false, starts = 0, releases = 0;
  const client = Object.assign(new EventEmitter(), {
    query: async () => ({ rows: [{ acquired }] }), release: () => { releases++; },
  });
  runAsSchedulerLeader({ connect: async () => client } as any, async () => { starts++; });
  await flush();
  assert.equal(starts, 0); assert.equal(releases, 1);
  acquired = true; t.mock.timers.tick(15_000); await flush();
  assert.equal(starts, 1);
  t.mock.timers.tick(15_000); await flush();
  assert.equal(starts, 1);
});

test('scheduler fails closed on connection loss and hung leadership heartbeat', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const exit = t.mock.method(process, 'exit', (() => undefined) as any);
  const client = Object.assign(new EventEmitter(), {
    query: async (sql: string) => sql.includes('pg_try_advisory_lock')
      ? { rows: [{ acquired: true }] } : await new Promise(() => {}),
    release: () => {},
  });
  runAsSchedulerLeader({ connect: async () => client } as any, async () => {});
  await flush();
  client.emit('end'); assert.equal(exit.mock.calls[0].arguments[0], 1);
  t.mock.timers.tick(50_000); await flush();
  assert.ok(exit.mock.callCount() >= 2);
});

test('scheduler does not remain running after startup failure', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const exit = t.mock.method(process, 'exit', (() => undefined) as any);
  const client = Object.assign(new EventEmitter(), {
    query: async () => ({ rows: [{ acquired: true }] }), release: () => {},
  });
  runAsSchedulerLeader({ connect: async () => client } as any, async () => { throw new Error('startup failed'); });
  await flush();
  assert.equal(exit.mock.calls[0].arguments[0], 1);
});
