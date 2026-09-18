import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('Apple association only opens coach email sign-in in the production app', () => {
  const association = JSON.parse(readFileSync(new URL('../public/.well-known/apple-app-site-association', import.meta.url), 'utf8'));
  assert.deepEqual(association.applinks.details, [{
    appIDs: ['DB5JRGGB6A.run.aitracker.coach'],
    components: [{'/': '/auth/magic-link', comment: 'Email sign-in only'}],
  }]);
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /Content-Type: application\/json/);
});
