import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateShoeData } from '../../server/shoe-pipeline';

export type CatalogShoe = Record<string, any> & { slug: string; sourceUrl: string; brand: string; model: string };
export type CatalogComparison = { pair: string[]; type: 'evolution' | 'category_rival' | 'popular'; differences: string[]; verdict: string };
export type Catalog = { verifiedAt: string; policy: string; shoes: CatalogShoe[]; comparisons: (string[] | CatalogComparison)[] };
const fields = ['brand','model','slug','seriesName','versionNumber','category','weight','availability','availableFrom','heelStackHeight','forefootStackHeight','heelToToeDrop','cushioningLevel','stability','hasCarbonPlate','hasSuperFoam','price','bestFor','releaseYear','description','sourceUrl','dataSource','lastVerified','durabilityRating','responsivenessRating','comfortRating'];
const sqlName = (name: string) => '"' + name.replace(/[A-Z]/g, c => '_' + c.toLowerCase()) + '"';
export function literal(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Nonfinite value'); return String(value); }
  return "'" + (typeof value === 'string' ? value : JSON.stringify(value)).replaceAll("'", "''") + "'";
}
export function validateCatalog(catalog: Catalog) {
  if (!Number.isFinite(Date.parse(catalog.verifiedAt)) || !catalog.shoes.length) throw new Error('Invalid verification date or empty batch');
  const slugs = new Set<string>(); const names = new Set<string>();
  for (const shoe of catalog.shoes) {
    const result = validateShoeData(shoe);
    if (!result.valid) throw new Error(`${shoe.slug}: ${result.errors.join('; ')}`);
    const url = new URL(shoe.sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'www.runningwarehouse.com' || url.username || url.password || shoe.dataSource !== 'running_warehouse') throw new Error('Running Warehouse primary evidence required');
    const name = (shoe.brand + shoe.model).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!/^[a-z0-9-]+$/.test(shoe.slug) || slugs.has(shoe.slug) || names.has(name)) throw new Error('Duplicate or invalid model identity');
    for (const key of ['durabilityRating','responsivenessRating','comfortRating']) if (shoe[key] != null) throw new Error('This batch has no independently verified wear-test ratings');
    for (const key of ['price','heelToToeDrop']) if (!Number.isFinite(shoe[key])) throw new Error('Required finite measurement');
    if (shoe.weight != null && !Number.isFinite(shoe.weight)) throw new Error('Invalid weight');
    if (shoe.availability && !['unknown','available','upcoming'].includes(shoe.availability)) throw new Error('Invalid availability');
    if (shoe.availableFrom && (!/^\d{4}-\d{2}-\d{2}$/.test(shoe.availableFrom) || !Number.isFinite(Date.parse(shoe.availableFrom)))) throw new Error('Invalid availability date');
    if (shoe.refresh && (!Number.isInteger(shoe.refresh.id) || !shoe.refresh.expected || !Object.keys(shoe.refresh.expected).length)) throw new Error('Refresh requires an ID and expected old values');
    slugs.add(shoe.slug); names.add(name);
  }
  const pairs = new Set<string>();
  for (const comparison of catalog.comparisons) {
    const pair = Array.isArray(comparison) ? comparison : comparison.pair;
    if (pair.length !== 2 || pair[0] === pair[1] || pair.some(slug => !/^[a-z0-9-]+$/.test(slug))) throw new Error('Invalid comparison pair');
    const key = [...pair].sort().join('|');
    if (pairs.has(key)) throw new Error('Duplicate comparison pair');
    pairs.add(key);
    if (!Array.isArray(comparison) && (!['evolution','category_rival','popular'].includes(comparison.type) || !comparison.differences.length || !comparison.verdict)) throw new Error('Comparison needs type and evidence');
  }
}

/** Generate a reviewed SQL artifact, never connects to a database or enriches with invented scores. */
export function catalogStatements(catalog: Catalog): string[] {
  validateCatalog(catalog);
  const sql = ['-- Generated from a reviewed Running Warehouse manifest. Run as one transaction after the shoe-evidence migration.', 'CREATE TABLE "_shoe_catalog_import_guard" (ok INTEGER NOT NULL CHECK(ok=1));'];
  for (const shoe of catalog.shoes) {
    // A same-name legacy row under a different slug needs human reconciliation, not a duplicate.
    sql.push(`INSERT INTO "_shoe_catalog_import_guard" SELECT CASE WHEN EXISTS(SELECT 1 FROM running_shoes WHERE lower(brand)=lower(${literal(shoe.brand)}) AND lower(model)=lower(${literal(shoe.model)}) AND (slug IS NULL OR slug<>${literal(shoe.slug)})) THEN 0 ELSE 1 END;`);
    // Idempotent reruns are safe; never silently accept a colliding slug with different specs.
    const row = { availability: 'unknown', availableFrom: null, ...shoe, lastVerified: catalog.verifiedAt, durabilityRating: null, responsivenessRating: null, comfortRating: null };
    const matches = fields.map(key => `${sqlName(key)} IS ${literal(row[key as keyof typeof row])}`).join(' AND ');
    if (shoe.refresh) {
      const expected = Object.entries(shoe.refresh.expected).map(([key,value]) => {
        if (!fields.includes(key)) throw new Error(`Unsafe refresh field: ${key}`);
        return `${sqlName(key)} IS ${literal(value)}`;
      }).join(' AND ');
      sql.push(`INSERT INTO "_shoe_catalog_import_guard" SELECT CASE WHEN EXISTS(SELECT 1 FROM running_shoes WHERE id=${literal(shoe.refresh.id)} AND slug=${literal(shoe.slug)} AND ((${expected}) OR (${matches}))) THEN 1 ELSE 0 END;`);
      sql.push(`UPDATE running_shoes SET ${fields.map(key=>`${sqlName(key)}=${literal(row[key as keyof typeof row])}`).join(',')},ai_resilience_score=NULL,ai_mileage_estimate=NULL,ai_narrative=NULL,ai_faq=NULL,min_runner_weight=NULL,max_runner_weight=NULL WHERE id=${literal(shoe.refresh.id)} AND slug=${literal(shoe.slug)};`);
      // Old score-based verdicts must not survive a correction to their underlying evidence.
      sql.push(`UPDATE shoe_comparisons SET verdict_winner=NULL,verdict='Specifications updated. Compare fit and intended use; no verified overall winner.',verdict_reason='Legacy verdict cleared after source verification.',key_differences='[]' WHERE shoe1_id=${literal(shoe.refresh.id)} OR shoe2_id=${literal(shoe.refresh.id)};`);
      continue;
    }
    sql.push(`INSERT INTO "_shoe_catalog_import_guard" SELECT CASE WHEN EXISTS(SELECT 1 FROM running_shoes WHERE slug=${literal(shoe.slug)} AND NOT (${matches})) THEN 0 ELSE 1 END;`);
    sql.push(`INSERT INTO running_shoes (${fields.map(sqlName).join(',')}) VALUES (${fields.map(key => literal(row[key as keyof typeof row])).join(',')}) ON CONFLICT(slug) DO NOTHING;`);
  }
  for (const comparison of catalog.comparisons) {
    const [a,b] = Array.isArray(comparison) ? comparison : comparison.pair;
    const details = Array.isArray(comparison) ? { type: 'popular', differences: [], verdict: 'No overall winner: choose for fit and intended use.' } : comparison;
    const slug = `${a}-vs-${b}`;
    const title = `(SELECT brand || ' ' || model FROM running_shoes WHERE slug=${literal(a)}) || ' vs ' || (SELECT brand || ' ' || model FROM running_shoes WHERE slug=${literal(b)})`;
    sql.push(`INSERT INTO "_shoe_catalog_import_guard" SELECT CASE WHEN (SELECT count(*) FROM running_shoes WHERE slug IN (${literal(a)},${literal(b)}))=2 THEN 1 ELSE 0 END;`);
    sql.push(`INSERT INTO "_shoe_catalog_import_guard" SELECT CASE WHEN EXISTS(SELECT 1 FROM shoe_comparisons WHERE slug=${literal(slug)} AND (shoe1_id<>(SELECT id FROM running_shoes WHERE slug=${literal(a)}) OR shoe2_id<>(SELECT id FROM running_shoes WHERE slug=${literal(b)}))) THEN 0 ELSE 1 END;`);
    sql.push(`INSERT INTO shoe_comparisons (slug,shoe1_id,shoe2_id,comparison_type,title,meta_description,verdict,verdict_winner,verdict_reason,key_differences,best_for)
SELECT ${literal(slug)},(SELECT id FROM running_shoes WHERE slug=${literal(a)}),(SELECT id FROM running_shoes WHERE slug=${literal(b)}),${literal(details.type)},${title},'Compare source-linked specifications, recorded US prices and intended use.',${literal(details.verdict)},NULL,'Specifications are not a wear test. Check source dates and availability.',${literal(details.differences)},json_object('shoe1',(SELECT replace(category,'_',' ') FROM running_shoes WHERE slug=${literal(a)}),'shoe2',(SELECT replace(category,'_',' ') FROM running_shoes WHERE slug=${literal(b)})) WHERE true ON CONFLICT(slug) DO UPDATE SET comparison_type=excluded.comparison_type,title=excluded.title,meta_description=excluded.meta_description,verdict=excluded.verdict,verdict_winner=NULL,verdict_reason=excluded.verdict_reason,key_differences=excluded.key_differences,best_for=excluded.best_for;`);
  }
  sql.push('DROP TABLE "_shoe_catalog_import_guard";', 'PRAGMA foreign_key_check;');
  return sql;
}
export function catalogSql(catalog: Catalog): string {
  return catalogStatements(catalog).join('\n') + '\n';
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = process.argv[2] || 'data/shoes/2026-09-26.json';
  const catalog = JSON.parse(readFileSync(manifest, 'utf8')) as Catalog;
  const sql = catalogSql(catalog);
  const index = process.argv.indexOf('--out');
  if (index !== -1) {
    if (!process.argv[index+1]) throw new Error('--out requires a filename');
    writeFileSync(process.argv[index+1], sql);
  }
  console.log(JSON.stringify({ dryRun: true, shoes: catalog.shoes.length, comparisons: catalog.comparisons.length, source: 'Running Warehouse', generatedSql: index === -1 ? null : process.argv[index+1], databaseChanged: false }));
}
