import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

test('eligible checkout sessions receive seven days, not an automatic signup trial', () => {
  const routes = readFileSync('server/routes.ts', 'utf8');
  assert.match(routes, /trialEligible \? \{ trial_period_days: 7 \} : \{\}/);
  assert.doesNotMatch(routes, /trial_period_days:\s*14/);
});

test('active trial marketing no longer advertises fourteen days', () => {
  function check(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
        assert.doesNotMatch(readFileSync(path, 'utf8'), /(?<![\d-])14[ -]days?/i, path);
      }
    }
  }
  for (const directory of ['client/src', 'server/ssr', 'server/services', 'shared']) check(directory);
});
