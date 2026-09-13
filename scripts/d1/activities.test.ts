import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1Activities, type SqlDatabase, type SqlStatement } from '../../server/d1/activities';

function setup(){
  const db=new DatabaseSync(':memory:');
  for(const file of ['0001_application.sql','0002_migration_support.sql','0004_activity_size_guard.sql','0005_activity_import_headroom.sql'])db.exec(readFileSync(`apps/d1-migration/migrations/${file}`,'utf8'));
  db.exec("INSERT INTO users(id) VALUES(1),(2); INSERT INTO migration_activity_exclusions(activity_id,user_id,strava_id,payload_bytes) VALUES(33,1,'999',2100000)");
  const insert=db.prepare("INSERT INTO activities(id,user_id,strava_id,name,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date) VALUES(?,?,?,'run',1000,300,0,3,4,'2026-01-01T00:00:00.000Z')");
  insert.run(1,1,'11');insert.run(2,1,'12');insert.run(3,2,'13');
  const adapter:SqlDatabase={prepare(sql){
    let values:(string|number|null)[]=[];
    const statement:SqlStatement={bind(...v){values=v;return statement;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
    return statement;
  }};
  return {db,repo:new D1Activities(adapter)};
}

test('runner-scoped reads and writes do not cross account boundaries',async()=>{
  const {db,repo}=setup();
  assert.equal(await repo.get(1,3),null);
  assert.equal(await repo.getStreams(1,3),null);
  assert.equal(await repo.updateStreams(1,3,'{}',null),false);
  assert.equal(await repo.isExcluded(1,'999'),true);
  assert.equal(await repo.isExcluded(2,'999'),false);
  assert.equal(await repo.updateStreams(1,1,'{"hr":[130]}',null),true);
  assert.equal((await repo.getStreams(1,1))?.streams_data,'{"hr":[130]}');
  db.close();
});
test('stable cursor pagination handles identical timestamps without duplicates',async()=>{
  const {db,repo}=setup(),options={from:'2026-01-01',to:'2026-02-01',limit:1};
  const first=await repo.list(1,options);
  assert.deepEqual(first.items.map(a=>a.id),[2]);
  const second=await repo.list(1,{...options,cursor:first.nextCursor!});
  assert.deepEqual(second.items.map(a=>a.id),[1]);assert.equal(second.nextCursor,null);
  await assert.rejects(repo.list(1,{...options,limit:1000}),/PAGE_SIZE_LIMIT/);
  await assert.rejects(repo.list(1,{...options,to:'2030-01-01'}),/DATE_RANGE_LIMIT/);
  db.close();
});
