import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMigrationStaging, mayInitializeSchema, ownsScheduledJobs } from './runtime';

test('Cloudflare job ownership and schema initialization fail closed', () => {
  const previous = { ...process.env };
  try {
    delete process.env.APP_PLATFORM;
    assert.equal(ownsScheduledJobs(), true);
    assert.equal(mayInitializeSchema(), true);
    process.env.APP_PLATFORM = 'cloudflare';
    delete process.env.APP_ENV;
    process.env.APP_ROLE = 'jobs';
    assert.equal(isMigrationStaging(), true);
    assert.equal(ownsScheduledJobs(), false);
    assert.equal(mayInitializeSchema(), false);
    process.env.APP_ENV = 'staging';
    assert.equal(ownsScheduledJobs(), false);
    process.env.APP_ENV = 'production';
    process.env.APP_ROLE = 'web';
    assert.equal(ownsScheduledJobs(), false);
    process.env.APP_ROLE = 'jobs';
    assert.equal(ownsScheduledJobs(), true);
  } finally {
    for (const key of ['APP_PLATFORM', 'APP_ENV', 'APP_ROLE']) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
