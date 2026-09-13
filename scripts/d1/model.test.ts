import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema.d1';

test('generated SQLite model preserves dates, booleans, JSON, arrays and generated IDs', async()=>{
  const sqlite=new DatabaseSync(':memory:');
  try {
    sqlite.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
    const db=drizzle(async(sql,params,method)=>{
      const statement=sqlite.prepare(sql);
      if(method==='run'){statement.run(...params);return {rows:[]};}
      statement.setReturnArrays(true);
      if(method==='get')return {rows:statement.get(...params) as unknown as any[]};
      return {rows:statement.all(...params)};
    });
    const when=new Date('2026-09-13T12:34:56.789Z');
    const [inserted]=await db.insert(users).values({email:'fixture@example.invalid',stravaConnected:true,
      lastSyncAt:when,coachDaysAvailable:['monday','friday'],coachWeatherLocation:{latitude:40,longitude:-74}
    }).returning({id:users.id});
    assert.ok(inserted.id>0);
    const found=await db.select().from(users).where(eq(users.id,inserted.id)).get();
    assert.equal(found?.stravaConnected,true);
    assert.equal(found?.isAdmin,false);
    assert.equal(found?.lastSyncAt?.toISOString(),when.toISOString());
    assert.deepEqual(found?.coachDaysAvailable,['monday','friday']);
    assert.deepEqual(found?.coachWeatherLocation,{latitude:40,longitude:-74});
    await db.update(users).set({stravaConnected:false,lastSyncAt:null,coachDaysAvailable:[]}).where(eq(users.id,inserted.id));
    const changed=await db.select().from(users).where(eq(users.id,inserted.id)).get();
    assert.equal(changed?.stravaConnected,false);
    assert.equal(changed?.lastSyncAt,null);
    assert.deepEqual(changed?.coachDaysAvailable,[]);
  } finally {sqlite.close();}
});
