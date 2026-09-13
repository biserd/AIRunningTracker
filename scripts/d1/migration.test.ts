import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { buildApplicationSchema, encodeValue, insertStatement, type ColumnSpec } from './schema';
import { assertActivityFits, validateExclusions, transformActivityReferences } from '../../server/d1/activityPolicy';
import { bulkStatement } from './bulk';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
  db.exec(readFileSync('apps/d1-migration/migrations/0002_migration_support.sql','utf8'));
  db.exec(readFileSync('apps/d1-migration/migrations/0004_activity_size_guard.sql','utf8'));
  db.exec(readFileSync('apps/d1-migration/migrations/0005_activity_import_headroom.sql','utf8'));
  return db;
}

test('all application and migration schemas compile in SQLite', () => {
  const db = database();
  assert.equal(buildApplicationSchema().length,45);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get()?.n,49);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  db.close();
});

test('excluded Strava IDs cannot be reimported using a new local ID', () => {
  const db = database();
  db.exec("INSERT INTO users(id) VALUES(1); INSERT INTO migration_activity_exclusions(activity_id,user_id,strava_id,payload_bytes) VALUES(33,1,'123',2100000)");
  const insert = db.prepare("INSERT INTO activities(id,user_id,strava_id,name,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date) VALUES(?,1,?,'test',1,1,1,1,1,'2026-01-01T00:00:00.000Z')");
  assert.throws(() => insert.run(34,'123'), /ACTIVITY_EXCLUDED_FROM_D1/);
  assert.throws(() => insert.run(33,'999'), /ACTIVITY_EXCLUDED_FROM_D1/);
  insert.run(35,'124');
  assert.throws(() => db.exec("UPDATE activities SET strava_id='123' WHERE id=35"), /ACTIVITY_EXCLUDED_FROM_D1/);
  db.close();
});

test('partial unique indexes protect active Telegram identity ownership', () => {
  const db = database();
  db.exec('INSERT INTO users(id) VALUES(1),(2)');
  const statement = db.prepare("INSERT INTO coach_channel_bindings(id,binding_id,user_id,channel,provider_user_hash,provider_chat_hash) VALUES(?, ?,?,'telegram','same-user','same-chat')");
  statement.run(1,'one',1);
  assert.throws(() => statement.run(2,'two',2),/UNIQUE/);
  db.close();
});

test('timestamps, arrays, booleans and nulls keep distinct meanings', () => {
  const col = (kind: ColumnSpec['kind']): ColumnSpec => ({name:'value',kind,nullable:true});
  assert.equal(encodeValue(col('timestamp'),new Date('2026-01-01T00:00:00Z')),'2026-01-01T00:00:00.000Z');
  assert.equal(encodeValue(col('array'),[]),'[]');
  assert.equal(encodeValue(col('array'),null),null);
  assert.equal(encodeValue(col('boolean'),false),0);
  assert.throws(() => encodeValue(col('integer'),Number.MAX_SAFE_INTEGER+1),/UNSAFE_INTEGER/);
  assert.throws(() => encodeValue(col('timestamp'),'2026-01-01'),/INVALID_TIMESTAMP/);
});

test('parameter budget applies to complete multi-row inserts', () => {
  const table = buildApplicationSchema().find(t => t.name === 'users')!;
  assert.throws(() => insertStatement(table,[{},{}]),/D1_BIND_LIMIT/);
});

test('JSON bulk transport preserves null, booleans, JSON strings and quoting', () => {
  const db=database();
  const table=buildApplicationSchema().find(t=>t.name==='users')!;
  const columns=table.columns.filter(c=>['id','email','marketing_opt_out','premium_preview'].includes(c.name));
  const row={id:1,email:"quoted'@example.test",marketing_opt_out:0,premium_preview:'{"x":[1,null]}'};
  const statement=bulkStatement({...table,columns},[row]);
  db.prepare(statement.sql).run(...statement.params!);
  assert.deepEqual({...db.prepare('SELECT id,email,marketing_opt_out,premium_preview FROM users').get()},row);
  db.close();
});

test('database rejects oversized hydration updates without losing original activity',()=>{
  const db=database();
  db.exec("INSERT INTO activities(id,user_id,strava_id,name,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date) VALUES(1,1,'1','test',1,1,1,1,1,'2026-01-01T00:00:00.000Z')");
  assert.throws(()=>db.prepare('UPDATE activities SET streams_data=? WHERE id=1').run('x'.repeat(2000000)),/D1_ACTIVITY_TOO_LARGE/);
  assert.equal(db.prepare('SELECT streams_data FROM activities WHERE id=1').get()?.streams_data,null);
  db.close();
});

test('unexpected exclusions fail closed and UTF-8 bytes count, not characters', () => {
  assert.throws(() => validateExclusions([]),/EXCLUSION_COUNT_CHANGED/);
  assert.throws(() => assertActivityFits({streams_data:'🏃'.repeat(500000)}),/D1_ACTIVITY_TOO_LARGE/);
  assertActivityFits({streams_data:'ok',id:1});
});

test('detach plan references without erasing completed training history', () => {
  const original = {linked_activity_id:33,status:'completed',actual_distance_km:20};
  const result = transformActivityReferences('plan_days',original,new Set([33]),new Set([1]));
  assert.deepEqual(result.row,{...original,linked_activity_id:null});
  assert.equal(original.linked_activity_id,33);
  assert.equal(transformActivityReferences('activities',{id:33},new Set([33]),new Set()).row,null);
  assert.equal(transformActivityReferences('activity_features',{activity_id:33},new Set([33]),new Set()).row,null);
});
