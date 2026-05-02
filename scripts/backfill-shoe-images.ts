/**
 * Backfill running_shoes.image_url from a JSON map.
 *
 * The agent-driven workflow (see replit.md "Image backfill workflow")
 * uses the `imageSearch` callback in the code-execution sandbox to
 * find product photos and writes them straight to the DB. THIS script
 * is the offline / re-runnable companion: feed it a JSON file mapping
 * "<Brand> <Model>" → "<imageUrl>" and it will fill any matching rows
 * whose image_url is currently NULL (or, with --overwrite, any row).
 *
 * The JSON shape is intentionally simple so non-technical contributors
 * can maintain it without touching the curated dataset:
 *
 *   {
 *     "Nike Vaporfly 5": "https://cdn.fleetfeet.com/.../vaporfly-5.png",
 *     "HOKA Clifton 11": "https://images.hoka.com/.../clifton-11.jpg"
 *   }
 *
 * Usage:
 *   npx tsx scripts/backfill-shoe-images.ts                       # uses attached_assets/shoe-image-urls.json
 *   npx tsx scripts/backfill-shoe-images.ts path/to/other.json    # custom file
 *   npx tsx scripts/backfill-shoe-images.ts --overwrite           # also overwrite existing image_url values
 */
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

interface BackfillResult {
  updated: number;
  skipped: number;
  notFound: string[];
}

const DEFAULT_PATH = path.resolve(
  process.cwd(),
  'attached_assets',
  'shoe-image-urls.json',
);

async function backfillImages(jsonPath: string, overwrite: boolean): Promise<BackfillResult> {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Image map not found at ${jsonPath}. Create it first or pass a path as the first CLI arg.`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Image map at ${jsonPath} must be a JSON object of "Brand Model" → "imageUrl".`);
  }

  const map = parsed as Record<string, string>;
  const entries = Object.entries(map).filter(([, v]) => typeof v === 'string' && v.trim().length > 0);
  console.log(`Loaded ${entries.length} image entries from ${path.relative(process.cwd(), jsonPath)}`);

  let updated = 0;
  let skipped = 0;
  const notFound: string[] = [];

  for (const [name, imageUrl] of entries) {
    const trimmed = name.trim();
    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace < 1) {
      console.warn(`Skipping malformed key (need "Brand Model"): ${trimmed}`);
      continue;
    }
    const brand = trimmed.slice(0, firstSpace);
    const model = trimmed.slice(firstSpace + 1);

    const where = overwrite
      ? and(eq(runningShoes.brand, brand), eq(runningShoes.model, model))
      : and(eq(runningShoes.brand, brand), eq(runningShoes.model, model), isNull(runningShoes.imageUrl));

    const result = await db
      .update(runningShoes)
      .set({ imageUrl: sql`${imageUrl}` })
      .where(where)
      .returning({ id: runningShoes.id });

    if (result.length > 0) {
      updated += result.length;
      console.log(`✓ ${brand} ${model} → ${imageUrl.slice(0, 80)}`);
    } else {
      const exists = await db
        .select({ id: runningShoes.id, imageUrl: runningShoes.imageUrl })
        .from(runningShoes)
        .where(and(eq(runningShoes.brand, brand), eq(runningShoes.model, model)))
        .limit(1);
      if (exists.length === 0) {
        notFound.push(trimmed);
        console.log(`✗ ${trimmed} — no row with that brand+model`);
      } else {
        skipped++;
        console.log(`· ${trimmed} — already has image_url (use --overwrite to replace)`);
      }
    }
  }

  return { updated, skipped, notFound };
}

const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');
const jsonArg = args.find((a) => !a.startsWith('--')) ?? DEFAULT_PATH;

backfillImages(jsonArg, overwrite)
  .then((res) => {
    console.log('\nBackfill complete.');
    console.log(`- Updated: ${res.updated}`);
    console.log(`- Skipped (already had image): ${res.skipped}`);
    console.log(`- Not found in DB: ${res.notFound.length}`);
    if (res.notFound.length > 0) {
      console.log('  ' + res.notFound.join(', '));
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
