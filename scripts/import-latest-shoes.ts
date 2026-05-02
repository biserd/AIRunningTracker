import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes, type InsertRunningShoe } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface CuratedShoe {
  brand: string;
  model: string;
  category: 'daily_trainer' | 'racing' | 'long_run' | 'recovery' | 'speed_training' | 'trail';
  weight: number;
  heelStackHeight: number;
  forefootStackHeight: number;
  heelToToeDrop: number;
  cushioningLevel: 'soft' | 'medium' | 'firm';
  stability: 'neutral' | 'mild_stability' | 'motion_control';
  hasCarbonPlate: boolean;
  hasSuperFoam: boolean;
  price: number;
  bestFor: string[];
  durabilityRating: number;
  responsivenessRating: number;
  comfortRating: number;
  releaseYear: number;
  sourceUrl?: string;
  imageUrl?: string;
  description?: string;
}

interface CuratedDataset {
  _meta?: { compiled?: string; sources?: string[]; notes?: string };
  shoes: CuratedShoe[];
}

const BRAND_CANONICAL: Record<string, string> = {
  asics: 'ASICS',
  hoka: 'HOKA',
  'hoka one one': 'HOKA',
  nike: 'Nike',
  adidas: 'Adidas',
  brooks: 'Brooks',
  saucony: 'Saucony',
  'new balance': 'New Balance',
  on: 'On',
  altra: 'Altra',
  puma: 'Puma',
  mizuno: 'Mizuno',
  salomon: 'Salomon',
  'la sportiva': 'La Sportiva',
  merrell: 'Merrell',
  'topo athletic': 'Topo Athletic',
  topo: 'Topo Athletic',
  'under armour': 'Under Armour',
  'inov-8': 'Inov-8',
  inov8: 'Inov-8',
  'the north face': 'The North Face',
  'mount to coast': 'Mount to Coast',
  reebok: 'Reebok',
  craft: 'Craft',
  karhu: 'Karhu',
  kiprun: 'Kiprun',
  nnormal: 'Nnormal',
  satisfy: 'Satisfy',
  lululemon: 'lululemon',
};

function canonicalBrand(brand: string): string {
  return BRAND_CANONICAL[brand.trim().toLowerCase()] ?? brand.trim();
}

function generateSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractVersionNumber(model: string): number | null {
  const vMatch = model.match(/v(\d+)\b/i);
  if (vMatch) return parseInt(vMatch[1], 10);
  const tail = model.match(/(\d+)\s*$/);
  if (tail) return parseInt(tail[1], 10);
  return null;
}

function extractSeriesName(model: string): string | null {
  const cleaned = model
    .replace(/\s*v\d+\b/i, '')
    .replace(/\s+\d+(\.\d+)?\s*$/, '')
    .trim();
  return cleaned || null;
}

interface ImportSummary {
  inserted: number;
  updated: number;
  skippedInvalid: number;
}

async function importLatestShoes(filePath: string): Promise<ImportSummary> {
  console.log(`\n=== Import latest shoes from ${path.basename(filePath)} ===`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const dataset: CuratedDataset = JSON.parse(raw);
  const incoming = dataset.shoes ?? [];
  console.log(`Loaded ${incoming.length} curated shoes`);

  const toUpsert: InsertRunningShoe[] = [];
  let skippedInvalid = 0;

  for (const s of incoming) {
    const brand = canonicalBrand(s.brand);
    const model = s.model.trim();

    if (!brand || !model || !s.weight || !s.price) {
      console.log(`  ⚠ Invalid: ${s.brand} ${s.model}`);
      skippedInvalid++;
      continue;
    }

    const slug = generateSlug(brand, model);
    const versionNumber = extractVersionNumber(model);
    const seriesName = extractSeriesName(model);

    toUpsert.push({
      brand,
      model,
      slug,
      seriesName,
      versionNumber,
      category: s.category,
      weight: s.weight,
      heelStackHeight: s.heelStackHeight,
      forefootStackHeight: s.forefootStackHeight,
      heelToToeDrop: s.heelToToeDrop,
      cushioningLevel: s.cushioningLevel,
      stability: s.stability,
      hasCarbonPlate: s.hasCarbonPlate,
      hasSuperFoam: s.hasSuperFoam,
      price: s.price,
      bestFor: s.bestFor,
      minRunnerWeight: null,
      maxRunnerWeight: null,
      durabilityRating: s.durabilityRating,
      responsivenessRating: s.responsivenessRating,
      comfortRating: s.comfortRating,
      releaseYear: s.releaseYear,
      imageUrl: s.imageUrl ?? null,
      description: s.description ?? null,
      sourceUrl: s.sourceUrl ?? null,
      dataSource: 'curated',
      lastVerified: new Date(),
    });
  }

  const beforeCount = (
    await db.execute<{ count: string }>(sql`select count(*)::text as count from running_shoes`)
  ).rows[0]?.count;
  const beforeNum = beforeCount ? parseInt(beforeCount, 10) : 0;

  let inserted = 0;
  let updated = 0;
  if (toUpsert.length > 0) {
    for (let i = 0; i < toUpsert.length; i += 50) {
      const batch = toUpsert.slice(i, i + 50);
      // True upsert on slug: keep existing aiNarrative/aiFaq/etc but refresh specs.
      const result = await db
        .insert(runningShoes)
        .values(batch)
        .onConflictDoUpdate({
          target: runningShoes.slug,
          set: {
            brand: sql`excluded.brand`,
            model: sql`excluded.model`,
            seriesName: sql`excluded.series_name`,
            versionNumber: sql`excluded.version_number`,
            category: sql`excluded.category`,
            weight: sql`excluded.weight`,
            heelStackHeight: sql`excluded.heel_stack_height`,
            forefootStackHeight: sql`excluded.forefoot_stack_height`,
            heelToToeDrop: sql`excluded.heel_to_toe_drop`,
            cushioningLevel: sql`excluded.cushioning_level`,
            stability: sql`excluded.stability`,
            hasCarbonPlate: sql`excluded.has_carbon_plate`,
            hasSuperFoam: sql`excluded.has_super_foam`,
            price: sql`excluded.price`,
            bestFor: sql`excluded.best_for`,
            durabilityRating: sql`excluded.durability_rating`,
            responsivenessRating: sql`excluded.responsiveness_rating`,
            comfortRating: sql`excluded.comfort_rating`,
            releaseYear: sql`excluded.release_year`,
            // For optional metadata, only overwrite when the curated value is non-null,
            // preserving any richer existing data.
            imageUrl: sql`COALESCE(excluded.image_url, ${runningShoes.imageUrl})`,
            description: sql`COALESCE(excluded.description, ${runningShoes.description})`,
            sourceUrl: sql`COALESCE(excluded.source_url, ${runningShoes.sourceUrl})`,
            dataSource: sql`excluded.data_source`,
            lastVerified: sql`excluded.last_verified`,
          },
        });
      console.log(
        `  upserted batch ${Math.floor(i / 50) + 1}/${Math.ceil(toUpsert.length / 50)} (${batch.length} rows)`
      );
    }
  }

  const afterCountRow = (
    await db.execute<{ count: string }>(sql`select count(*)::text as count from running_shoes`)
  ).rows[0]?.count;
  const afterNum = afterCountRow ? parseInt(afterCountRow, 10) : 0;
  inserted = Math.max(0, afterNum - beforeNum);
  updated = toUpsert.length - inserted;

  console.log(`\nSummary:`);
  console.log(`  upserted   : ${toUpsert.length}`);
  console.log(`  → inserted : ${inserted}`);
  console.log(`  → updated  : ${updated}`);
  console.log(`  invalid    : ${skippedInvalid}`);

  return { inserted, updated, skippedInvalid };
}

async function main() {
  const fileArg = process.argv[2];
  const defaultFile = path.join(process.cwd(), 'attached_assets/shoes-2026-curated.json');
  const target = fileArg ? path.resolve(fileArg) : defaultFile;

  if (!fs.existsSync(target)) {
    console.error(`File not found: ${target}`);
    process.exit(1);
  }

  const summary = await importLatestShoes(target);

  const totalRow = (
    await db.execute<{ count: string }>(sql`select count(*)::text as count from running_shoes`)
  ).rows[0]?.count;
  console.log(`\n=== Import complete ===`);
  console.log(`Inserted ${summary.inserted} new, updated ${summary.updated} existing`);
  console.log(`Total shoes in DB: ${totalRow ?? 'unknown'}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
