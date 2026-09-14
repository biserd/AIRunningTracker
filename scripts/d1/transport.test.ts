import {test} from 'node:test';
import assert from 'node:assert/strict';
import {privateDatabaseHandler,privateDatabaseTransport} from '../../server/d1/transport';

test('private database transport authenticates, preserves batches and never leaks query errors',async()=>{
  const secret='test-secret-for-private-database-123456789';let calls=0;
  const handler=privateDatabaseHandler({async execute(){calls++;return {rows:[[1]]};},async batch(commands){calls++;return commands.map(()=>({rows:[[2]]}));}},secret);
  const send:typeof fetch=async(input,init)=>handler(new Request(input,init));
  const client=privateDatabaseTransport(secret,send);
  assert.deepEqual(await client.execute({sql:'SELECT 1',params:[],method:'all'}),{rows:[[1]]});
  assert.equal((await client.batch([{sql:'SELECT 2',params:[],method:'all'},{sql:'SELECT 2',params:[],method:'all'}])).length,2);
  assert.equal(calls,2);
  const unauthorized=await handler(new Request('http://aitracker.database.internal/query',{method:'POST',body:'[]'}));
  assert.equal(unauthorized.status,401);assert.equal(calls,2);
  const failing=privateDatabaseHandler({async execute(){throw new Error('PRIVATE_RUNNER_DATA');},async batch(){throw new Error('PRIVATE_RUNNER_DATA');}},secret);
  const response=await failing(new Request('http://aitracker.database.internal/query',{method:'POST',headers:{authorization:secret},body:JSON.stringify([{sql:'SELECT 1',params:[],method:'all'}])}));
  assert.equal(response.status,503);assert.equal((await response.text()).includes('PRIVATE_RUNNER_DATA'),false);
});

test('private database client does not retry an uncertain write',async()=>{
  let attempts=0;
  const client=privateDatabaseTransport('test-secret-for-private-database-123456789',async()=>{attempts++;throw new Error('connection closed');});
  await assert.rejects(client.execute({sql:'INSERT INTO test VALUES(?)',params:[1],method:'run'}));
  assert.equal(attempts,1);
});
