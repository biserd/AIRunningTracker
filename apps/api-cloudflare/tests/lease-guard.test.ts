import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardJobLease } from '../../../server/services/queue/leaseGuard';

test('lease loss and renewal failure stop the worker exactly once', async () => {
  for (const renew of [async () => false, async () => { throw new Error('private database detail'); }]) {
    let exits = 0;
    const guard = guardJobLease(renew, () => { exits++; });
    try { await guard.check(); await guard.check(); assert.equal(exits, 1); }
    finally { guard.stop(); }
  }
});

test('completion prevents an in-flight heartbeat from terminating a healthy worker', async () => {
  let resolve!: (value: boolean) => void;
  let calls = 0;
  let exits = 0;
  const guard = guardJobLease(() => { calls++; return new Promise<boolean>(done => { resolve = done; }); }, () => { exits++; });
  const pending = guard.check();
  await guard.check();
  assert.equal(calls, 1);
  guard.stop(); resolve(false); await pending;
  assert.equal(exits, 0);
});
