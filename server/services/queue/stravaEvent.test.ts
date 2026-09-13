import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStravaEvent, stravaEventJobId } from './stravaEvent';

test('webhook events require the configured subscription and stable deduplication', () => {
  const event = {object_type:'activity',aspect_type:'create',object_id:100,owner_id:200,subscription_id:300,event_time:12345};
  assert.equal(parseStravaEvent(event,undefined),null);
  assert.equal(parseStravaEvent(event,'301'),null);
  assert.equal(parseStravaEvent({...event,owner_id:'200'},'300'),null);
  const parsed = parseStravaEvent({...event,updates:{token:'never persist'},userId:1},'300');
  assert.ok(parsed);
  assert.equal(parsed.updates,undefined);
  assert.equal(stravaEventJobId(parsed),stravaEventJobId({...parsed}));
  assert.notEqual(stravaEventJobId(parsed),stravaEventJobId({...parsed,owner_id:201}));
});
