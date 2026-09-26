import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { catalogSql, validateCatalog, literal, type Catalog } from './catalog';
import { normalizeShoeData, calculateResilienceScore, generateMileageEstimate } from '../../server/shoe-pipeline';
import { averageShoeRating, shoeNumber, shoeBoolean, ratedHigher, safeShoeSource, canRecommendShoe, shoeAvailability } from '../../shared/shoeEvidence';

const manifest = JSON.parse(readFileSync('data/shoes/2026-09-26.json','utf8')) as Catalog;
const migration = readFileSync('migrations/20260926_shoe_evidence.sql','utf8');
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
  db.exec(`INSERT INTO running_shoes(id,brand,model,slug,category,weight,heel_stack_height,forefoot_stack_height,heel_to_toe_drop,cushioning_level,stability,price,best_for,durability_rating,responsiveness_rating,comfort_rating,release_year) VALUES(293,'Saucony','Endorphin Pro 5','saucony-endorphin-pro-5','racing',7.3,39.5,31.5,8,'soft','neutral',225,'["racing"]',3.8,4.9,4.5,2025);
    INSERT INTO shoe_comparisons(slug,shoe1_id,shoe2_id,comparison_type,title) VALUES('legacy',293,293,'popular','Historical comparison');
    UPDATE sqlite_sequence SET seq=999 WHERE name='running_shoes';`);
  return db;
}
test('catalog has distinct models, authoritative sources and no fabricated ratings', () => {
  validateCatalog(manifest);
  assert.equal(manifest.shoes.length,12);
  assert.equal(manifest.shoes.find(s=>s.slug==='asics-superblast-3')?.weight,8.1);
  assert.equal(manifest.shoes.find(s=>s.slug==='puma-deviate-nitro-4')?.heelStackHeight,35);
});
test('migration preserves every legacy field, comparison, index and sequence', () => {
  const db = fixture();
  const before = db.prepare('SELECT * FROM running_shoes').all();
  db.exec('BEGIN'); db.exec(migration); db.exec('COMMIT');
  const legacyColumns = Object.keys(before[0]).map(key=>`"${key}"`).join(',');
  assert.deepEqual(db.prepare(`SELECT ${legacyColumns} FROM running_shoes`).all(),before);
  assert.equal(db.prepare('SELECT availability FROM running_shoes').get()?.availability,'unknown');
  assert.equal(db.prepare('SELECT count(*) n FROM shoe_comparisons').get()?.n,1);
  assert.equal(db.prepare("SELECT seq FROM sqlite_sequence WHERE name='running_shoes'").get()?.seq,999);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='index' AND name LIKE 'running_shoes_%'").get()?.n,4);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  db.close();
});

const racers = JSON.parse(readFileSync('data/shoes/2026-09-26-racers.json','utf8')) as Catalog;
function racerFixture() {
  const db = fixture(); db.exec('BEGIN'); db.exec(migration); db.exec('COMMIT');
  for (const shoe of racers.shoes.filter(s=>s.refresh)) {
    const old = shoe.refresh.expected;
    db.exec(`INSERT INTO running_shoes(id,brand,model,slug,category,weight,heel_stack_height,forefoot_stack_height,heel_to_toe_drop,cushioning_level,stability,price,best_for,release_year,data_source) VALUES(${shoe.refresh.id},${literal(old.brand)},${literal(old.model)},${literal(shoe.slug)},'racing',${old.weight},${old.heelStackHeight},${old.forefootStackHeight},${old.heelToToeDrop},'medium','neutral',${old.price},'["racing"]',2025,'curated');`);
  }
  db.exec(`INSERT INTO running_shoes(id,brand,model,slug,category,weight,heel_to_toe_drop,cushioning_level,stability,price,best_for) VALUES(716,'Adidas','Adizero Adios Pro 3','adidas-adizero-adios-pro-3','racing',7.8,8,'medium','neutral',250,'["racing"]');
    INSERT INTO shoe_comparisons(id,slug,shoe1_id,shoe2_id,comparison_type,title,verdict_winner) VALUES(5,'adidas-adizero-adios-pro-3-vs-adidas-adizero-adios-pro-4',716,188,'evolution','Old verdict','shoe2');`);
  return db;
}
test('racers import preserves IDs, updates evidence and comparisons, and is idempotent',()=>{
  const db=racerFixture();
  db.exec('BEGIN'); db.exec(catalogSql(racers)); db.exec('COMMIT');
  const snapshot=db.prepare('SELECT * FROM running_shoes').all();
  const comparisons=db.prepare('SELECT * FROM shoe_comparisons').all();
  db.exec('BEGIN'); db.exec(catalogSql(racers)); db.exec('COMMIT');
  assert.deepEqual(db.prepare('SELECT * FROM running_shoes').all(),snapshot);
  assert.deepEqual(db.prepare('SELECT * FROM shoe_comparisons').all(),comparisons);
  assert.equal(db.prepare('SELECT heel_stack_height FROM running_shoes WHERE id=188').get()?.heel_stack_height,39);
  assert.equal(db.prepare('SELECT id FROM shoe_comparisons WHERE slug=\'adidas-adizero-adios-pro-3-vs-adidas-adizero-adios-pro-4\'').get()?.id,5);
  assert.equal(db.prepare("SELECT count(*) n FROM shoe_comparisons WHERE comparison_type='evolution'").get()?.n,2);
  assert.equal(db.prepare("SELECT weight FROM running_shoes WHERE slug='nike-alphafly-4'").get()?.weight,null);
  assert.equal(db.prepare('SELECT count(*) n FROM running_shoes').get()?.n,5);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  db.close();
});
test('refresh refuses changed production baseline and rolls back new rows',()=>{
  const db=racerFixture(); db.exec('UPDATE running_shoes SET price=123 WHERE id=188');
  db.exec('BEGIN'); assert.throws(()=>db.exec(catalogSql(racers)),/CHECK/); db.exec('ROLLBACK');
  assert.equal(db.prepare("SELECT count(*) n FROM running_shoes WHERE slug='nike-alphafly-4'").get()?.n,0);
  assert.equal(db.prepare('SELECT price FROM running_shoes WHERE id=188').get()?.price,123);
  db.close();
});
test('upcoming shoes remain searchable but are not current purchase recommendations',()=>{
  const upcoming = racers.shoes.find(s=>s.slug==='nike-alphafly-4')!;
  assert.equal(canRecommendShoe(upcoming),false);
  assert.equal(canRecommendShoe({...upcoming,availableFrom:'2020-01-01'}),false);
  assert.match(shoeAvailability(upcoming),/Upcoming.*2026-10-29/);
  assert.equal(normalizeShoeData(upcoming as any).weight,null);
  assert.equal(ratedHigher(7,null),false);
});
test('import works twice without duplicate rows or resetting old data', () => {
  const db=fixture(); db.exec('BEGIN'); db.exec(migration); db.exec(catalogSql(manifest)); db.exec('COMMIT');
  const first=db.prepare('SELECT * FROM running_shoes').all();
  db.exec('BEGIN'); db.exec(catalogSql(manifest)); db.exec('COMMIT');
  assert.deepEqual(db.prepare('SELECT * FROM running_shoes').all(),first);
  assert.equal(first.length,13);
  assert.equal(db.prepare('SELECT count(*) n FROM shoe_comparisons').get()?.n,8);
  assert.equal(db.prepare("SELECT price FROM running_shoes WHERE id=293").get()?.price,225);
  assert.equal(db.prepare("SELECT durability_rating FROM running_shoes WHERE slug='hoka-mach-7'").get()?.durability_rating,null);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  db.close();
});
test('conflicting reimport fails and the caller can roll back atomically', () => {
  const db=fixture(); db.exec('BEGIN'); db.exec(migration); db.exec(catalogSql(manifest)); db.exec('COMMIT');
  const bad=structuredClone(manifest); bad.shoes[1].weight=7;
  db.exec('BEGIN'); assert.throws(()=>db.exec(catalogSql(bad)),/CHECK/); db.exec('ROLLBACK');
  assert.equal(db.prepare("SELECT weight FROM running_shoes WHERE slug='asics-novablast-6'").get()?.weight,8.8);
  db.close();
});
test('source and duplicate guards fail closed; SQL strings escape apostrophes', () => {
  const bad=structuredClone(manifest); bad.shoes[0].sourceUrl='https://example.com/shoe';
  assert.throws(()=>validateCatalog(bad),/Running Warehouse/);
  const dup=structuredClone(manifest); dup.shoes.push(dup.shoes[0]); assert.throws(()=>validateCatalog(dup),/Duplicate/);
  assert.equal(literal("runner's shoe"),"'runner''s shoe'");
});
test('unknown evidence stays unknown in normalization and presentation', () => {
  const shoe=normalizeShoeData({ ...manifest.shoes[0], heelStackHeight:null, forefootStackHeight:null } as any);
  assert.equal(shoe.durabilityRating,null); assert.equal(shoe.heelStackHeight,null);
  assert.equal(calculateResilienceScore(shoe),null); assert.equal(generateMileageEstimate(shoe),null);
  assert.equal(averageShoeRating([null,4,5]),'Not rated'); assert.equal(averageShoeRating([]),'Not rated');
  assert.equal(shoeNumber(null),'Not published'); assert.equal(shoeBoolean(null),'Not verified');
  assert.equal(ratedHigher(4,null),false); assert.equal(safeShoeSource('javascript:alert(1)'),undefined);
});
