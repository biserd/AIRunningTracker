/**
 * Mirror running-shoe images from external CDNs to Replit Object Storage.
 *
 * Why: external image URLs (Amazon, Shopify, manufacturer sites) sometimes
 * 403 cross-origin browsers, and any of them can disappear at any time.
 * Mirroring once gives us durable, hotlink-safe assets we own.
 *
 * Behavior:
 *   - Loads every running_shoes row whose image_url is set AND whose
 *     image_url does NOT already start with "/public-objects/" (so the
 *     script is idempotent — re-runs skip already-mirrored shoes).
 *   - Restrict to a specific release year via --year=2026 (default: 2026).
 *     Use --year=all to mirror every year.
 *   - Downloads each external image with browser-like headers, validates
 *     it's image/*, uploads it to the public path of the default bucket
 *     under shoes/<slug>.<ext>, then UPDATEs running_shoes.image_url to
 *     /public-objects/shoes/<slug>.<ext>.
 *   - At the end, rewrites attached_assets/shoe-image-urls.json so the
 *     committed source-of-truth uses the new internal URLs (and any
 *     redeploy / cron run reapplies them deterministically).
 *
 * Usage:
 *   npx tsx scripts/mirror-shoe-images.ts            # mirrors 2026 shoes
 *   npx tsx scripts/mirror-shoe-images.ts --year=2025
 *   npx tsx scripts/mirror-shoe-images.ts --year=all
 */
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, and, sql, isNotNull, not, like } from 'drizzle-orm';
import { objectStorageClient } from '../server/replit_integrations/object_storage/objectStorage';

const args = process.argv.slice(2);
const yearArg = args.find((a) => a.startsWith('--year='))?.split('=')[1] ?? '2026';
const targetYear: number | 'all' = yearArg === 'all' ? 'all' : parseInt(yearArg, 10);
if (yearArg !== 'all' && (!Number.isFinite(targetYear as number))) {
  console.error(`Invalid --year value: ${yearArg}`);
  process.exit(1);
}

const PUBLIC_PREFIX = '/public-objects/';
const JSON_MAP_PATH = path.resolve(process.cwd(), 'attached_assets', 'shoe-image-urls.json');

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';

function parsePublicSearchPath(): { bucketName: string; prefix: string } {
  const raw = (process.env.PUBLIC_OBJECT_SEARCH_PATHS || '').split(',')[0]?.trim();
  if (!raw) throw new Error('PUBLIC_OBJECT_SEARCH_PATHS env var is empty');
  const trimmed = raw.startsWith('/') ? raw.slice(1) : raw;
  const slash = trimmed.indexOf('/');
  if (slash < 0) {
    return { bucketName: trimmed, prefix: '' };
  }
  return {
    bucketName: trimmed.slice(0, slash),
    prefix: trimmed.slice(slash + 1).replace(/\/$/, ''),
  };
}

function extFromContentType(ct: string): string {
  const c = ct.toLowerCase();
  if (c.includes('jpeg')) return 'jpg';
  if (c.includes('png')) return 'png';
  if (c.includes('webp')) return 'webp';
  if (c.includes('gif')) return 'gif';
  if (c.includes('avif')) return 'avif';
  return 'jpg';
}

interface DownloadResult {
  buffer: Buffer;
  contentType: string;
}

async function downloadImage(url: string): Promise<DownloadResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) {
      throw new Error(`non-image content-type: ${ct}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1024) {
      throw new Error(`suspiciously small (${buf.byteLength} bytes)`);
    }
    return { buffer: buf, contentType: ct.split(';')[0].trim() };
  } finally {
    clearTimeout(timer);
  }
}

async function mirror() {
  const { bucketName, prefix } = parsePublicSearchPath();
  const bucket = objectStorageClient.bucket(bucketName);
  console.log(`Bucket: ${bucketName}, prefix: "${prefix}"`);
  console.log(`Target year: ${targetYear}`);

  const baseConditions = [
    isNotNull(runningShoes.imageUrl),
    not(like(runningShoes.imageUrl, `${PUBLIC_PREFIX}%`)),
  ];
  const where =
    targetYear === 'all'
      ? and(...baseConditions)
      : and(eq(runningShoes.releaseYear, targetYear), ...baseConditions);

  const rows = await db
    .select({
      id: runningShoes.id,
      brand: runningShoes.brand,
      model: runningShoes.model,
      slug: runningShoes.slug,
      imageUrl: runningShoes.imageUrl,
    })
    .from(runningShoes)
    .where(where)
    .orderBy(runningShoes.brand, runningShoes.model);

  console.log(`Found ${rows.length} shoe(s) to mirror.\n`);

  let ok = 0;
  let failed: Array<{ name: string; reason: string }> = [];

  for (const shoe of rows) {
    const name = `${shoe.brand} ${shoe.model}`;
    if (!shoe.imageUrl || !shoe.slug) {
      failed.push({ name, reason: 'missing image_url or slug' });
      continue;
    }
    try {
      const dl = await downloadImage(shoe.imageUrl);
      const ext = extFromContentType(dl.contentType);
      const key = `${prefix ? prefix + '/' : ''}shoes/${shoe.slug}.${ext}`;
      const file = bucket.file(key);
      await file.save(dl.buffer, {
        contentType: dl.contentType,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=86400',
        },
      });
      const newUrl = `${PUBLIC_PREFIX}shoes/${shoe.slug}.${ext}`;
      await db
        .update(runningShoes)
        .set({ imageUrl: sql`${newUrl}` })
        .where(eq(runningShoes.id, shoe.id));
      console.log(`✓ ${name} → ${newUrl} (${(dl.buffer.byteLength / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${name} — ${reason}`);
      failed.push({ name, reason });
    }
  }

  // Refresh the committed source-of-truth JSON so cron / redeploy
  // reapplies the new internal URLs.
  const allMirrored = await db
    .select({
      brand: runningShoes.brand,
      model: runningShoes.model,
      imageUrl: runningShoes.imageUrl,
    })
    .from(runningShoes)
    .where(and(isNotNull(runningShoes.imageUrl), like(runningShoes.imageUrl, `${PUBLIC_PREFIX}%`)));

  const map: Record<string, string> = {};
  for (const r of allMirrored) {
    if (r.imageUrl) map[`${r.brand} ${r.model}`] = r.imageUrl;
  }
  fs.writeFileSync(JSON_MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log(`\nWrote ${Object.keys(map).length} entries to ${path.relative(process.cwd(), JSON_MAP_PATH)}`);

  console.log(`\nDone. Mirrored ${ok}, failed ${failed.length}.`);
  if (failed.length) {
    console.log('Failures:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.reason}`);
  }
}

mirror()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Mirror crashed:', err);
    process.exit(1);
  });
