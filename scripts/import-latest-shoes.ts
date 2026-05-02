import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq } from 'drizzle-orm';

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
}

interface CuratedDataset {
  _meta?: { compiled?: string; sources?: string[] };
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
  skippedDuplicate: number;
  skippedInvalid: number;
}

async function importLatestShoes(filePath: string): Promise<ImportSummary> {
  console.log(`\n=== Import latest shoes from ${path.basename(filePath)} ===`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const dataset: CuratedDataset = JSON.parse(raw);
  const incoming = dataset.shoes ?? [];
  console.log(`Loaded ${incoming.length} curated shoes`);

  const existing = await db
    .select({
      id: runningShoes.id,
      brand: runningShoes.brand,
      model: runningShoes.model,
      slug: runningShoes.slug,
    })
    .from(runningShoes);

  const existingSlugs = new Set(existing.map((r) => r.slug?.toLowerCase()).filter(Boolean));
  const existingBrandModel = new Set(
    existing.map((r) => `${r.brand.toLowerCase()}::${r.model.toLowerCase()}`)
  );

  const toInsert: any[] = [];
  let skippedDuplicate = 0;
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
    const bmKey = `${brand.toLowerCase()}::${model.toLowerCase()}`;

    if (existingSlugs.has(slug) || existingBrandModel.has(bmKey)) {
      skippedDuplicate++;
      continue;
    }

    const versionNumber = extractVersionNumber(model);
    const seriesName = extractSeriesName(model);

    toInsert.push({
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
      imageUrl: null,
      sourceUrl: s.sourceUrl ?? null,
      dataSource: 'curated' as const,
      lastVerified: new Date(),
    });

    existingSlugs.add(slug);
    existingBrandModel.add(bmKey);
  }

  console.log(`\nSummary:`);
  console.log(`  to insert : ${toInsert.length}`);
  console.log(`  duplicates: ${skippedDuplicate}`);
  console.log(`  invalid   : ${skippedInvalid}`);

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      await db.insert(runningShoes).values(batch);
      console.log(`  inserted batch ${Math.floor(i / 50) + 1}/${Math.ceil(toInsert.length / 50)} (${batch.length} rows)`);
    }
  }

  return {
    inserted: toInsert.length,
    skippedDuplicate,
    skippedInvalid,
  };
}

async function main() {
  // Default to the curated 2026 dataset; allow override via CLI arg.
  const fileArg = process.argv[2];
  const defaultFile = path.join(process.cwd(), 'attached_assets/shoes-2026-curated.json');
  const target = fileArg ? path.resolve(fileArg) : defaultFile;

  if (!fs.existsSync(target)) {
    console.error(`File not found: ${target}`);
    process.exit(1);
  }

  const summary = await importLatestShoes(target);

  const total = await db.select({ id: runningShoes.id }).from(runningShoes);
  console.log(`\n=== Import complete ===`);
  console.log(`Inserted ${summary.inserted} new shoes`);
  console.log(`Total shoes in DB: ${total.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
