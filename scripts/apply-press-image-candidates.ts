/**
 * Apply curated press-image candidate URLs from
 * `attached_assets/shoe-press-image-candidates.json` to the running_shoes
 * table.
 *
 * The candidates JSON is keyed by slug and produced by the agent's image
 * search loop. After running this script the URLs in the DB point to the
 * external sources; follow it with:
 *
 *   npx tsx scripts/mirror-shoe-images.ts --year=2026
 *
 * to actually mirror the bytes into Replit Object Storage and rewrite the
 * committed `attached_assets/shoe-image-urls.json` map.
 */
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

interface Candidate {
  brand: string;
  model: string;
  url: string;
  host?: string;
  w?: number;
  h?: number;
  score?: number;
}

const CANDIDATES_PATH = path.resolve(
  process.cwd(),
  'attached_assets/shoe-press-image-candidates.json',
);

async function main(): Promise<void> {
  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error(`Candidates file not found: ${CANDIDATES_PATH}`);
    process.exit(1);
  }

  const candidates = JSON.parse(
    fs.readFileSync(CANDIDATES_PATH, 'utf8'),
  ) as Record<string, Candidate>;

  const slugs = Object.keys(candidates);
  console.log(`Loaded ${slugs.length} candidate(s) from ${CANDIDATES_PATH}`);

  let updated = 0;
  let unknown = 0;

  for (const [slug, c] of Object.entries(candidates)) {
    if (!c.url) continue;
    const result = await db
      .update(runningShoes)
      .set({ imageUrl: sql`${c.url}` })
      .where(eq(runningShoes.slug, slug))
      .returning({ id: runningShoes.id });
    if (result.length === 0) {
      console.log(`  ? unknown slug: ${slug}`);
      unknown++;
    } else {
      console.log(`  ✓ ${slug} → ${c.host ?? '(host?)'} ${c.w ?? ''}x${c.h ?? ''}`);
      updated++;
    }
  }

  console.log(`\nApplied ${updated}, unknown ${unknown}.`);
  console.log(`Next: npx tsx scripts/mirror-shoe-images.ts --year=2026`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Apply failed:', err);
    process.exit(1);
  });
