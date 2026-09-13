import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {quarantineDDL} from './quarantine-policy';
import {buildApplicationSchema} from './schema';

test('quarantine preserves exact stored fields and rolls back removal if archival fails',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    const table=buildApplicationSchema().find(t=>t.name==='activities')!;
    db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1)');
    db.exec(table.ddl);
    for(const sql of quarantineDDL(table))db.exec(sql);
    const add=db.prepare("INSERT INTO activities(id,user_id,strava_id,name,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date,streams_data) VALUES(?,?,?,'fixture',1000,300,0,3,4,'2026-01-01T00:00:00.000Z',?)");
    add.run(1,999,'11','{"text":"🏃\\\"","x":null}');add.run(2,1,'12',null);
    const original=db.prepare('SELECT * FROM activities WHERE id=1').get();
    db.exec('DELETE FROM activities WHERE user_id NOT IN (SELECT id FROM users)');
    assert.deepEqual(db.prepare('SELECT * FROM migration_quarantine_activities WHERE id=1').get(),original);
    assert.equal(db.prepare('SELECT count(*) n FROM activities').get()?.n,1);
    add.run(1,999,'11','{}');
    assert.throws(()=>db.exec('DELETE FROM activities WHERE id=1'),/UNIQUE/);
    assert.equal(db.prepare('SELECT count(*) n FROM activities WHERE id=1').get()?.n,1);
  }finally{db.close();}
});
