import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {eq} from 'drizzle-orm';
import {createD1Database,type DatabaseCommand,type DatabaseResult} from '../../server/d1/database';
import {users,goals} from '../../shared/schema.d1';

test('D1 application ORM preserves typed account data and rolls back batches',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  try{
    sqlite.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
    const execute=async(c:DatabaseCommand):Promise<DatabaseResult>=>{
      const statement=sqlite.prepare(c.sql);statement.setReturnArrays(true);
      if(c.method==='run'){statement.run(...c.params);return {rows:[]};}
      const rows=statement.all(...c.params);
      return {rows:c.method==='get'?(rows[0]??[]):rows};
    };
    const db=createD1Database({execute,async batch(commands){sqlite.exec('BEGIN');try{
      const results=[];for(const c of commands)results.push(await execute(c));sqlite.exec('COMMIT');return results;
    }catch(e){sqlite.exec('ROLLBACK');throw e;}}});
    const [runner]=await db.insert(users).values({email:'orm@example.test',marketingOptOut:true}).returning();
    assert.equal(runner.email,'orm@example.test');
    assert.equal(runner.marketingOptOut,true);
    assert.ok(runner.createdAt instanceof Date);
    const result=await db.select().from(users).where(eq(users.id,runner.id));
    assert.equal(result.length,1);
    await assert.rejects(db.batch([
      db.update(users).set({firstName:'Must roll back'}).where(eq(users.id,runner.id)),
      db.insert(users).values({id:runner.id}),
    ]));
    assert.equal((await db.select().from(users).where(eq(users.id,runner.id)))[0].firstName,null);
    assert.deepEqual(await db.select().from(goals),[]);
  }finally{sqlite.close();}
});
