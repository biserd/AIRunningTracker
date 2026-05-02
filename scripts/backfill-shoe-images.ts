/**
 * Backfill `running_shoes.image_url` for shoes that are missing a product photo.
 *
 * --------------------------------------------------------------------------
 * Workflow when a new batch of shoes is imported (e.g. the 2026 lineup):
 *
 *   1. Run this script with `--report` to list every shoe that still has a
 *      NULL imageUrl. The output is a starter JSON object keyed by slug.
 *
 *        npx tsx scripts/backfill-shoe-images.ts --report
 *
 *   2. For each slug, source an official press image from the brand's media
 *      site (Brooks, Saucony, HOKA, ASICS, NB, On, Adidas, Mizuno, Puma,
 *      Topo Athletic, Altra, Salomon, …). Retailer / review CDNs (Fleet
 *      Feet, RoadRunnerSports, Holabird, Believe in the Run, Doctors of
 *      Running, Solereview, Run Repeat) are also acceptable.
 *
 *      Inside the Replit Agent the `imageSearch({ query, count })` callback
 *      in the JS code-execution sandbox can be used to find candidates
 *      quickly; pick a high-resolution still (>=600px on the long side) on
 *      a white / neutral background where possible.
 *
 *   3. Save the curated mapping to
 *      `attached_assets/shoe-image-backfill.json`:
 *
 *        {
 *          "brooks-glycerin-gts-23": "https://…/glycerin-gts-23.jpg",
 *          "hoka-mach-7":           "https://…/mach-7.jpg"
 *        }
 *
 *   4. Run the script again without flags. Each URL is HEAD-fetched to make
 *      sure it actually serves an image, and only validated URLs are
 *      written to the DB.
 *
 *        npx tsx scripts/backfill-shoe-images.ts
 *
 *   5. (Optional but encouraged for long-term durability) Also add the
 *      `imageUrl` field to the matching entry in
 *      `attached_assets/shoes-2026-curated.json` so the next run of
 *      `scripts/import-latest-shoes.ts` keeps the value if the DB is ever
 *      rebuilt from the curated dataset.
 * --------------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { and, eq, isNull, or } from 'drizzle-orm';

const OVERRIDES_FILE = path.join(
  process.cwd(),
  'attached_assets/shoe-image-backfill.json',
);

interface MissingShoe {
  id: number;
  slug: string | null;
  brand: string;
  model: string;
  releaseYear: number;
}

async function loadMissingShoes(): Promise<MissingShoe[]> {
  const rows = await db
    .select({
      id: runningShoes.id,
      slug: runningShoes.slug,
      brand: runningShoes.brand,
      model: runningShoes.model,
      releaseYear: runningShoes.releaseYear,
    })
    .from(runningShoes)
    .where(or(isNull(runningShoes.imageUrl), eq(runningShoes.imageUrl, '')));

  return rows.sort((a, b) => {
    if (a.releaseYear !== b.releaseYear) return b.releaseYear - a.releaseYear;
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.model.localeCompare(b.model);
  });
}

function loadOverrides(): Record<string, string> {
  if (!fs.existsSync(OVERRIDES_FILE)) return {};
  const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, string>;
}

async function validateUrl(url: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RunAnalytics/1.0)' },
      redirect: 'follow',
    });
    const ct = res.headers.get('content-type') ?? '';
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (!ct.startsWith('image/')) {
      return { ok: false, reason: `Not an image (content-type: ${ct || 'unknown'})` };
    }
    return { ok: true, reason: `${res.status} ${ct}` };
  } catch (err) {
    return { ok: false, reason: `Fetch failed: ${(err as Error).message}` };
  }
}

async function reportMissing(missing: MissingShoe[]): Promise<void> {
  console.log(`\nShoes missing imageUrl: ${missing.length}\n`);

  const byYear = new Map<number, MissingShoe[]>();
  for (const m of missing) {
    if (!byYear.has(m.releaseYear)) byYear.set(m.releaseYear, []);
    byYear.get(m.releaseYear)!.push(m);
  }

  for (const [year, list] of [...byYear.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(`-- ${year} (${list.length}) --`);
    for (const s of list) {
      console.log(`  ${s.slug?.padEnd(45) ?? '(no slug)'.padEnd(45)} ${s.brand} ${s.model}`);
    }
    console.log('');
  }

  const starter: Record<string, string> = {};
  for (const m of missing) {
    if (m.slug) starter[m.slug] = '';
  }
  console.log('Starter JSON for attached_assets/shoe-image-backfill.json:\n');
  console.log(JSON.stringify(starter, null, 2));
}

async function applyOverrides(
  missing: MissingShoe[],
  overrides: Record<string, string>,
): Promise<void> {
  const slugLookup = new Map(missing.map((m) => [m.slug, m]));
  const now = new Date();

  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  let unknown = 0;

  for (const [slug, url] of Object.entries(overrides)) {
    if (!url) {
      skipped++;
      continue;
    }
    const target = slugLookup.get(slug);
    if (!target) {
      console.log(`  ? unknown / already-populated slug: ${slug}`);
      unknown++;
      continue;
    }

    const v = await validateUrl(url);
    if (!v.ok) {
      console.log(`  ✗ ${slug} -> ${v.reason}`);
      invalid++;
      continue;
    }

    await db
      .update(runningShoes)
      .set({ imageUrl: url, lastVerified: now })
      .where(and(eq(runningShoes.id, target.id), or(isNull(runningShoes.imageUrl), eq(runningShoes.imageUrl, ''))));

    console.log(`  ✓ ${slug}`);
    updated++;
  }

  console.log(`\nSummary:`);
  console.log(`  updated  : ${updated}`);
  console.log(`  skipped  : ${skipped} (empty url in overrides)`);
  console.log(`  invalid  : ${invalid}`);
  console.log(`  unknown  : ${unknown}`);
}

async function main(): Promise<void> {
  const missing = await loadMissingShoes();
  const wantsReport = process.argv.includes('--report');

  if (wantsReport) {
    await reportMissing(missing);
    return;
  }

  const overrides = loadOverrides();
  if (Object.keys(overrides).length === 0) {
    console.log(
      `No overrides found at ${OVERRIDES_FILE}. ` +
        `Run with --report to generate a starter file, then re-run.`,
    );
    return;
  }

  await applyOverrides(missing, overrides);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
