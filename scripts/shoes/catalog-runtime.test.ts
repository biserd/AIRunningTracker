import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from '../../apps/api-cloudflare/node_modules/miniflare/dist/src/index.js';
import { catalogStatements, type Catalog } from './catalog';

test('D1 runtime performs nullable migration and idempotent catalog import with foreign keys',async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,compatibilityDate:'2026-09-12',script:'export default {fetch(){return new Response("ok")}}',d1Databases:{DB:'catalog-test'}}));
  try {
    const db=await mf.getD1Database('DB');
    const original=readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8');
    for(const name of ['running_shoes','shoe_comparisons']) {
      const ddl=original.match(new RegExp(`CREATE TABLE "${name}" \\([\\s\\S]*?\\n\\);`))?.[0];
      assert.ok(ddl); await db.prepare(ddl).run();
    }
    await db.prepare(`INSERT INTO running_shoes(id,brand,model,slug,category,weight,heel_stack_height,forefoot_stack_height,heel_to_toe_drop,cushioning_level,stability,price,best_for,durability_rating,responsiveness_rating,comfort_rating,release_year) VALUES(293,'Saucony','Endorphin Pro 5','saucony-endorphin-pro-5','racing',7.3,39.5,31.5,8,'soft','neutral',225,'["racing"]',3.8,4.9,4.5,2025)`).run();
    await db.prepare("INSERT INTO shoe_comparisons(slug,shoe1_id,shoe2_id,comparison_type,title) VALUES('legacy',293,293,'popular','Old comparison')").run();
    const migration=readFileSync('migrations/20260926_shoe_evidence.sql','utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
    await db.batch(migration.map(s=>db.prepare(s)));
    const manifest=JSON.parse(readFileSync('data/shoes/2026-09-26.json','utf8')) as Catalog;
    const statements=catalogStatements(manifest).filter(s=>!s.startsWith('--'));
    await db.batch(statements.map(s=>db.prepare(s)));
    await db.batch(statements.map(s=>db.prepare(s)));
    assert.equal(await db.prepare('SELECT COUNT(*) n FROM running_shoes').first('n'),13);
    assert.equal(await db.prepare('SELECT COUNT(*) n FROM shoe_comparisons').first('n'),8);
    assert.equal(await db.prepare("SELECT durability_rating FROM running_shoes WHERE slug='hoka-mach-7'").first('durability_rating'),null);
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally { await mf.dispose(); }
});
